import "server-only";

import { Pool } from "@neondatabase/serverless";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { getDatabaseUrl } from "../../config/server-env";
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
  questions,
  stimuli,
  subjects,
  topics,
} from "../../db/schema";
import type { QuestionAggregate, QuestionRecord } from "../questions/domain";

function createPracticeDatabase(pool: Pool) {
  return drizzle({ client: pool });
}

type PracticeDatabase = ReturnType<typeof createPracticeDatabase>;
export type PracticeTransaction = Parameters<
  Parameters<PracticeDatabase["transaction"]>[0]
>[0];
export type PracticeSessionRow = typeof practiceSessions.$inferSelect;
export type PracticeAnswerRow = typeof practiceAnswers.$inferSelect;
export type PracticeSessionInsert = typeof practiceSessions.$inferInsert;
export type PracticeAnswerInsert = typeof practiceAnswers.$inferInsert;

export interface PracticeCandidateRow {
  questionId: string;
  status: QuestionRecord["status"];
  usageType: QuestionRecord["usageType"];
  subjectId: string;
  topicId: string;
  exposureCount: number;
  aggregate: QuestionAggregate;
}

export interface PracticeSnapshotItemWithAnswer {
  questionId: string;
  position: number;
  answer: PracticeAnswerRow | null;
}

export interface PracticeSnapshotInsert {
  practiceSessionId: string;
  questionId: string;
  position: number;
}

let pool: Pool | undefined;
let database: PracticeDatabase | undefined;

export function getPracticeDatabase(): PracticeDatabase {
  pool ??= new Pool({ connectionString: getDatabaseUrl(), max: 10 });
  database ??= createPracticeDatabase(pool);
  return database;
}

export async function closePracticeDatabase(): Promise<void> {
  const activePool = pool;
  pool = undefined;
  database = undefined;
  await activePool?.end();
}

export async function withPracticeTransaction<T>(
  operation: (tx: PracticeTransaction) => Promise<T>,
): Promise<T> {
  return getPracticeDatabase().transaction(operation);
}

export async function isChildOwnedByParent(
  tx: PracticeTransaction,
  parentUserId: string,
  childProfileId: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(
      and(
        eq(childProfiles.id, childProfileId),
        eq(childProfiles.parentUserId, parentUserId),
        eq(childProfiles.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return rows.length === 1;
}

export async function lockOwnedChild(
  tx: PracticeTransaction,
  parentUserId: string,
  childProfileId: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: childProfiles.id })
    .from(childProfiles)
    .where(
      and(
        eq(childProfiles.id, childProfileId),
        eq(childProfiles.parentUserId, parentUserId),
        eq(childProfiles.status, "ACTIVE"),
      ),
    )
    .for("share")
    .limit(1);
  return rows.length === 1;
}

export async function topicBelongsToSubject(
  tx: PracticeTransaction,
  topicId: string,
  subjectId: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: topics.id })
    .from(topics)
    .innerJoin(domains, eq(topics.domainId, domains.id))
    .where(and(eq(topics.id, topicId), eq(domains.subjectId, subjectId)))
    .limit(1);
  return rows.length === 1;
}

function groupByQuestionId<T extends { questionId: string }>(
  rows: readonly T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const group = grouped.get(row.questionId);
    if (group) group.push(row);
    else grouped.set(row.questionId, [row]);
  }
  return grouped;
}

