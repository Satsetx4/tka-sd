import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateQuestionResponse,
  hasMeaningfulQuestionContent,
  projectQuestionForStudent,
  validateAnswerDefinition,
  validateQuestionForPublish,
  validateQuestionStatusTransition,
  type QuestionAggregate,
  type QuestionStatus,
  type QuestionType,
  type ValidationResult,
} from "../../src/server/questions/domain";

const explanation = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Karena langkahnya mengikuti informasi pada soal." }] }],
};

function makeAggregate(
  questionType: QuestionType = "SINGLE_CHOICE",
  status: QuestionStatus = "VERIFIED",
): QuestionAggregate {
  const question = {
    id: "question-1",
    code: "MAT-SAMPLE-1",
    subjectId: "subject-mat",
    domainId: "domain-number",
    topicId: "topic-fraction",
    primaryCompetencyId: "competency-number",
    primaryIndicatorId: "indicator-fraction",
    stimulusId: "stimulus-1",
    questionType,
    cognitiveLevel: "APPLY" as const,
    difficulty: "MEDIUM" as const,
    usageType: "BOTH" as const,
    questionBodyJson: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Pilih jawaban yang tepat." }] }],
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
    { id: "choice-1", questionId: question.id, code: "TRUE", label: "Benar", sortOrder: 10 },
    { id: "choice-2", questionId: question.id, code: "FALSE", label: "Salah", sortOrder: 20 },
  ];

  return {
    question,
    options: questionType === "CATEGORY" ? [] : options,
    categoryStatements: questionType === "CATEGORY" ? categoryStatements : [],
    categoryChoices: questionType === "CATEGORY" ? categoryChoices : [],
    categoryAnswers:
      questionType === "CATEGORY"
        ? [
            { statementId: "statement-1", categoryChoiceId: "choice-1" },
            { statementId: "statement-2", categoryChoiceId: "choice-2" },
          ]
        : [],
    taxonomy: {
      subject: { id: question.subjectId },
      domain: { id: question.domainId, subjectId: question.subjectId },
      topic: { id: question.topicId, domainId: question.domainId },
      primaryCompetency: { id: question.primaryCompetencyId, subjectId: question.subjectId },
      primaryIndicator: {
        id: "indicator-fraction",
        subjectId: question.subjectId,
        competencyId: question.primaryCompetencyId,
        topicId: question.topicId,
      },
    },
    stimulus: {
      id: question.stimulusId!,
      subjectId: question.subjectId,
      title: "Stimulus",
      stimulusType: "TEXT",
      bodyJson: { type: "paragraph", text: "Informasi pendukung." },
    },
  };
}

function codes(result: ValidationResult): string[] {
  return result.issues.map((entry) => entry.code);
}

function assertHasCode(result: ValidationResult, expectedCode: string): void {
  assert.ok(codes(result).includes(expectedCode), `expected issue ${expectedCode}; got ${codes(result).join(", ")}`);
}

function assertEmptyExplanationRejected(value: unknown): void {
  const aggregate = makeAggregate();
  aggregate.question.explanationBodyJson = value;
  assertHasCode(validateQuestionForPublish(aggregate), "QUESTION_EXPLANATION_EMPTY");
}

