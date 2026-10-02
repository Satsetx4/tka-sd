import assert from "node:assert/strict";
import { test } from "node:test";
import {
  arePracticeResponsesSemanticallyEqual,
  canTransitionPracticeSession,
  getNextUnansweredPracticeItem,
  isEligiblePracticeCandidate,
  normalizePracticeResponse,
  selectPracticeSnapshot,
  transitionPracticeSession,
  validatePracticeResponseTimeMs,
  validatePracticeStartRequest,
  type PracticeCandidateMetadata,
} from "../../src/server/practice/domain";
import type { QuestionAggregate, QuestionStatus, QuestionType } from "../../src/server/questions/domain";

const explanation = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Ikuti informasi pada soal." }] }],
};

function makeAggregate(
  questionType: QuestionType = "SINGLE_CHOICE",
  status: QuestionStatus = "PUBLISHED",
): QuestionAggregate {
  const question = {
    id: "question-1",
    code: "MAT-SAMPLE-1",
    subjectId: "subject-mat",
    domainId: "domain-number",
    topicId: "topic-fraction",
    primaryCompetencyId: "competency-number",
    primaryIndicatorId: null,
    stimulusId: null,
    questionType,
    cognitiveLevel: "APPLY" as const,
    difficulty: "MEDIUM" as const,
    usageType: "PRACTICE" as const,
    questionBodyJson: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Pilih jawaban." }] }],
    },
    explanationBodyJson: structuredClone(explanation),
    status,
    version: 1,
    sourceType: "ORIGINAL" as const,
    sourceReference: null,
    createdBy: "user-editor-1",
    reviewedBy: null,
    verifiedBy: "user-reviewer-1",
    createdAt: "2026-10-02T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    publishedAt: status === "PUBLISHED" ? "2026-10-02T00:00:00.000Z" : null,
    archivedAt: null,
  };
  const options =
    questionType === "MULTI_SELECT"
      ? [
          { id: "option-a", questionId: question.id, optionKey: "A", bodyJson: "Pilihan A", isCorrect: true, sortOrder: 10 },
          { id: "option-b", questionId: question.id, optionKey: "B", bodyJson: "Pilihan B", isCorrect: true, sortOrder: 20 },
          { id: "option-c", questionId: question.id, optionKey: "C", bodyJson: "Pilihan C", isCorrect: false, sortOrder: 30 },
        ]
      : [
          { id: "option-a", questionId: question.id, optionKey: "A", bodyJson: "Pilihan A", isCorrect: true, sortOrder: 10 },
          { id: "option-b", questionId: question.id, optionKey: "B", bodyJson: "Pilihan B", isCorrect: false, sortOrder: 20 },
        ];
  const categoryStatements = [
    { id: "statement-1", questionId: question.id, statementBodyJson: "Pernyataan pertama", sortOrder: 10 },
    { id: "statement-2", questionId: question.id, statementBodyJson: "Pernyataan kedua", sortOrder: 20 },
  ];
  const categoryChoices = [
    { id: "choice-true", questionId: question.id, code: "TRUE", label: "Benar", sortOrder: 10 },
    { id: "choice-false", questionId: question.id, code: "FALSE", label: "Salah", sortOrder: 20 },
  ];

  return {
    question,
    options: questionType === "CATEGORY" ? [] : options,
    categoryStatements: questionType === "CATEGORY" ? categoryStatements : [],
    categoryChoices: questionType === "CATEGORY" ? categoryChoices : [],
    categoryAnswers:
      questionType === "CATEGORY"
        ? [
            { statementId: "statement-1", categoryChoiceId: "choice-true" },
            { statementId: "statement-2", categoryChoiceId: "choice-false" },
          ]
        : [],
    taxonomy: {
      subject: { id: question.subjectId },
      domain: { id: question.domainId, subjectId: question.subjectId },
      topic: { id: question.topicId, domainId: question.domainId },
      primaryCompetency: { id: question.primaryCompetencyId, subjectId: question.subjectId },
      primaryIndicator: null,
    },
    stimulus: null,
  };
}

function candidate(
  questionId: string,
  exposureCount: number,
  overrides: Partial<PracticeCandidateMetadata> = {},
): PracticeCandidateMetadata {
  return {
    questionId,
    status: "PUBLISHED",
    usageType: "PRACTICE",
    subjectId: "subject-mat",
    topicId: "topic-fraction",
    exposureCount,
    ...overrides,
  };
}