export async function loadQuestionAggregates(
  tx: PracticeTransaction,
  questionIds: readonly string[],
): Promise<readonly QuestionAggregate[]> {
  if (questionIds.length === 0) return [];

  const baseRows = await tx
    .select({
      question: questions,
      subjectId: subjects.id,
      domainId: domains.id,
      domainSubjectId: domains.subjectId,
      topicId: topics.id,
      topicDomainId: topics.domainId,
      competencyId: competencies.id,
      competencySubjectId: competencies.subjectId,
      indicatorId: indicators.id,
      indicatorSubjectId: indicators.subjectId,
      indicatorCompetencyId: indicators.competencyId,
      indicatorTopicId: indicators.topicId,
      stimulusId: stimuli.id,
      stimulusSubjectId: stimuli.subjectId,
      stimulusTitle: stimuli.title,
      stimulusType: stimuli.stimulusType,
      stimulusBodyJson: stimuli.bodyJson,
    })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .innerJoin(domains, eq(questions.domainId, domains.id))
    .innerJoin(topics, eq(questions.topicId, topics.id))
    .innerJoin(competencies, eq(questions.primaryCompetencyId, competencies.id))
    .leftJoin(indicators, eq(questions.primaryIndicatorId, indicators.id))
    .leftJoin(stimuli, eq(questions.stimulusId, stimuli.id))
    .where(inArray(questions.id, [...questionIds]));

  const options = await tx
    .select()
    .from(questionOptions)
    .where(inArray(questionOptions.questionId, [...questionIds]))
    .orderBy(asc(questionOptions.questionId), asc(questionOptions.sortOrder), asc(questionOptions.optionKey));
  const statements = await tx
    .select()
    .from(categoryStatements)
    .where(inArray(categoryStatements.questionId, [...questionIds]))
    .orderBy(asc(categoryStatements.questionId), asc(categoryStatements.sortOrder), asc(categoryStatements.id));
  const choices = await tx
    .select()
    .from(categoryChoices)
    .where(inArray(categoryChoices.questionId, [...questionIds]))
    .orderBy(asc(categoryChoices.questionId), asc(categoryChoices.sortOrder), asc(categoryChoices.code));
  const answerRows = await tx
    .select({
      questionId: categoryStatements.questionId,
      statementId: categoryAnswers.statementId,
      categoryChoiceId: categoryAnswers.categoryChoiceId,
    })
    .from(categoryAnswers)
    .innerJoin(categoryStatements, eq(categoryAnswers.statementId, categoryStatements.id))
    .where(inArray(categoryStatements.questionId, [...questionIds]))
    .orderBy(asc(categoryStatements.questionId), asc(categoryAnswers.statementId), asc(categoryAnswers.categoryChoiceId));

  const optionsByQuestion = groupByQuestionId(options);
  const statementsByQuestion = groupByQuestionId(statements);
  const choicesByQuestion = groupByQuestionId(choices);
  const answersByQuestion = groupByQuestionId(answerRows);

  return baseRows.map((row) => {
    const question = row.question as QuestionRecord;
    return {
      question,
      options: optionsByQuestion.get(question.id) ?? [],
      categoryStatements: statementsByQuestion.get(question.id) ?? [],
      categoryChoices: choicesByQuestion.get(question.id) ?? [],
      categoryAnswers: (answersByQuestion.get(question.id) ?? []).map((answer) => ({
        statementId: answer.statementId,
        categoryChoiceId: answer.categoryChoiceId,
      })),
      taxonomy: {
        subject: { id: row.subjectId },
        domain: { id: row.domainId, subjectId: row.domainSubjectId },
        topic: { id: row.topicId, domainId: row.topicDomainId },
        primaryCompetency: {
          id: row.competencyId,
          subjectId: row.competencySubjectId,
        },
        primaryIndicator:
          row.indicatorId === null
            ? null
            : {
                id: row.indicatorId,
                subjectId: row.indicatorSubjectId!,
                competencyId: row.indicatorCompetencyId!,
                topicId: row.indicatorTopicId,
              },
      },
      stimulus:
        row.stimulusId === null
          ? null
          : {
              id: row.stimulusId,
              subjectId: row.stimulusSubjectId!,
              title: row.stimulusTitle,
              stimulusType: row.stimulusType!,
              bodyJson: row.stimulusBodyJson,
            },
    };
  });
}