test("SINGLE_CHOICE answer definition enforces one correct option without a fixed option count", async (t) => {
  await t.test("no options is invalid", () => {
    const aggregate = makeAggregate("SINGLE_CHOICE");
    aggregate.options = [];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_OPTIONS_REQUIRED");
  });
  await t.test("zero correct options is invalid", () => {
    const aggregate = makeAggregate("SINGLE_CHOICE");
    aggregate.options = aggregate.options.map((option) => ({ ...option, isCorrect: false }));
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_SINGLE_CORRECT_COUNT_INVALID");
  });
  await t.test("exactly one correct option is valid", () => {
    assert.equal(validateAnswerDefinition(makeAggregate("SINGLE_CHOICE")).valid, true);
  });
  await t.test("one total option is valid when it is the single correct option", () => {
    const aggregate = makeAggregate("SINGLE_CHOICE");
    aggregate.options = [aggregate.options[0]!];
    assert.equal(validateAnswerDefinition(aggregate).valid, true);
  });
  await t.test("more than one correct option is invalid", () => {
    const aggregate = makeAggregate("SINGLE_CHOICE");
    aggregate.options = aggregate.options.map((option) => ({ ...option, isCorrect: true }));
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_SINGLE_CORRECT_COUNT_INVALID");
  });
  await t.test("CATEGORY answer rows cannot define a SINGLE_CHOICE answer", () => {
    const aggregate = makeAggregate("SINGLE_CHOICE");
    aggregate.categoryStatements = [
      { id: "statement-1", questionId: aggregate.question.id, statementBodyJson: "Statement", sortOrder: 10 },
    ];
    aggregate.categoryChoices = [
      { id: "choice-1", questionId: aggregate.question.id, code: "A", label: "A", sortOrder: 10 },
    ];
    aggregate.categoryAnswers = [{ statementId: "statement-1", categoryChoiceId: "choice-1" }];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_CATEGORY_ROWS_NOT_ALLOWED");
  });
});

test("MULTI_SELECT answer definition requires more than one correct option", async (t) => {
  await t.test("no options is invalid", () => {
    const aggregate = makeAggregate("MULTI_SELECT");
    aggregate.options = [];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_OPTIONS_REQUIRED");
  });
  await t.test("zero correct options is invalid", () => {
    const aggregate = makeAggregate("MULTI_SELECT");
    aggregate.options = aggregate.options.map((option) => ({ ...option, isCorrect: false }));
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_MULTI_CORRECT_COUNT_INVALID");
  });
  await t.test("one correct option is invalid", () => {
    const aggregate = makeAggregate("MULTI_SELECT");
    aggregate.options = aggregate.options.map((option, index) => ({ ...option, isCorrect: index === 0 }));
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_MULTI_CORRECT_COUNT_INVALID");
  });
  await t.test("two correct options is valid", () => {
    assert.equal(validateAnswerDefinition(makeAggregate("MULTI_SELECT")).valid, true);
  });
  await t.test("CATEGORY answer rows cannot define a MULTI_SELECT answer", () => {
    const aggregate = makeAggregate("MULTI_SELECT");
    aggregate.categoryStatements = [
      { id: "statement-1", questionId: aggregate.question.id, statementBodyJson: "Statement", sortOrder: 10 },
    ];
    aggregate.categoryChoices = [
      { id: "choice-1", questionId: aggregate.question.id, code: "A", label: "A", sortOrder: 10 },
    ];
    aggregate.categoryAnswers = [{ statementId: "statement-1", categoryChoiceId: "choice-1" }];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_CATEGORY_ROWS_NOT_ALLOWED");
  });
});