test("Practice start request accepts positive integer targets without an invented maximum", async (t) => {
  await t.test("accepts a positive integer", () => {
    const result = validatePracticeStartRequest({
      childProfileId: "child-1",
      subjectId: "subject-mat",
      questionTarget: 1,
    });
    assert.equal(result.ok, true);
  });

  await t.test("accepts a large positive integer", () => {
    const result = validatePracticeStartRequest({
      childProfileId: "child-1",
      subjectId: "subject-mat",
      questionTarget: 100_000,
    });
    assert.equal(result.ok, true);
  });

  for (const questionTarget of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "3"]) {
    await t.test("rejects target " + String(questionTarget), () => {
      const result = validatePracticeStartRequest({
        childProfileId: "child-1",
        subjectId: "subject-mat",
        questionTarget,
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error.code, "INVALID_INPUT");
    });
  }

  await t.test("requires child and subject IDs", () => {
    assert.equal(validatePracticeStartRequest({ subjectId: "subject-mat", questionTarget: 1 }).ok, false);
    assert.equal(validatePracticeStartRequest({ childProfileId: "child-1", questionTarget: 1 }).ok, false);
  });
});

test("eligibility requires PUBLISHED, PRACTICE or BOTH, and exact requested taxonomy", () => {
  const scope = { subjectId: "subject-mat", topicId: "topic-fraction", questionTarget: 1 };
  assert.equal(isEligiblePracticeCandidate(candidate("eligible", 0), scope), true);
  assert.equal(
    isEligiblePracticeCandidate(candidate("both", 0, { usageType: "BOTH" }), scope),
    true,
  );
  for (const status of ["DRAFT", "IN_REVIEW", "VERIFIED", "ARCHIVED"] as const) {
    assert.equal(isEligiblePracticeCandidate(candidate(status, 0, { status }), scope), false);
  }
  assert.equal(
    isEligiblePracticeCandidate(candidate("assessment", 0, { usageType: "ASSESSMENT" }), scope),
    false,
  );
  assert.equal(
    isEligiblePracticeCandidate(candidate("other-subject", 0, { subjectId: "subject-other" }), scope),
    false,
  );
  assert.equal(
    isEligiblePracticeCandidate(candidate("other-topic", 0, { topicId: "topic-other" }), scope),
    false,
  );
  assert.equal(
    isEligiblePracticeCandidate(candidate("any-topic", 0, { topicId: "topic-other" }), {
      subjectId: "subject-mat",
      questionTarget: 1,
    }),
    true,
  );
});

test("selection prioritizes lower exposure then uses the seed for deterministic ties", () => {
  const scope = { subjectId: "subject-mat", topicId: "topic-fraction", questionTarget: 3 };
  const candidates = [
    candidate("seen-often", 8),
    candidate("seen-once", 1),
    candidate("unseen-a", 0),
    candidate("unseen-b", 0),
    candidate("unseen-c", 0),
  ];
  const first = selectPracticeSnapshot("session-seed", candidates, scope);
  const repeated = selectPracticeSnapshot("session-seed", candidates, scope);
  assert.equal(first.ok, true);
  assert.deepEqual(repeated, first);
  if (!first.ok) return;
  assert.deepEqual(first.value.map((item) => item.position), [1, 2, 3]);
  assert.equal(first.value.length, scope.questionTarget);
  assert.equal(first.value.some((item) => item.questionId === "seen-often"), false);

  const fullScope = { ...scope, questionTarget: candidates.length };
  const allSelected = selectPracticeSnapshot("session-seed", candidates, fullScope);
  assert.equal(allSelected.ok, true);
  if (!allSelected.ok) return;
  const allSelectedAgain = selectPracticeSnapshot("session-seed", candidates, fullScope);
  assert.deepEqual(allSelectedAgain, allSelected);
  assert.equal(new Set(allSelected.value.map((item) => item.position)).size, candidates.length);
});

test("insufficient eligible candidates fail without returning a partial snapshot", () => {
  const result = selectPracticeSnapshot(
    "session-seed",
    [candidate("one", 0), candidate("wrong-subject", 0, { subjectId: "other" })],
    { subjectId: "subject-mat", questionTarget: 2 },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "INSUFFICIENT_QUESTIONS");
    assert.equal("value" in result, false);
  }
});

test("Practice lifecycle only allows ACTIVE to a terminal status", () => {
  assert.equal(canTransitionPracticeSession("ACTIVE", "COMPLETED"), true);
  assert.equal(canTransitionPracticeSession("ACTIVE", "ABANDONED"), true);
  assert.equal(canTransitionPracticeSession("ACTIVE", "ACTIVE"), false);
  assert.equal(canTransitionPracticeSession("COMPLETED", "ACTIVE"), false);
  assert.equal(canTransitionPracticeSession("COMPLETED", "ABANDONED"), false);
  assert.equal(canTransitionPracticeSession("ABANDONED", "COMPLETED"), false);
  assert.deepEqual(transitionPracticeSession("ACTIVE", "COMPLETED"), {
    ok: true,
    value: "COMPLETED",
  });
  assert.equal(transitionPracticeSession("COMPLETED", "ACTIVE").ok, false);
});

test("responseTimeMs is optional and otherwise a non-negative integer", () => {
  assert.deepEqual(validatePracticeResponseTimeMs(undefined), { ok: true, value: undefined });
  assert.deepEqual(validatePracticeResponseTimeMs(0), { ok: true, value: 0 });
  assert.deepEqual(validatePracticeResponseTimeMs(850), { ok: true, value: 850 });
  assert.deepEqual(validatePracticeResponseTimeMs(2_147_483_647), {
    ok: true,
    value: 2_147_483_647,
  });
  for (const value of [-1, 1.2, "20", null, Number.NaN, 2_147_483_648]) {
    const result = validatePracticeResponseTimeMs(value);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "INVALID_INPUT");
  }
});