export async function listPracticeCandidates(
  tx: PracticeTransaction,
  childProfileId: string,
  subjectId: string,
  topicId?: string,
): Promise<readonly PracticeCandidateRow[]> {
  const exposureByQuestion = tx
    .select({
      questionId: practiceAnswers.questionId,
      exposureCount: sql<number>`count(*)::int`.as("exposure_count"),
    })
    .from(practiceAnswers)
    .innerJoin(
      practiceSessions,
      eq(practiceAnswers.practiceSessionId, practiceSessions.id),
    )
    .where(eq(practiceSessions.childProfileId, childProfileId))
    .groupBy(practiceAnswers.questionId)
    .as("practice_exposure_by_question");

  const eligibility = [
    eq(questions.status, "PUBLISHED"),
    inArray(questions.usageType, ["PRACTICE", "BOTH"]),
    eq(questions.subjectId, subjectId),
  ];
  if (topicId) eligibility.push(eq(questions.topicId, topicId));

  const candidateRows = await tx
    .select({
      questionId: questions.id,
      exposureCount: sql<number>`coalesce(${exposureByQuestion.exposureCount}, 0)::int`,
    })
    .from(questions)
    .leftJoin(exposureByQuestion, eq(exposureByQuestion.questionId, questions.id))
    .where(and(...eligibility));

  const ids = candidateRows.map((row) => row.questionId);
  const aggregates = await loadQuestionAggregates(tx, ids);
  const aggregateById = new Map(aggregates.map((aggregate) => [aggregate.question.id, aggregate]));

  return candidateRows.flatMap((row) => {
    const aggregate = aggregateById.get(row.questionId);
    if (!aggregate) return [];
    return [{
      questionId: aggregate.question.id,
      status: aggregate.question.status,
      usageType: aggregate.question.usageType,
      subjectId: aggregate.question.subjectId,
      topicId: aggregate.question.topicId,
      exposureCount: Number(row.exposureCount),
      aggregate,
    }];
  });
}

export async function loadQuestionAggregate(
  tx: PracticeTransaction,
  questionId: string,
): Promise<QuestionAggregate | undefined> {
  const [aggregate] = await loadQuestionAggregates(tx, [questionId]);
  return aggregate;
}

export async function insertPracticeSessionAndItems(
  tx: PracticeTransaction,
  session: PracticeSessionInsert,
  items: readonly PracticeSnapshotInsert[],
): Promise<PracticeSessionRow> {
  const [created] = await tx.insert(practiceSessions).values(session).returning();
  if (!created) throw new Error("Practice session insert returned no row.");
  if (items.length > 0) await tx.insert(practiceSessionItems).values([...items]);
  return created;
}