test("CATEGORY answer definition validates statement-to-choice mappings", async (t) => {
  await t.test("no statements is invalid", () => {
    const aggregate = makeAggregate("CATEGORY");
    aggregate.categoryStatements = [];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_CATEGORY_STATEMENTS_REQUIRED");
  });
  await t.test("no choices is invalid", () => {
    const aggregate = makeAggregate("CATEGORY");
    aggregate.categoryChoices = [];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_CATEGORY_CHOICES_REQUIRED");
  });
  await t.test("a missing statement mapping is invalid", () => {
    const aggregate = makeAggregate("CATEGORY");
    aggregate.categoryAnswers = [{ statementId: "statement-1", categoryChoiceId: "choice-1" }];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_CATEGORY_MAPPING_COUNT_INVALID");
  });
  await t.test("two mappings for one statement are invalid", () => {
    const aggregate = makeAggregate("CATEGORY");
    aggregate.categoryAnswers = [
      { statementId: "statement-1", categoryChoiceId: "choice-1" },
      { statementId: "statement-1", categoryChoiceId: "choice-2" },
      { statementId: "statement-2", categoryChoiceId: "choice-2" },
    ];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_CATEGORY_MAPPING_COUNT_INVALID");
  });
  await t.test("a mapping to a choice from another question is invalid", () => {
    const aggregate = makeAggregate("CATEGORY");
    aggregate.categoryChoices = aggregate.categoryChoices.map((choice) =>
      choice.id === "choice-2" ? { ...choice, questionId: "question-other" } : choice,
    );
    assertHasCode(validateAnswerDefinition(aggregate), "CATEGORY_CHOICE_QUESTION_MISMATCH");
    assertHasCode(validateAnswerDefinition(aggregate), "CATEGORY_ANSWER_CHOICE_QUESTION_MISMATCH");
  });
  await t.test("a mapping outside the aggregate is invalid", () => {
    const aggregate = makeAggregate("CATEGORY");
    aggregate.categoryAnswers = [
      { statementId: "statement-1", categoryChoiceId: "choice-1" },
      { statementId: "statement-2", categoryChoiceId: "choice-not-loaded" },
    ];
    assertHasCode(validateAnswerDefinition(aggregate), "CATEGORY_ANSWER_CHOICE_UNKNOWN");
  });
  await t.test("exactly one mapping per statement is valid", () => {
    assert.equal(validateAnswerDefinition(makeAggregate("CATEGORY")).valid, true);
  });
  await t.test("validation returns repeatable structured issue order", () => {
    const aggregate = makeAggregate("CATEGORY");
    aggregate.categoryAnswers = [];
    const first = validateAnswerDefinition(aggregate);
    const second = validateAnswerDefinition(aggregate);
    assert.equal(first.valid, false);
    assert.deepEqual(second, first);
    assert.ok(first.issues.every((entry) => entry.code && entry.path && entry.message));
  });
  await t.test("option correctness rows do not define CATEGORY answers", () => {
    const aggregate = makeAggregate("CATEGORY");
    aggregate.options = [
      { id: "option-a", questionId: aggregate.question.id, optionKey: "A", bodyJson: "Pilihan A", isCorrect: true, sortOrder: 10 },
    ];
    assert.equal(validateAnswerDefinition(aggregate).valid, true);
    aggregate.categoryAnswers = [];
    assertHasCode(validateAnswerDefinition(aggregate), "ANSWER_CATEGORY_MAPPING_COUNT_INVALID");
  });
});

