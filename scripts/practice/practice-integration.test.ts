import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Pool } from "@neondatabase/serverless";
import { asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { config as loadDotEnv } from "dotenv";
import { resolve } from "node:path";
import { parseServerEnv } from "../../src/config/server-env-schema";
import {
  categoryAnswers,
  categoryChoices,
  categoryStatements,
  childProfiles,
  competencies,
  domains,
  indicators,
  practiceAnswers,
  practiceSessionItems,
  practiceSessions,
  questionOptions,
  questionTags,
  questions,
  subjects,
  tags,
  topics,
  users,
} from "../../src/db/schema";
import {
  abandonPracticeSession,
  getNextPracticeQuestion,
  getPracticeQuestion,
  getPracticeSession,
  startPracticeSession,
  submitPracticeAnswer,
} from "../../src/server/practice/service";
import {
  closePracticeDatabase,
  insertPracticeSessionAndItems,
  withPracticeTransaction,
} from "../../src/server/practice/repository";
import type {
  PracticeActor,
  PracticeResult,
} from "../../src/server/practice/domain";
import type {
  QuestionStatus,
  QuestionType,
  UsageType,
} from "../../src/server/questions/domain";

function createTestDatabase(pool: Pool) {
  return drizzle({ client: pool });
}

type TestDatabase = ReturnType<typeof createTestDatabase>;
type TestTransaction = Parameters<Parameters<TestDatabase["transaction"]>[0]>[0];

interface TopicFixture {
  id: string;
  subjectId: string;
  domainId: string;
}

interface QuestionFixture {
  id: string;
  label: string;
  subjectId: string;
  topicId: string;
  questionType: QuestionType;
  optionIds: readonly string[];
  categoryStatementIds: readonly string[];
  categoryChoiceIds: readonly string[];
}

interface QuestionFixtureInput {
  label: string;
  subjectId: string;
  domainId: string;
  topicId: string;
  competencyId: string;
  questionType?: QuestionType;
  status?: QuestionStatus;
  usageType?: UsageType;
  invalidExplanation?: boolean;
  categoryCodes?: readonly [string, string];
  createdBy: string;
}

function richText(text: string): object {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function expectSuccess<T>(result: PracticeResult<T>): T {
  if (!result.ok) {
    assert.fail("Expected success, received " + result.error.code + ": " + result.error.message);
  }
  return result.value;
}

function expectError<T>(result: PracticeResult<T>, expectedCode: string): void {
  if (result.ok) assert.fail("Expected error " + expectedCode + ", received success.");
  assert.equal(result.error.code, expectedCode);
}

function assertPreAnswerSafe(value: unknown): void {
  const forbidden = new Set([
    "iscorrect",
    "categoryanswers",
    "categorychoiceid",
    "explanationbodyjson",
    "sourcereference",
    "sourcetype",
    "createdby",
    "reviewedby",
    "verifiedby",
    "publishedat",
    "archivedat",
  ]);
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (current === null || typeof current !== "object") return;
    for (const [key, child] of Object.entries(current)) {
      assert.equal(forbidden.has(key.toLowerCase()), false, "unexpected private field: " + key);
      visit(child);
    }
  };
  visit(value);
}

async function createQuestionFixture(
  tx: TestTransaction,
  input: QuestionFixtureInput,
  runKey: string,
  createdAt: Date,
): Promise<QuestionFixture> {
  const id = randomUUID();
  const questionType = input.questionType ?? "SINGLE_CHOICE";
  const status = input.status ?? "PUBLISHED";
  const optionIds: string[] = [];
  const categoryStatementIds: string[] = [];
  const categoryChoiceIds: string[] = [];

  await tx.insert(questions).values({
    id,
    code: "M0D3B-" + runKey + "-" + input.label,
    subjectId: input.subjectId,
    domainId: input.domainId,
    topicId: input.topicId,
    primaryCompetencyId: input.competencyId,
    primaryIndicatorId: null,
    stimulusId: null,
    questionType,
    cognitiveLevel: "APPLY",
    difficulty: "MEDIUM",
    usageType: input.usageType ?? "PRACTICE",
    questionBodyJson: richText("Read the temporary fixture question " + input.label + "."),
    explanationBodyJson: input.invalidExplanation ? {} : richText("The answer follows from the question."),
    status,
    version: 1,
    sourceType: "ORIGINAL",
    sourceReference: null,
    createdBy: input.createdBy,
    reviewedBy: status === "DRAFT" ? null : input.createdBy,
    verifiedBy:
      status === "VERIFIED" || status === "PUBLISHED" || status === "ARCHIVED"
        ? input.createdBy
        : null,
    createdAt,
    updatedAt: createdAt,
    publishedAt: status === "PUBLISHED" ? createdAt : null,
    archivedAt: status === "ARCHIVED" ? createdAt : null,
  });

  if (questionType === "CATEGORY") {
    const statementOne = randomUUID();
    const statementTwo = randomUUID();
    const choiceOne = randomUUID();
    const choiceTwo = randomUUID();
    const [codeOne, codeTwo] = input.categoryCodes ?? ["TRUE", "FALSE"];
    categoryStatementIds.push(statementOne, statementTwo);
    categoryChoiceIds.push(choiceOne, choiceTwo);
    await tx.insert(categoryStatements).values([
      {
        id: statementOne,
        questionId: id,
        statementBodyJson: richText("Temporary statement one."),
        sortOrder: 10,
      },
      {
        id: statementTwo,
        questionId: id,
        statementBodyJson: richText("Temporary statement two."),
        sortOrder: 20,
      },
    ]);
    await tx.insert(categoryChoices).values([
      { id: choiceOne, questionId: id, code: codeOne, label: "Choice one", sortOrder: 10 },
      { id: choiceTwo, questionId: id, code: codeTwo, label: "Choice two", sortOrder: 20 },
    ]);
    await tx.insert(categoryAnswers).values([
      { statementId: statementOne, categoryChoiceId: choiceOne },
      { statementId: statementTwo, categoryChoiceId: choiceTwo },
    ]);
  } else {
    const definitions =
      questionType === "MULTI_SELECT"
        ? [
            { optionKey: "A", isCorrect: true, sortOrder: 10 },
            { optionKey: "B", isCorrect: true, sortOrder: 20 },
            { optionKey: "C", isCorrect: false, sortOrder: 30 },
          ]
        : [
            { optionKey: "A", isCorrect: true, sortOrder: 10 },
            { optionKey: "B", isCorrect: false, sortOrder: 20 },
          ];
    const optionRows = definitions.map((definition) => ({
      id: randomUUID(),
      questionId: id,
      optionKey: definition.optionKey,
      bodyJson: richText("Temporary option " + definition.optionKey + "."),
      isCorrect: definition.isCorrect,
      sortOrder: definition.sortOrder,
    }));
    optionIds.push(...optionRows.map((option) => option.id));
    await tx.insert(questionOptions).values(optionRows);
  }

  return {
    id,
    label: input.label,
    subjectId: input.subjectId,
    topicId: input.topicId,
    questionType,
    optionIds,
    categoryStatementIds,
    categoryChoiceIds,
  };
}

test("M0-D.3b Practice services against the verified Neon development database", async (t) => {
  loadDotEnv({
    path: resolve(process.cwd(), ".env.local"),
    override: false,
    quiet: true,
  });
  const { DATABASE_URL } = parseServerEnv(process.env);
  const connectionUrl = new URL(DATABASE_URL);
  const expectedDevelopmentHost =
    "ep-billowing-block-az2xv602-pooler.c-3.ap-southeast-1.aws.neon.tech";
  const databaseName = decodeURIComponent(connectionUrl.pathname.replace(/^\/+/, ""));
  assert.equal(connectionUrl.hostname.toLowerCase(), expectedDevelopmentHost);
  assert.equal(databaseName, "neondb");

  const pool = new Pool({ connectionString: DATABASE_URL, max: 8 });
  const db = createTestDatabase(pool);
  const runKey = randomUUID().replaceAll("-", "").slice(0, 12);
  const ownerId = randomUUID();
  const otherParentId = randomUUID();
  const ownerChildId = randomUUID();
  const otherChildId = randomUUID();
  const childIds = [ownerChildId, otherChildId];
  const questionIds: string[] = [];
  const sessionIds: string[] = [];
  const fixtures = new Map<string, QuestionFixture>();
  const actor: PracticeActor = { parentUserId: ownerId };
  const otherActor: PracticeActor = { parentUserId: otherParentId };
  let primarySubjectId = "";
  let primaryTopics: TopicFixture[] = [];
  let selectionTopic: TopicFixture;
  let exposureTopic: TopicFixture;
  let singleTopic: TopicFixture;
  let multiTopic: TopicFixture;
  let categoryTopic: TopicFixture;
  let primaryCompetencyId = "";
  let secondarySubjectId = "";
  let secondaryTopic: TopicFixture;
  let secondaryCompetencyId = "";
  let baselinePracticeCounts: readonly number[] | undefined;
  let baselineOtherCounts: readonly number[] | undefined;
  let baselineTaxonomyCounts: readonly number[] | undefined;
  let baselineLedger: readonly { id: number; hash: string }[] | undefined;

  async function practiceCounts(): Promise<readonly number[]> {
    const [sessions, items, answers] = await Promise.all([
      db.select({ id: practiceSessions.id }).from(practiceSessions),
      db.select({ id: practiceSessionItems.practiceSessionId }).from(practiceSessionItems),
      db.select({ id: practiceAnswers.id }).from(practiceAnswers),
    ]);
    return [sessions.length, items.length, answers.length];
  }

  async function otherCounts(): Promise<readonly number[]> {
    const [userRows, childRows, questionRows, optionRows, statementRows, choiceRows, answerRows, tagRows] =
      await Promise.all([
        db.select({ id: users.id }).from(users),
        db.select({ id: childProfiles.id }).from(childProfiles),
        db.select({ id: questionTags.questionId }).from(questionTags),
        db.select({ id: questionOptions.id }).from(questionOptions),
        db.select({ id: categoryStatements.id }).from(categoryStatements),
        db.select({ id: categoryChoices.id }).from(categoryChoices),
        db.select({ statementId: categoryAnswers.statementId }).from(categoryAnswers),
        db.select({ questionId: questions.id }).from(questions),
      ]);
    return [
      userRows.length,
      childRows.length,
      questionRows.length,
      optionRows.length,
      statementRows.length,
      choiceRows.length,
      answerRows.length,
      tagRows.length,
    ];
  }

  async function taxonomyCounts(): Promise<readonly number[]> {
    const [subjectRows, domainRows, topicRows, competencyRows, indicatorRows, tagRows] =
      await Promise.all([
        db.select({ id: subjects.id }).from(subjects),
        db.select({ id: domains.id }).from(domains),
        db.select({ id: topics.id }).from(topics),
        db.select({ id: competencies.id }).from(competencies),
        db.select({ id: indicators.id }).from(indicators),
        db.select({ id: tags.id }).from(tags),
      ]);
    return [
      subjectRows.length,
      domainRows.length,
      topicRows.length,
      competencyRows.length,
      indicatorRows.length,
      tagRows.length,
    ];
  }

  async function ledgerRows(): Promise<readonly { id: number; hash: string }[]> {
    const result = await pool.query<{ id: number; hash: string }>(
      "SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY created_at",
    );
    return result.rows;
  }

  async function cleanupFixtures(): Promise<void> {
    await db.transaction(async (tx) => {
      const testSessions = tx
        .select({ id: practiceSessions.id })
        .from(practiceSessions)
        .where(inArray(practiceSessions.childProfileId, childIds));
      await tx
        .delete(practiceAnswers)
        .where(inArray(practiceAnswers.practiceSessionId, testSessions));
      await tx
        .delete(practiceSessionItems)
        .where(inArray(practiceSessionItems.practiceSessionId, testSessions));
      await tx
        .delete(practiceSessions)
        .where(inArray(practiceSessions.childProfileId, childIds));

      if (questionIds.length > 0) {
        const testStatements = tx
          .select({ id: categoryStatements.id })
          .from(categoryStatements)
          .where(inArray(categoryStatements.questionId, questionIds));
        await tx
          .delete(categoryAnswers)
          .where(inArray(categoryAnswers.statementId, testStatements));
        await tx
          .delete(questionOptions)
          .where(inArray(questionOptions.questionId, questionIds));
        await tx
          .delete(categoryStatements)
          .where(inArray(categoryStatements.questionId, questionIds));
        await tx
          .delete(categoryChoices)
          .where(inArray(categoryChoices.questionId, questionIds));
        await tx.delete(questions).where(inArray(questions.id, questionIds));
      }
      await tx.delete(childProfiles).where(inArray(childProfiles.id, childIds));
      await tx.delete(users).where(inArray(users.id, [ownerId, otherParentId]));
    });
  }

  async function startForTopic(
    topic: TopicFixture,
    questionTarget: number,
    selectedActor: PracticeActor = actor,
    childProfileId = ownerChildId,
  ) {
    const result = await startPracticeSession(selectedActor, {
      childProfileId,
      subjectId: topic.subjectId,
      topicId: topic.id,
      questionTarget,
    });
    if (result.ok) sessionIds.push(result.value.session.id);
    return result;
  }

  async function assertSessionCounters(sessionId: string): Promise<void> {
    const [session] = await db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, sessionId))
      .limit(1);
    assert.ok(session);
    const answerRows = await db
      .select()
      .from(practiceAnswers)
      .where(eq(practiceAnswers.practiceSessionId, sessionId));
    assert.equal(session.questionsAnswered, answerRows.length);
    assert.equal(
      session.correctCount,
      answerRows.filter((answer) => answer.isCorrect).length,
    );
    assert.ok(0 <= session.correctCount);
    assert.ok(session.correctCount <= session.questionsAnswered);
    assert.ok(session.questionsAnswered <= session.questionTarget);
  }

  try {
    const connection = await pool.query<{ database_name: string }>(
      "SELECT current_database() AS database_name",
    );
    assert.equal(connection.rows[0]?.database_name, "neondb");

    baselinePracticeCounts = await practiceCounts();
    baselineOtherCounts = await otherCounts();
    baselineTaxonomyCounts = await taxonomyCounts();
    baselineLedger = await ledgerRows();
    assert.deepEqual(baselinePracticeCounts, [0, 0, 0]);
    assert.deepEqual(baselineOtherCounts, [0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(baselineTaxonomyCounts, [2, 4, 25, 8, 10, 0]);
    assert.deepEqual(baselineLedger.map((row) => row.id), [1, 2, 3, 4, 5, 6]);

    const allTopics = await db
      .select({
        id: topics.id,
        subjectId: domains.subjectId,
        domainId: topics.domainId,
      })
      .from(topics)
      .innerJoin(domains, eq(topics.domainId, domains.id))
      .orderBy(asc(topics.code));
    const topicGroups = new Map<string, TopicFixture[]>();
    for (const topic of allTopics) {
      const group = topicGroups.get(topic.subjectId) ?? [];
      group.push(topic);
      topicGroups.set(topic.subjectId, group);
    }
    const primaryGroup = [...topicGroups.entries()].find(([, rows]) => rows.length >= 5);
    assert.ok(primaryGroup, "development taxonomy needs five topics for scoped fixtures");
    primarySubjectId = primaryGroup[0];
    primaryTopics = primaryGroup[1];
    [selectionTopic, exposureTopic, singleTopic, multiTopic, categoryTopic] =
      primaryTopics.slice(0, 5);
    const otherSubjectEntry = [...topicGroups.entries()].find(([subjectId]) => subjectId !== primarySubjectId);
    assert.ok(otherSubjectEntry, "development taxonomy needs a second subject");
    secondarySubjectId = otherSubjectEntry[0];
    secondaryTopic = otherSubjectEntry[1][0]!;

    const [primaryCompetency] = await db
      .select({ id: competencies.id })
      .from(competencies)
      .where(eq(competencies.subjectId, primarySubjectId))
      .orderBy(asc(competencies.code))
      .limit(1);
    const [secondaryCompetency] = await db
      .select({ id: competencies.id })
      .from(competencies)
      .where(eq(competencies.subjectId, secondarySubjectId))
      .orderBy(asc(competencies.code))
      .limit(1);
    assert.ok(primaryCompetency);
    assert.ok(secondaryCompetency);
    primaryCompetencyId = primaryCompetency.id;
    secondaryCompetencyId = secondaryCompetency.id;

    const createdAt = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(users).values([
        {
          id: ownerId,
          authProviderUserId: "practice-test-owner-" + runKey,
          email: "practice-owner-" + runKey + "@example.invalid",
          displayName: "Temporary practice test parent",
          role: "PARENT",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: otherParentId,
          authProviderUserId: "practice-test-other-" + runKey,
          email: "practice-other-" + runKey + "@example.invalid",
          displayName: "Temporary other test parent",
          role: "PARENT",
          createdAt,
          updatedAt: createdAt,
        },
      ]);
      await tx.insert(childProfiles).values([
        {
          id: ownerChildId,
          parentUserId: ownerId,
          displayName: "Temporary practice child",
          grade: 4,
          status: "ACTIVE",
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: otherChildId,
          parentUserId: otherParentId,
          displayName: "Temporary other child",
          grade: 4,
          status: "ACTIVE",
          createdAt,
          updatedAt: createdAt,
        },
      ]);

      const inputs: Array<[string, QuestionFixtureInput]> = [
        ["selectionPractice", {
          label: "selection-practice",
          subjectId: primarySubjectId,
          domainId: selectionTopic.domainId,
          topicId: selectionTopic.id,
          competencyId: primaryCompetencyId,
          usageType: "PRACTICE",
          createdBy: ownerId,
        }],
        ["selectionBoth", {
          label: "selection-both",
          subjectId: primarySubjectId,
          domainId: selectionTopic.domainId,
          topicId: selectionTopic.id,
          competencyId: primaryCompetencyId,
          usageType: "BOTH",
          createdBy: ownerId,
        }],
        ["selectionAssessment", {
          label: "selection-assessment",
          subjectId: primarySubjectId,
          domainId: selectionTopic.domainId,
          topicId: selectionTopic.id,
          competencyId: primaryCompetencyId,
          usageType: "ASSESSMENT",
          createdBy: ownerId,
        }],
        ["selectionDraft", {
          label: "selection-draft",
          subjectId: primarySubjectId,
          domainId: selectionTopic.domainId,
          topicId: selectionTopic.id,
          competencyId: primaryCompetencyId,
          status: "DRAFT",
          createdBy: ownerId,
        }],
        ["selectionReview", {
          label: "selection-in-review",
          subjectId: primarySubjectId,
          domainId: selectionTopic.domainId,
          topicId: selectionTopic.id,
          competencyId: primaryCompetencyId,
          status: "IN_REVIEW",
          createdBy: ownerId,
        }],
        ["selectionVerified", {
          label: "selection-verified",
          subjectId: primarySubjectId,
          domainId: selectionTopic.domainId,
          topicId: selectionTopic.id,
          competencyId: primaryCompetencyId,
          status: "VERIFIED",
          createdBy: ownerId,
        }],
        ["selectionArchived", {
          label: "selection-archived",
          subjectId: primarySubjectId,
          domainId: selectionTopic.domainId,
          topicId: selectionTopic.id,
          competencyId: primaryCompetencyId,
          status: "ARCHIVED",
          createdBy: ownerId,
        }],
        ["selectionInvalid", {
          label: "selection-invalid-publish-readiness",
          subjectId: primarySubjectId,
          domainId: selectionTopic.domainId,
          topicId: selectionTopic.id,
          competencyId: primaryCompetencyId,
          invalidExplanation: true,
          createdBy: ownerId,
        }],
        ["topicMismatch", {
          label: "topic-mismatch",
          subjectId: primarySubjectId,
          domainId: exposureTopic.domainId,
          topicId: exposureTopic.id,
          competencyId: primaryCompetencyId,
          createdBy: ownerId,
        }],
        ["subjectMismatch", {
          label: "subject-mismatch",
          subjectId: secondarySubjectId,
          domainId: secondaryTopic.domainId,
          topicId: secondaryTopic.id,
          competencyId: secondaryCompetencyId,
          createdBy: ownerId,
        }],
        ["exposureLess", {
          label: "exposure-less",
          subjectId: primarySubjectId,
          domainId: exposureTopic.domainId,
          topicId: exposureTopic.id,
          competencyId: primaryCompetencyId,
          createdBy: ownerId,
        }],
        ["exposureMore", {
          label: "exposure-more",
          subjectId: primarySubjectId,
          domainId: exposureTopic.domainId,
          topicId: exposureTopic.id,
          competencyId: primaryCompetencyId,
          createdBy: ownerId,
        }],
        ["single", {
          label: "single",
          subjectId: primarySubjectId,
          domainId: singleTopic.domainId,
          topicId: singleTopic.id,
          competencyId: primaryCompetencyId,
          createdBy: ownerId,
        }],
        ["multi", {
          label: "multi",
          subjectId: primarySubjectId,
          domainId: multiTopic.domainId,
          topicId: multiTopic.id,
          competencyId: primaryCompetencyId,
          questionType: "MULTI_SELECT",
          createdBy: ownerId,
        }],
        ["category", {
          label: "category",
          subjectId: primarySubjectId,
          domainId: categoryTopic.domainId,
          topicId: categoryTopic.id,
          competencyId: primaryCompetencyId,
          questionType: "CATEGORY",
          createdBy: ownerId,
        }],
      ];
      for (const [key, input] of inputs) {
        const fixture = await createQuestionFixture(tx, input, runKey, createdAt);
        fixtures.set(key, fixture);
        questionIds.push(fixture.id);
      }

      async function addHistoricalAnswers(
        childProfileId: string,
        fixture: QuestionFixture,
        numberOfAnswers: number,
      ): Promise<void> {
        for (let index = 0; index < numberOfAnswers; index += 1) {
          const sessionId = randomUUID();
          sessionIds.push(sessionId);
          await tx.insert(practiceSessions).values({
            id: sessionId,
            childProfileId,
            subjectId: fixture.subjectId,
            topicId: fixture.topicId,
            status: "COMPLETED",
            questionTarget: 1,
            questionsAnswered: 1,
            correctCount: 0,
            startedAt: createdAt,
            completedAt: createdAt,
            lastActivityAt: createdAt,
          });
          await tx.insert(practiceSessionItems).values({
            practiceSessionId: sessionId,
            questionId: fixture.id,
            position: 1,
          });
          await tx.insert(practiceAnswers).values({
            id: randomUUID(),
            practiceSessionId: sessionId,
            questionId: fixture.id,
            responseJson: { type: "SINGLE_CHOICE", optionKey: "B" },
            isCorrect: false,
            scoreFraction: "0",
            answeredAt: createdAt,
            responseTimeMs: null,
          });
        }
      }

      await addHistoricalAnswers(ownerChildId, fixtures.get("topicMismatch")!, 2);
      await addHistoricalAnswers(ownerChildId, fixtures.get("exposureMore")!, 3);
      await addHistoricalAnswers(otherChildId, fixtures.get("exposureLess")!, 4);
    });

    await t.test("selection, ownership, snapshot navigation, and student-safe fetch", async () => {
      const started = expectSuccess(await startForTopic(selectionTopic, 2));
      assert.equal(started.session.status, "ACTIVE");
      assert.equal(started.session.questionsAnswered, 0);
      assert.equal(started.session.correctCount, 0);
      assert.equal(started.items.length, 2);
      assert.deepEqual(
        new Set(started.items.map((item) => item.questionId)),
        new Set([fixtures.get("selectionPractice")!.id, fixtures.get("selectionBoth")!.id]),
      );
      const persistedItems = await db
        .select()
        .from(practiceSessionItems)
        .where(eq(practiceSessionItems.practiceSessionId, started.session.id))
        .orderBy(asc(practiceSessionItems.position));
      assert.deepEqual(
        persistedItems.map((item) => ({ questionId: item.questionId, position: item.position })),
        started.items.map(({ questionId, position }) => ({ questionId, position })),
      );
      assert.deepEqual(persistedItems.map((item) => item.position), [1, 2]);

      const ownerSession = expectSuccess(await getPracticeSession(actor, started.session.id));
      assert.equal(ownerSession.items.length, 2);
      expectError(
        await getPracticeSession(otherActor, started.session.id),
        "NOT_FOUND_OR_FORBIDDEN",
      );
      expectError(
        await startPracticeSession(otherActor, {
          childProfileId: ownerChildId,
          subjectId: primarySubjectId,
          topicId: selectionTopic.id,
          questionTarget: 1,
        }),
        "NOT_FOUND_OR_FORBIDDEN",
      );

      const questionOutsideSnapshot = fixtures.get("exposureLess")!;
      expectError(
        await getPracticeQuestion(actor, started.session.id, questionOutsideSnapshot.id),
        "QUESTION_NOT_IN_SNAPSHOT",
      );
      const unchanged = await db
        .select()
        .from(practiceAnswers)
        .where(eq(practiceAnswers.practiceSessionId, started.session.id));
      assert.equal(unchanged.length, 0);
      expectError(
        await submitPracticeAnswer(
          actor,
          started.session.id,
          questionOutsideSnapshot.id,
          { type: "SINGLE_CHOICE", optionKey: "A" },
        ),
        "QUESTION_NOT_IN_SNAPSHOT",
      );
      assert.equal(
        (await db
          .select()
          .from(practiceAnswers)
          .where(eq(practiceAnswers.practiceSessionId, started.session.id))).length,
        0,
      );
      expectError(
        await submitPracticeAnswer(
          otherActor,
          started.session.id,
          started.items[0]!.questionId,
          { type: "SINGLE_CHOICE", optionKey: "A" },
        ),
        "NOT_FOUND_OR_FORBIDDEN",
      );
      expectError(
        await abandonPracticeSession(otherActor, started.session.id),
        "NOT_FOUND_OR_FORBIDDEN",
      );
      await assertSessionCounters(started.session.id);

      const firstQuestion = expectSuccess(await getNextPracticeQuestion(actor, started.session.id));
      assert.equal(firstQuestion.item.position, 1);
      assertPreAnswerSafe(firstQuestion.question);
      assert.equal("isCorrect" in firstQuestion.question, false);
      assert.equal("categoryChoices" in firstQuestion.question, false);
      const secondItem = started.items.find((item) => item.position === 2)!;
      const explicitlyFetched = expectSuccess(
        await getPracticeQuestion(actor, started.session.id, secondItem.questionId),
      );
      assert.equal(explicitlyFetched.item.position, 2);
      assertPreAnswerSafe(explicitlyFetched.question);

      const secondAnswer = expectSuccess(
        await submitPracticeAnswer(
          actor,
          started.session.id,
          secondItem.questionId,
          { type: "SINGLE_CHOICE", optionKey: "A" },
          120,
        ),
      );
      assert.equal(secondAnswer.feedback.isCorrect, true);
      assert.equal(secondAnswer.session.status, "ACTIVE");
      await assertSessionCounters(started.session.id);

      const next = expectSuccess(await getNextPracticeQuestion(actor, started.session.id));
      assert.equal(next.item.position, 1);
      const firstItem = started.items.find((item) => item.position === 1)!;
      const finalAnswer = expectSuccess(
        await submitPracticeAnswer(
          actor,
          started.session.id,
          firstItem.questionId,
          { type: "SINGLE_CHOICE", optionKey: "B" },
        ),
      );
      assert.equal(finalAnswer.feedback.isCorrect, false);
      assert.equal(finalAnswer.session.status, "COMPLETED");
      assert.ok(finalAnswer.session.completedAt instanceof Date);
      assert.equal(finalAnswer.session.questionsAnswered, 2);
      assert.equal(finalAnswer.session.correctCount, 1);
      await assertSessionCounters(started.session.id);

      const retry = expectSuccess(
        await submitPracticeAnswer(
          actor,
          started.session.id,
          firstItem.questionId,
          { type: "SINGLE_CHOICE", optionKey: "B" },
        ),
      );
      assert.equal(retry.idempotentRetry, true);
      assert.equal(retry.feedback.isCorrect, false);
      expectError(
        await submitPracticeAnswer(
          actor,
          started.session.id,
          firstItem.questionId,
          { type: "SINGLE_CHOICE", optionKey: "A" },
        ),
        "ANSWER_CONFLICT",
      );
      expectError(
        await getNextPracticeQuestion(actor, started.session.id),
        "SESSION_NOT_ACTIVE",
      );
      await assertSessionCounters(started.session.id);
    });

    await t.test("eligibility, exposure priority, insufficient candidates, and atomic creation", async () => {
      const exposure = expectSuccess(await startForTopic(exposureTopic, 3));
      const byQuestion = new Map(exposure.items.map((item) => [item.questionId, item.position]));
      assert.equal(exposure.items.length, 3);
      assert.equal(byQuestion.get(fixtures.get("exposureLess")!.id), 1);
      assert.equal(byQuestion.get(fixtures.get("topicMismatch")!.id), 2);
      assert.equal(byQuestion.get(fixtures.get("exposureMore")!.id), 3);
      assert.deepEqual(exposure.items.map((item) => item.position), [1, 2, 3]);

      const sessionsBeforeInsufficient = await practiceCounts();
      expectError(await startForTopic(selectionTopic, 3), "INSUFFICIENT_QUESTIONS");
      assert.deepEqual(await practiceCounts(), sessionsBeforeInsufficient);

      const failedSessionId = randomUUID();
      const missingQuestionId = "00000000-0000-4000-8000-000000000000";
      await assert.rejects(
        withPracticeTransaction((tx) =>
          insertPracticeSessionAndItems(
            tx,
            {
              id: failedSessionId,
              childProfileId: ownerChildId,
              subjectId: primarySubjectId,
              topicId: selectionTopic.id,
              status: "ACTIVE",
              questionTarget: 1,
              questionsAnswered: 0,
              correctCount: 0,
              startedAt: new Date(),
              completedAt: null,
              lastActivityAt: new Date(),
            },
            [{
              practiceSessionId: failedSessionId,
              questionId: missingQuestionId,
              position: 1,
            }],
          ),
        ),
      );
      const failedSessionRows = await db
        .select()
        .from(practiceSessions)
        .where(eq(practiceSessions.id, failedSessionId));
      const failedItemRows = await db
        .select()
        .from(practiceSessionItems)
        .where(eq(practiceSessionItems.practiceSessionId, failedSessionId));
      assert.equal(failedSessionRows.length, 0);
      assert.equal(failedItemRows.length, 0);
    });

    await t.test("single and multi-select evaluation, canonical persistence, and retry policy", async () => {
      const wrongSingleSession = expectSuccess(await startForTopic(singleTopic, 1));
      const wrongSingle = expectSuccess(
        await submitPracticeAnswer(
          actor,
          wrongSingleSession.session.id,
          fixtures.get("single")!.id,
          { type: "SINGLE_CHOICE", optionKey: "B" },
          500,
        ),
      );
      assert.equal(wrongSingle.feedback.isCorrect, false);
      assert.equal(wrongSingle.feedback.scoreFraction, 0);
      assert.deepEqual(wrongSingle.feedback.correctAnswer, {
        type: "SINGLE_CHOICE",
        optionKey: "A",
      });
      await assertSessionCounters(wrongSingleSession.session.id);

      const correctSingleSession = expectSuccess(await startForTopic(singleTopic, 1));
      const correctSingle = expectSuccess(
        await submitPracticeAnswer(
          actor,
          correctSingleSession.session.id,
          fixtures.get("single")!.id,
          { type: "SINGLE_CHOICE", optionKey: "A" },
        ),
      );
      assert.equal(correctSingle.feedback.isCorrect, true);
      assert.equal(correctSingle.feedback.scoreFraction, 1);
      assert.equal(correctSingle.session.correctCount, 1);
      await assertSessionCounters(correctSingleSession.session.id);

      const invalidTimingSession = expectSuccess(await startForTopic(singleTopic, 1));
      expectError(
        await submitPracticeAnswer(
          actor,
          invalidTimingSession.session.id,
          fixtures.get("single")!.id,
          { type: "SINGLE_CHOICE", optionKey: "A" },
          -1,
        ),
        "INVALID_INPUT",
      );
      assert.equal(
        (await db
          .select()
          .from(practiceAnswers)
          .where(eq(practiceAnswers.practiceSessionId, invalidTimingSession.session.id))).length,
        0,
      );
      await assertSessionCounters(invalidTimingSession.session.id);

      const correctMultiSession = expectSuccess(await startForTopic(multiTopic, 1));
      const correctMulti = expectSuccess(
        await submitPracticeAnswer(
          actor,
          correctMultiSession.session.id,
          fixtures.get("multi")!.id,
          { type: "MULTI_SELECT", optionKeys: ["B", "A"] },
        ),
      );
      assert.equal(correctMulti.feedback.isCorrect, true);
      assert.equal(correctMulti.feedback.scoreFraction, 1);
      assert.deepEqual(correctMulti.feedback.selectedResponse, {
        type: "MULTI_SELECT",
        optionKeys: ["A", "B"],
      });
      const multiAnswerRows = await db
        .select()
        .from(practiceAnswers)
        .where(eq(practiceAnswers.practiceSessionId, correctMultiSession.session.id));
      assert.deepEqual(multiAnswerRows[0]?.responseJson, {
        type: "MULTI_SELECT",
        optionKeys: ["A", "B"],
      });
      const reorderedRetry = expectSuccess(
        await submitPracticeAnswer(
          actor,
          correctMultiSession.session.id,
          fixtures.get("multi")!.id,
          { type: "MULTI_SELECT", optionKeys: ["A", "B"] },
        ),
      );
      assert.equal(reorderedRetry.idempotentRetry, true);
      expectError(
        await submitPracticeAnswer(
          actor,
          correctMultiSession.session.id,
          fixtures.get("multi")!.id,
          { type: "MULTI_SELECT", optionKeys: ["A", "C"] },
        ),
        "ANSWER_CONFLICT",
      );
      await assertSessionCounters(correctMultiSession.session.id);

      for (const [label, optionKeys] of [
        ["missing", ["A"]],
        ["extra", ["A", "B", "C"]],
      ] as const) {
        const session = expectSuccess(await startForTopic(multiTopic, 1));
        const answer = expectSuccess(
          await submitPracticeAnswer(
            actor,
            session.session.id,
            fixtures.get("multi")!.id,
            { type: "MULTI_SELECT", optionKeys },
          ),
        );
        assert.equal(answer.feedback.isCorrect, false, label);
        assert.equal(answer.feedback.scoreFraction, 0, label);
        assert.equal(answer.session.correctCount, 0, label);
        await assertSessionCounters(session.session.id);
      }
    });

    await t.test("CATEGORY uses choice codes at service boundary and returns code-only feedback", async () => {
      const categorySession = expectSuccess(await startForTopic(categoryTopic, 1));
      const categoryQuestion = expectSuccess(
        await getPracticeQuestion(actor, categorySession.session.id),
      );
      assertPreAnswerSafe(categoryQuestion.question);
      assert.deepEqual(
        categoryQuestion.question.categoryChoices?.map((choice) => choice.code),
        ["TRUE", "FALSE"],
      );

      expectError(
        await submitPracticeAnswer(
          actor,
          categorySession.session.id,
          fixtures.get("category")!.id,
          {
            type: "CATEGORY",
            selections: [{ statementId: fixtures.get("category")!.categoryStatementIds[0]!, categoryChoiceCode: "NOT_A_CHOICE" }],
          },
        ),
        "CATEGORY_CHOICE_UNKNOWN",
      );
      assert.equal(
        (await db
          .select()
          .from(practiceAnswers)
          .where(eq(practiceAnswers.practiceSessionId, categorySession.session.id))).length,
        0,
      );

      const category = fixtures.get("category")!;
      const fullScore = expectSuccess(
        await submitPracticeAnswer(actor, categorySession.session.id, category.id, {
          type: "CATEGORY",
          selections: [
            { statementId: category.categoryStatementIds[1]!, categoryChoiceCode: "FALSE" },
            { statementId: category.categoryStatementIds[0]!, categoryChoiceCode: "TRUE" },
          ],
        }),
      );
      assert.equal(fullScore.feedback.isCorrect, true);
      assert.equal(fullScore.feedback.scoreFraction, 1);
      assert.deepEqual(fullScore.feedback.correctAnswer, {
        type: "CATEGORY",
        selections: [
          { statementId: category.categoryStatementIds[0], categoryChoiceCode: "TRUE" },
          { statementId: category.categoryStatementIds[1], categoryChoiceCode: "FALSE" },
        ],
      });
      assert.equal(JSON.stringify(fullScore.feedback).includes(category.categoryChoiceIds[0]!), false);
      assert.equal(JSON.stringify(fullScore.feedback).includes(category.categoryChoiceIds[1]!), false);
      const storedCategoryAnswer = await db
        .select()
        .from(practiceAnswers)
        .where(eq(practiceAnswers.practiceSessionId, categorySession.session.id));
      assert.deepEqual(storedCategoryAnswer[0]?.responseJson, {
        type: "CATEGORY",
        selections: [
          {
            statementId: category.categoryStatementIds[0],
            categoryChoiceId: category.categoryChoiceIds[0],
          },
          {
            statementId: category.categoryStatementIds[1],
            categoryChoiceId: category.categoryChoiceIds[1],
          },
        ],
      });
      await assertSessionCounters(categorySession.session.id);

      const partialSession = expectSuccess(await startForTopic(categoryTopic, 1));
      const partial = expectSuccess(
        await submitPracticeAnswer(actor, partialSession.session.id, category.id, {
          type: "CATEGORY",
          selections: [
            { statementId: category.categoryStatementIds[0]!, categoryChoiceCode: "FALSE" },
            { statementId: category.categoryStatementIds[1]!, categoryChoiceCode: "FALSE" },
          ],
        }),
      );
      assert.equal(partial.feedback.isCorrect, false);
      assert.equal(partial.feedback.scoreFraction, 0.5);
      assert.equal(partial.session.correctCount, 0);
      await assertSessionCounters(partialSession.session.id);
    });

    await t.test("same-answer and conflicting concurrent submissions serialize to one answer", async () => {
      const sameAnswerSession = expectSuccess(await startForTopic(singleTopic, 1));
      const sameAnswerResults = await Promise.all([
        submitPracticeAnswer(
          actor,
          sameAnswerSession.session.id,
          fixtures.get("single")!.id,
          { type: "SINGLE_CHOICE", optionKey: "A" },
          80,
        ),
        submitPracticeAnswer(
          actor,
          sameAnswerSession.session.id,
          fixtures.get("single")!.id,
          { type: "SINGLE_CHOICE", optionKey: "A" },
          80,
        ),
      ]);
      const sameAnswerSuccesses = sameAnswerResults.map((result) => expectSuccess(result));
      assert.deepEqual(
        sameAnswerSuccesses.map((result) => result.idempotentRetry).sort(),
        [false, true],
      );
      const sameRows = await db
        .select()
        .from(practiceAnswers)
        .where(eq(practiceAnswers.practiceSessionId, sameAnswerSession.session.id));
      assert.equal(sameRows.length, 1);
      await assertSessionCounters(sameAnswerSession.session.id);

      const conflictSession = expectSuccess(await startForTopic(singleTopic, 1));
      const conflictResults = await Promise.all([
        submitPracticeAnswer(
          actor,
          conflictSession.session.id,
          fixtures.get("single")!.id,
          { type: "SINGLE_CHOICE", optionKey: "A" },
        ),
        submitPracticeAnswer(
          actor,
          conflictSession.session.id,
          fixtures.get("single")!.id,
          { type: "SINGLE_CHOICE", optionKey: "B" },
        ),
      ]);
      const conflictSuccesses = conflictResults.filter((result) => result.ok);
      const conflictErrors = conflictResults.filter((result) => !result.ok);
      assert.equal(conflictSuccesses.length, 1);
      assert.equal(conflictErrors.length, 1);
      if (!conflictErrors[0]!.ok) assert.equal(conflictErrors[0]!.error.code, "ANSWER_CONFLICT");
      const conflictRows = await db
        .select()
        .from(practiceAnswers)
        .where(eq(practiceAnswers.practiceSessionId, conflictSession.session.id));
      assert.equal(conflictRows.length, 1);
      assert.ok(
        JSON.stringify(conflictRows[0]!.responseJson) ===
          JSON.stringify({ type: "SINGLE_CHOICE", optionKey: "A" }) ||
          JSON.stringify(conflictRows[0]!.responseJson) ===
          JSON.stringify({ type: "SINGLE_CHOICE", optionKey: "B" }),
      );
      await assertSessionCounters(conflictSession.session.id);
    });

    await t.test("abandon is terminal, owner-checked, and leaves completedAt null", async () => {
      const active = expectSuccess(await startForTopic(singleTopic, 1));
      const abandoned = expectSuccess(
        await abandonPracticeSession(actor, active.session.id),
      );
      assert.equal(abandoned.status, "ABANDONED");
      assert.equal(abandoned.completedAt, null);
      expectError(
        await abandonPracticeSession(actor, active.session.id),
        "SESSION_NOT_ACTIVE",
      );
      expectError(
        await submitPracticeAnswer(
          actor,
          active.session.id,
          fixtures.get("single")!.id,
          { type: "SINGLE_CHOICE", optionKey: "A" },
        ),
        "SESSION_NOT_ACTIVE",
      );
      await assertSessionCounters(active.session.id);

      const partiallyAnswered = expectSuccess(await startForTopic(selectionTopic, 2));
      const answeredQuestionId = partiallyAnswered.items[0]!.questionId;
      expectSuccess(
        await submitPracticeAnswer(
          actor,
          partiallyAnswered.session.id,
          answeredQuestionId,
          { type: "SINGLE_CHOICE", optionKey: "A" },
        ),
      );
      expectSuccess(await abandonPracticeSession(actor, partiallyAnswered.session.id));
      expectError(
        await submitPracticeAnswer(
          actor,
          partiallyAnswered.session.id,
          answeredQuestionId,
          { type: "SINGLE_CHOICE", optionKey: "A" },
        ),
        "SESSION_NOT_ACTIVE",
      );
      await assertSessionCounters(partiallyAnswered.session.id);
    });

    await t.test("archived child profiles and malformed UUIDs fail safely", async () => {
      const active = expectSuccess(await startForTopic(singleTopic, 1));
      await db
        .update(childProfiles)
        .set({ status: "ARCHIVED" })
        .where(eq(childProfiles.id, ownerChildId));
      try {
        expectError(
          await startPracticeSession(actor, {
            childProfileId: ownerChildId,
            subjectId: primarySubjectId,
            topicId: singleTopic.id,
            questionTarget: 1,
          }),
          "NOT_FOUND_OR_FORBIDDEN",
        );
        expectError(await getPracticeSession(actor, active.session.id), "NOT_FOUND_OR_FORBIDDEN");
        expectError(
          await getPracticeQuestion(actor, active.session.id),
          "NOT_FOUND_OR_FORBIDDEN",
        );
        expectError(
          await submitPracticeAnswer(
            actor,
            active.session.id,
            fixtures.get("single")!.id,
            { type: "SINGLE_CHOICE", optionKey: "A" },
          ),
          "NOT_FOUND_OR_FORBIDDEN",
        );
        expectError(
          await abandonPracticeSession(actor, active.session.id),
          "NOT_FOUND_OR_FORBIDDEN",
        );
      } finally {
        await db
          .update(childProfiles)
          .set({ status: "ACTIVE" })
          .where(eq(childProfiles.id, ownerChildId));
      }
      expectError(await getPracticeSession(actor, "not-a-uuid"), "INVALID_INPUT");
      expectError(
        await getPracticeSession({ parentUserId: "not-a-uuid" }, active.session.id),
        "INVALID_INPUT",
      );
    });
  } finally {
    try {
      await closePracticeDatabase();
      if (baselinePracticeCounts && baselineOtherCounts && baselineTaxonomyCounts && baselineLedger) {
        await cleanupFixtures();
        assert.deepEqual(await practiceCounts(), baselinePracticeCounts);
        assert.deepEqual(await otherCounts(), baselineOtherCounts);
        assert.deepEqual(await taxonomyCounts(), baselineTaxonomyCounts);
        assert.deepEqual(await ledgerRows(), baselineLedger);
      }
    } finally {
      await pool.end();
    }
  }
});