export async function getOwnedPracticeSession(
  tx: PracticeTransaction,
  sessionId: string,
  parentUserId: string,
): Promise<PracticeSessionRow | undefined> {
  const [row] = await tx
    .select({ session: practiceSessions })
    .from(practiceSessions)
    .innerJoin(childProfiles, eq(practiceSessions.childProfileId, childProfiles.id))
    .where(
      and(
        eq(practiceSessions.id, sessionId),
        eq(childProfiles.parentUserId, parentUserId),
        eq(childProfiles.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return row?.session;
}

export async function lockOwnedPracticeSession(
  tx: PracticeTransaction,
  sessionId: string,
  parentUserId: string,
): Promise<PracticeSessionRow | undefined> {
  const ownedChild = await tx
    .select({ id: childProfiles.id })
    .from(practiceSessions)
    .innerJoin(childProfiles, eq(practiceSessions.childProfileId, childProfiles.id))
    .where(
      and(
        eq(practiceSessions.id, sessionId),
        eq(childProfiles.parentUserId, parentUserId),
        eq(childProfiles.status, "ACTIVE"),
      ),
    )
    .for("share", { of: [childProfiles] })
    .limit(1);
  if (ownedChild.length !== 1) return undefined;

  const [row] = await tx
    .select({ session: practiceSessions })
    .from(practiceSessions)
    .innerJoin(childProfiles, eq(practiceSessions.childProfileId, childProfiles.id))
    .where(
      and(
        eq(practiceSessions.id, sessionId),
        eq(childProfiles.parentUserId, parentUserId),
        eq(childProfiles.status, "ACTIVE"),
      ),
    )
    .for("update", { of: [practiceSessions] })
    .limit(1);
  return row?.session;
}

export async function listPracticeSnapshotItems(
  tx: PracticeTransaction,
  sessionId: string,
): Promise<readonly PracticeSnapshotItemWithAnswer[]> {
  const rows = await tx
    .select({
      item: practiceSessionItems,
      answer: practiceAnswers,
    })
    .from(practiceSessionItems)
    .leftJoin(
      practiceAnswers,
      and(
        eq(practiceAnswers.practiceSessionId, practiceSessionItems.practiceSessionId),
        eq(practiceAnswers.questionId, practiceSessionItems.questionId),
      ),
    )
    .where(eq(practiceSessionItems.practiceSessionId, sessionId))
    .orderBy(asc(practiceSessionItems.position), asc(practiceSessionItems.questionId));
  return rows.map((row) => ({
    questionId: row.item.questionId,
    position: row.item.position,
    answer: row.answer,
  }));
}

export async function getPracticeAnswer(
  tx: PracticeTransaction,
  sessionId: string,
  questionId: string,
): Promise<PracticeAnswerRow | undefined> {
  const [row] = await tx
    .select()
    .from(practiceAnswers)
    .where(
      and(
        eq(practiceAnswers.practiceSessionId, sessionId),
        eq(practiceAnswers.questionId, questionId),
      ),
    )
    .limit(1);
  return row;
}

export interface PracticeAnswerCounts {
  total: number;
  correct: number;
}

export async function countPracticeAnswers(
  tx: PracticeTransaction,
  sessionId: string,
): Promise<PracticeAnswerCounts> {
  const [row] = await tx
    .select({
      total: sql<number>`count(*)::int`,
      correct: sql<number>`count(*) filter (where ${practiceAnswers.isCorrect})::int`,
    })
    .from(practiceAnswers)
    .where(eq(practiceAnswers.practiceSessionId, sessionId));
  return {
    total: Number(row?.total ?? 0),
    correct: Number(row?.correct ?? 0),
  };
}

export async function insertPracticeAnswer(
  tx: PracticeTransaction,
  answer: PracticeAnswerInsert,
): Promise<PracticeAnswerRow> {
  const [created] = await tx.insert(practiceAnswers).values(answer).returning();
  if (!created) throw new Error("Practice answer insert returned no row.");
  return created;
}

export interface PracticeSessionAnswerUpdate {
  questionsAnswered: number;
  correctCount: number;
  status: PracticeSessionRow["status"];
  lastActivityAt: Date;
  completedAt: Date | null;
}

export async function updatePracticeSessionAfterAnswer(
  tx: PracticeTransaction,
  sessionId: string,
  update: PracticeSessionAnswerUpdate,
): Promise<PracticeSessionRow | undefined> {
  const [updated] = await tx
    .update(practiceSessions)
    .set(update)
    .where(eq(practiceSessions.id, sessionId))
    .returning();
  return updated;
}

export async function abandonPracticeSessionRow(
  tx: PracticeTransaction,
  sessionId: string,
  lastActivityAt: Date,
): Promise<PracticeSessionRow | undefined> {
  const [updated] = await tx
    .update(practiceSessions)
    .set({
      status: "ABANDONED",
      lastActivityAt,
      completedAt: null,
    })
    .where(
      and(
        eq(practiceSessions.id, sessionId),
        eq(practiceSessions.status, "ACTIVE"),
      ),
    )
    .returning();
  return updated;
}