test("publish readiness checks taxonomy, indicator, and stimulus coherence", async (t) => {
  await t.test("domain from another subject is invalid", () => {
    const aggregate = makeAggregate();
    aggregate.taxonomy.domain = { ...aggregate.taxonomy.domain!, subjectId: "subject-bin" };
    assertHasCode(validateQuestionForPublish(aggregate), "TAXONOMY_DOMAIN_SUBJECT_MISMATCH");
  });
  await t.test("topic from another domain is invalid", () => {
    const aggregate = makeAggregate();
    aggregate.taxonomy.topic = { ...aggregate.taxonomy.topic!, domainId: "domain-other" };
    assertHasCode(validateQuestionForPublish(aggregate), "TAXONOMY_TOPIC_DOMAIN_MISMATCH");
  });
  await t.test("primary competency from another subject is invalid", () => {
    const aggregate = makeAggregate();
    aggregate.taxonomy.primaryCompetency = {
      ...aggregate.taxonomy.primaryCompetency!,
      subjectId: "subject-bin",
    };
    assertHasCode(validateQuestionForPublish(aggregate), "TAXONOMY_COMPETENCY_SUBJECT_MISMATCH");
  });
  await t.test("indicator from another subject is invalid", () => {
    const aggregate = makeAggregate();
    aggregate.taxonomy.primaryIndicator = { ...aggregate.taxonomy.primaryIndicator!, subjectId: "subject-bin" };
    assertHasCode(validateQuestionForPublish(aggregate), "TAXONOMY_INDICATOR_SUBJECT_MISMATCH");
  });
  await t.test("indicator pointing to another competency is invalid", () => {
    const aggregate = makeAggregate();
    aggregate.taxonomy.primaryIndicator = {
      ...aggregate.taxonomy.primaryIndicator!,
      competencyId: "competency-other",
    };
    assertHasCode(validateQuestionForPublish(aggregate), "TAXONOMY_INDICATOR_COMPETENCY_MISMATCH");
  });
  await t.test("indicator pointing to another topic is invalid when topic is set", () => {
    const aggregate = makeAggregate();
    aggregate.taxonomy.primaryIndicator = { ...aggregate.taxonomy.primaryIndicator!, topicId: "topic-other" };
    assertHasCode(validateQuestionForPublish(aggregate), "TAXONOMY_INDICATOR_TOPIC_MISMATCH");
  });
  await t.test("indicator with no topic remains valid", () => {
    const aggregate = makeAggregate();
    aggregate.taxonomy.primaryIndicator = { ...aggregate.taxonomy.primaryIndicator!, topicId: null };
    assert.equal(validateQuestionForPublish(aggregate).valid, true);
  });
  await t.test("stimulus from another subject is invalid", () => {
    const aggregate = makeAggregate();
    aggregate.stimulus = { ...aggregate.stimulus!, subjectId: "subject-bin" };
    assertHasCode(validateQuestionForPublish(aggregate), "STIMULUS_SUBJECT_MISMATCH");
  });
  await t.test("a fully coherent aggregate is publish-ready", () => {
    assert.equal(validateQuestionForPublish(makeAggregate()).valid, true);
  });
  await t.test("database Date timestamps remain valid row values", () => {
    const aggregate = makeAggregate();
    aggregate.question.createdAt = new Date("2026-10-02T00:00:00.000Z");
    aggregate.question.updatedAt = new Date("2026-10-02T00:00:00.000Z");
    assert.equal(validateQuestionForPublish(aggregate).valid, true);
  });
  await t.test("empty option and statement bodies are rejected", () => {
    const optionQuestion = makeAggregate();
    optionQuestion.options = optionQuestion.options.map((option) => ({ ...option, bodyJson: {} }));
    assertHasCode(validateQuestionForPublish(optionQuestion), "OPTION_BODY_EMPTY");

    const categoryQuestion = makeAggregate("CATEGORY");
    categoryQuestion.categoryStatements = categoryQuestion.categoryStatements.map((statement) => ({
      ...statement,
      statementBodyJson: [],
    }));
    assertHasCode(validateQuestionForPublish(categoryQuestion), "CATEGORY_STATEMENT_BODY_EMPTY");
  });
});

test("structured explanation content uses the documented conservative non-empty rule", async (t) => {
  await t.test("null is empty for publishing", () => {
    assert.equal(hasMeaningfulQuestionContent(null), false);
    assertEmptyExplanationRejected(null);
  });
  await t.test("empty array is empty for publishing", () => {
    assert.equal(hasMeaningfulQuestionContent([]), false);
    assertEmptyExplanationRejected([]);
  });
  await t.test("empty object is empty for publishing", () => {
    assert.equal(hasMeaningfulQuestionContent({}), false);
    assertEmptyExplanationRejected({});
  });
  await t.test("empty or whitespace string is empty", () => {
    assert.equal(hasMeaningfulQuestionContent(""), false);
    assert.equal(hasMeaningfulQuestionContent("  \n "), false);
    assertEmptyExplanationRejected("");
    assertEmptyExplanationRejected("  \n ");
  });
  await t.test("editor metadata without content is empty", () => {
    assert.equal(hasMeaningfulQuestionContent({ type: "paragraph", children: [] }), false);
  });
  await t.test("controlled structured block text is meaningful", () => {
    assert.equal(
      hasMeaningfulQuestionContent({ type: "paragraph", children: [{ type: "text", text: "Penjelasan." }] }),
      true,
    );
  });
  await t.test("empty explanation blocks publish readiness", () => {
    assertEmptyExplanationRejected({ type: "doc", content: [] });
  });
});