test("CATEGORY public codes normalize to internal IDs in statement order", () => {
  const aggregate = makeAggregate("CATEGORY");
  const result = normalizePracticeResponse(aggregate, {
    type: "CATEGORY",
    selections: [
      { statementId: "statement-2", categoryChoiceCode: "FALSE" },
      { statementId: "statement-1", categoryChoiceCode: "TRUE" },
    ],
  });
  assert.deepEqual(result, {
    ok: true,
    value: {
      type: "CATEGORY",
      selections: [
        { statementId: "statement-1", categoryChoiceId: "choice-true" },
        { statementId: "statement-2", categoryChoiceId: "choice-false" },
      ],
    },
  });
});

test("CATEGORY adapter rejects unknown, ambiguous, and non-member inputs", () => {
  const aggregate = makeAggregate("CATEGORY");
  const unknownCode = normalizePracticeResponse(aggregate, {
    type: "CATEGORY",
    selections: [{ statementId: "statement-1", categoryChoiceCode: "MISSING" }],
  });
  assert.equal(unknownCode.ok, false);
  if (!unknownCode.ok) assert.equal(unknownCode.error.code, "CATEGORY_CHOICE_UNKNOWN");

  const duplicateChoiceCode = structuredClone(aggregate);
  duplicateChoiceCode.categoryChoices = [
    ...duplicateChoiceCode.categoryChoices,
    { ...duplicateChoiceCode.categoryChoices[0]!, id: "choice-duplicate" },
  ];
  const ambiguousAggregate = normalizePracticeResponse(duplicateChoiceCode, {
    type: "CATEGORY",
    selections: [{ statementId: "statement-1", categoryChoiceCode: "TRUE" }],
  });
  assert.equal(ambiguousAggregate.ok, false);
  if (!ambiguousAggregate.ok) assert.equal(ambiguousAggregate.error.code, "INVALID_QUESTION");

  const unknownStatement = normalizePracticeResponse(aggregate, {
    type: "CATEGORY",
    selections: [{ statementId: "statement-other", categoryChoiceCode: "TRUE" }],
  });
  assert.equal(unknownStatement.ok, false);
  if (!unknownStatement.ok) assert.equal(unknownStatement.error.code, "CATEGORY_STATEMENT_UNKNOWN");

  const duplicateStatement = normalizePracticeResponse(aggregate, {
    type: "CATEGORY",
    selections: [
      { statementId: "statement-1", categoryChoiceCode: "TRUE" },
      { statementId: "statement-1", categoryChoiceCode: "FALSE" },
    ],
  });
  assert.equal(duplicateStatement.ok, false);
  if (!duplicateStatement.ok) assert.equal(duplicateStatement.error.code, "CATEGORY_STATEMENT_DUPLICATE");

  assert.equal(
    normalizePracticeResponse(aggregate, {
      type: "CATEGORY",
      selections: [{ statementId: "statement-1", categoryChoiceId: "choice-true" }],
    }).ok,
    false,
  );
});

test("SINGLE and MULTI responses normalize to evaluator-compatible shapes", () => {
  const single = normalizePracticeResponse(makeAggregate("SINGLE_CHOICE"), {
    type: "SINGLE_CHOICE",
    optionKey: "B",
  });
  assert.deepEqual(single, { ok: true, value: { type: "SINGLE_CHOICE", optionKey: "B" } });

  const multi = normalizePracticeResponse(makeAggregate("MULTI_SELECT"), {
    type: "MULTI_SELECT",
    optionKeys: ["B", "A"],
  });
  assert.deepEqual(multi, {
    ok: true,
    value: { type: "MULTI_SELECT", optionKeys: ["A", "B"] },
  });
  if (multi.ok) {
    assert.equal(
      arePracticeResponsesSemanticallyEqual(multi.value, {
        type: "MULTI_SELECT",
        optionKeys: ["A", "B"],
      }),
      true,
    );
  }

  const duplicate = normalizePracticeResponse(makeAggregate("MULTI_SELECT"), {
    type: "MULTI_SELECT",
    optionKeys: ["A", "A"],
  });
  assert.equal(duplicate.ok, false);
});

test("default navigation returns the lowest-position unanswered snapshot item", () => {
  const items = [
    { questionId: "q3", position: 3 },
    { questionId: "q1", position: 1 },
    { questionId: "q2", position: 2 },
  ];
  assert.deepEqual(getNextUnansweredPracticeItem(items, new Set(["q1"])), {
    questionId: "q2",
    position: 2,
  });
  assert.equal(
    getNextUnansweredPracticeItem(items, new Set(["q1", "q2", "q3"])),
    null,
  );
});