test("status transitions advance one stage at a time and require readiness to publish", async (t) => {
  const sequence: readonly [QuestionStatus, QuestionStatus][] = [
    ["DRAFT", "IN_REVIEW"],
    ["IN_REVIEW", "VERIFIED"],
    ["VERIFIED", "PUBLISHED"],
    ["PUBLISHED", "ARCHIVED"],
  ];
  for (const [current, next] of sequence) {
    await t.test(`${current} to ${next} is allowed when ready`, () => {
      assert.equal(validateQuestionStatusTransition(makeAggregate("SINGLE_CHOICE", current), next).valid, true);
    });
  }
  await t.test("a skipped forward stage is rejected", () => {
    assertHasCode(
      validateQuestionStatusTransition(makeAggregate("SINGLE_CHOICE", "DRAFT"), "VERIFIED"),
      "STATUS_TRANSITION_SKIPPED",
    );
  });
  await t.test("a backward transition is rejected", () => {
    assertHasCode(
      validateQuestionStatusTransition(makeAggregate("SINGLE_CHOICE", "PUBLISHED"), "VERIFIED"),
      "STATUS_TRANSITION_BACKWARD",
    );
  });
  await t.test("same-status no-op is rejected explicitly", () => {
    assertHasCode(
      validateQuestionStatusTransition(makeAggregate("SINGLE_CHOICE", "DRAFT"), "DRAFT"),
      "STATUS_TRANSITION_NOOP",
    );
  });
  await t.test("ARCHIVED is terminal", () => {
    assertHasCode(
      validateQuestionStatusTransition(makeAggregate("SINGLE_CHOICE", "ARCHIVED"), "DRAFT"),
      "STATUS_TRANSITION_TERMINAL",
    );
  });
  await t.test("publishing an unready question is rejected with readiness issues", () => {
    const aggregate = makeAggregate("SINGLE_CHOICE", "VERIFIED");
    aggregate.question.explanationBodyJson = null;
    const transition = validateQuestionStatusTransition(aggregate, "PUBLISHED");
    assertHasCode(transition, "STATUS_PUBLISH_REQUIRES_READY_QUESTION");
    assertHasCode(transition, "QUESTION_EXPLANATION_EMPTY");
  });
  await t.test("publishing a ready question is accepted", () => {
    assert.equal(
      validateQuestionStatusTransition(makeAggregate("SINGLE_CHOICE", "VERIFIED"), "PUBLISHED").valid,
      true,
    );
  });
});

test("SINGLE_CHOICE scoring is exact 1/0 and rejects malformed selections", async (t) => {
  await t.test("selected correct option scores one", () => {
    const evaluation = evaluateQuestionResponse(makeAggregate("SINGLE_CHOICE", "PUBLISHED"), {
      type: "SINGLE_CHOICE",
      optionKey: "A",
    });
    assert.equal(evaluation.valid, true);
    if (evaluation.valid) {
      assert.equal(evaluation.isCorrect, true);
      assert.equal(evaluation.scoreFraction, 1);
    }
  });
  await t.test("selected incorrect option scores zero", () => {
    const evaluation = evaluateQuestionResponse(makeAggregate("SINGLE_CHOICE", "PUBLISHED"), {
      type: "SINGLE_CHOICE",
      optionKey: "B",
    });
    assert.equal(evaluation.valid, true);
    if (evaluation.valid) {
      assert.equal(evaluation.isCorrect, false);
      assert.equal(evaluation.scoreFraction, 0);
    }
  });
  await t.test("unknown option key is rejected", () => {
    const evaluation = evaluateQuestionResponse(makeAggregate("SINGLE_CHOICE", "PUBLISHED"), {
      type: "SINGLE_CHOICE",
      optionKey: "UNKNOWN",
    });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "RESPONSE_OPTION_UNKNOWN");
  });
  await t.test("extra response fields are rejected", () => {
    const evaluation = evaluateQuestionResponse(makeAggregate("SINGLE_CHOICE", "PUBLISHED"), {
      type: "SINGLE_CHOICE",
      optionKey: "A",
      isCorrect: true,
    });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "RESPONSE_SHAPE_INVALID");
  });
});

test("MULTI_SELECT exact-set scoring is order independent", async (t) => {
  const aggregate = makeAggregate("MULTI_SELECT", "PUBLISHED");
  const cases: readonly [string, unknown, boolean, number][] = [
    ["exact match", { type: "MULTI_SELECT", optionKeys: ["A", "B"] }, true, 1],
    ["reordered exact match", { type: "MULTI_SELECT", optionKeys: ["B", "A"] }, true, 1],
    ["missing a correct option", { type: "MULTI_SELECT", optionKeys: ["A"] }, false, 0],
    ["extra known distractor", { type: "MULTI_SELECT", optionKeys: ["A", "B", "C"] }, false, 0],
  ];
  for (const [label, response, expectedCorrect, expectedScore] of cases) {
    await t.test(label, () => {
      const evaluation = evaluateQuestionResponse(aggregate, response);
      assert.equal(evaluation.valid, true);
      if (evaluation.valid) {
        assert.equal(evaluation.isCorrect, expectedCorrect);
        assert.equal(evaluation.scoreFraction, expectedScore);
      }
    });
  }
  await t.test("duplicate option keys are rejected", () => {
    const evaluation = evaluateQuestionResponse(aggregate, {
      type: "MULTI_SELECT",
      optionKeys: ["A", "A", "B"],
    });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "RESPONSE_OPTION_DUPLICATE");
  });
  await t.test("unknown option keys are rejected", () => {
    const evaluation = evaluateQuestionResponse(aggregate, {
      type: "MULTI_SELECT",
      optionKeys: ["A", "MISSING"],
    });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "RESPONSE_OPTION_UNKNOWN");
  });
});

test("CATEGORY scoring uses all statements as its denominator", async (t) => {
  const aggregate = makeAggregate("CATEGORY", "PUBLISHED");
  const cases: readonly [string, unknown, boolean, number][] = [
    [
      "all mappings correct",
      {
        type: "CATEGORY",
        selections: [
          { statementId: "statement-1", categoryChoiceId: "choice-1" },
          { statementId: "statement-2", categoryChoiceId: "choice-2" },
        ],
      },
      true,
      1,
    ],
    [
      "partial mapping earns a fraction",
      {
        type: "CATEGORY",
        selections: [
          { statementId: "statement-1", categoryChoiceId: "choice-1" },
          { statementId: "statement-2", categoryChoiceId: "choice-1" },
        ],
      },
      false,
      0.5,
    ],
    ["zero correct mappings scores zero", { type: "CATEGORY", selections: [] }, false, 0],
    [
      "missing statements count as incorrect",
      { type: "CATEGORY", selections: [{ statementId: "statement-1", categoryChoiceId: "choice-1" }] },
      false,
      0.5,
    ],
  ];
  for (const [label, response, expectedCorrect, expectedScore] of cases) {
    await t.test(label, () => {
      const evaluation = evaluateQuestionResponse(aggregate, response);
      assert.equal(evaluation.valid, true);
      if (evaluation.valid) {
        assert.equal(evaluation.isCorrect, expectedCorrect);
        assert.equal(evaluation.scoreFraction, expectedScore);
      }
    });
  }
  await t.test("unknown statement is rejected", () => {
    const evaluation = evaluateQuestionResponse(aggregate, {
      type: "CATEGORY",
      selections: [{ statementId: "missing", categoryChoiceId: "choice-1" }],
    });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "RESPONSE_STATEMENT_UNKNOWN");
  });
  await t.test("unknown choice is rejected", () => {
    const evaluation = evaluateQuestionResponse(aggregate, {
      type: "CATEGORY",
      selections: [{ statementId: "statement-1", categoryChoiceId: "missing" }],
    });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "RESPONSE_CHOICE_UNKNOWN");
  });
  await t.test("duplicate statement selections are rejected", () => {
    const evaluation = evaluateQuestionResponse(aggregate, {
      type: "CATEGORY",
      selections: [
        { statementId: "statement-1", categoryChoiceId: "choice-1" },
        { statementId: "statement-1", categoryChoiceId: "choice-2" },
      ],
    });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "RESPONSE_STATEMENT_DUPLICATE");
  });
  await t.test("response type mismatch is rejected", () => {
    const evaluation = evaluateQuestionResponse(aggregate, { type: "SINGLE_CHOICE", optionKey: "A" });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "RESPONSE_TYPE_MISMATCH");
  });
  await t.test("non-PUBLISHED questions cannot be evaluated for students", () => {
    const evaluation = evaluateQuestionResponse(makeAggregate("CATEGORY", "VERIFIED"), {
      type: "CATEGORY",
      selections: [],
    });
    assert.equal(evaluation.valid, false);
    if (!evaluation.valid) assert.equal(evaluation.issues[0]?.code, "EVALUATION_QUESTION_NOT_PUBLISHED");
  });
});

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

test("student-safe projection omits answer definitions, explanation, and editorial fields", async (t) => {
  await t.test("option bodies are visible without correctness flags", () => {
    const aggregate = makeAggregate("SINGLE_CHOICE", "PUBLISHED");
    aggregate.question.explanationBodyJson = "PRIVATE EXPLANATION SENTINEL";
    const projection = projectQuestionForStudent(aggregate);
    assert.equal(projection.valid, true);
    if (!projection.valid) return;
    assert.deepEqual(
      projection.value.options?.map((option) => option.optionKey),
      ["A", "B"],
    );
    assert.equal(projection.value.options?.[0]?.bodyJson, "Pilihan A");
    assert.equal("isCorrect" in (projection.value.options?.[0] ?? {}), false);
    assert.deepEqual(projection.value.stimulus?.bodyJson, {
      type: "paragraph",
      text: "Informasi pendukung.",
    });
    const serialized = JSON.stringify(projection.value);
    assert.equal(serialized.includes("PRIVATE EXPLANATION SENTINEL"), false);
    for (const forbidden of [
      "isCorrect",
      "is_correct",
      "correctOptionKeys",
      "explanationBodyJson",
      "sourceType",
      "sourceReference",
      "createdBy",
      "reviewedBy",
      "verifiedBy",
    ]) {
      assert.equal(collectKeys(projection.value).has(forbidden), false, `projection contained ${forbidden}`);
    }
  });
  await t.test("CATEGORY statements and choices are visible without answer mappings", () => {
    const aggregate = makeAggregate("CATEGORY", "PUBLISHED");
    aggregate.question.explanationBodyJson = "PRIVATE CATEGORY EXPLANATION SENTINEL";
    const projection = projectQuestionForStudent(aggregate);
    assert.equal(projection.valid, true);
    if (!projection.valid) return;
    assert.deepEqual(
      projection.value.categoryChoices?.map((choice) => choice.code),
      ["TRUE", "FALSE"],
    );
    assert.equal(projection.value.categoryStatements?.length, 2);
    const serialized = JSON.stringify(projection.value);
    assert.equal(serialized.includes("PRIVATE CATEGORY EXPLANATION SENTINEL"), false);
    assert.equal(serialized.includes("choice-1"), false);
    assert.equal(serialized.includes("choice-2"), false);
    for (const forbidden of [
      "categoryAnswers",
      "category_answers",
      "correctChoice",
      "isCorrect",
      "explanationBodyJson",
      "sourceReference",
      "createdBy",
      "reviewedBy",
      "verifiedBy",
    ]) {
      assert.equal(collectKeys(projection.value).has(forbidden), false, `projection contained ${forbidden}`);
    }
  });
  await t.test("non-PUBLISHED questions cannot be projected for students", () => {
    const projection = projectQuestionForStudent(makeAggregate("SINGLE_CHOICE", "VERIFIED"));
    assert.equal(projection.valid, false);
    if (!projection.valid) assert.ok(projection.issues.some((entry) => entry.code === "STUDENT_QUESTION_NOT_PUBLISHED"));
  });
  await t.test("invalid answer definitions cannot be projected", () => {
    const aggregate = makeAggregate("SINGLE_CHOICE", "PUBLISHED");
    aggregate.options = aggregate.options.map((option) => ({ ...option, isCorrect: false }));
    const projection = projectQuestionForStudent(aggregate);
    assert.equal(projection.valid, false);
    if (!projection.valid) assert.ok(projection.issues.some((entry) => entry.code === "ANSWER_SINGLE_CORRECT_COUNT_INVALID"));
  });
});
