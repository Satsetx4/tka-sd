import "server-only";

export const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTI_SELECT", "CATEGORY"] as const;
export const QUESTION_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "VERIFIED",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export type CognitiveLevel = "UNDERSTAND" | "APPLY" | "REASON";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type UsageType = "PRACTICE" | "ASSESSMENT" | "BOTH";
export type SourceType =
  | "OFFICIAL_REFERENCE"
  | "THIRD_PARTY_REFERENCE"
  | "ORIGINAL"
  | "REGENERATED";
export type StimulusType = "TEXT" | "IMAGE" | "TABLE" | "GRAPH" | "MIXED";
export type TimestampValue = Date | string;

/** Full question row data needed by the domain boundary; never send this to a client. */
export interface QuestionRecord {
  id: string;
  code: string;
  subjectId: string;
  domainId: string;
  topicId: string;
  primaryCompetencyId: string;
  primaryIndicatorId: string | null;
  stimulusId: string | null;
  questionType: QuestionType;
  cognitiveLevel: CognitiveLevel;
  difficulty: Difficulty;
  usageType: UsageType;
  questionBodyJson: unknown;
  explanationBodyJson: unknown;
  status: QuestionStatus;
  version: number;
  sourceType: SourceType;
  sourceReference: string | null;
  createdBy: string;
  reviewedBy: string | null;
  verifiedBy: string | null;
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
  publishedAt: TimestampValue | null;
  archivedAt: TimestampValue | null;
}

export interface QuestionOptionRecord {
  id: string;
  questionId: string;
  optionKey: string;
  bodyJson: unknown;
  isCorrect: boolean;
  sortOrder: number;
}

export interface CategoryStatementRecord {
  id: string;
  questionId: string;
  statementBodyJson: unknown;
  sortOrder: number;
}

export interface CategoryChoiceRecord {
  id: string;
  questionId: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface CategoryAnswerRecord {
  statementId: string;
  categoryChoiceId: string;
}

export interface QuestionTaxonomyMetadata {
  subject: { id: string } | null;
  domain: { id: string; subjectId: string } | null;
  topic: { id: string; domainId: string } | null;
  primaryCompetency: { id: string; subjectId: string } | null;
  primaryIndicator:
    | {
        id: string;
        subjectId: string;
        competencyId: string;
        topicId: string | null;
      }
    | null;
}

export interface QuestionStimulusMetadata {
  id: string;
  subjectId: string;
  title: string | null;
  stimulusType: StimulusType;
  bodyJson: unknown;
}

/** Complete in-memory aggregate. It includes correct-answer definitions and is server-only. */
export interface QuestionAggregate {
  question: QuestionRecord;
  options: readonly QuestionOptionRecord[];
  categoryStatements: readonly CategoryStatementRecord[];
  categoryChoices: readonly CategoryChoiceRecord[];
  categoryAnswers: readonly CategoryAnswerRecord[];
  taxonomy: QuestionTaxonomyMetadata;
  stimulus: QuestionStimulusMetadata | null;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: readonly ValidationIssue[];
}

export type NormalizedQuestionResponse =
  | { type: "SINGLE_CHOICE"; optionKey: string }
  | { type: "MULTI_SELECT"; optionKeys: readonly string[] }
  | {
      type: "CATEGORY";
      selections: readonly {
        statementId: string;
        categoryChoiceId: string;
      }[];
    };

export type QuestionEvaluationDetails =
  | { type: "SINGLE_CHOICE"; selectedOptionKey: string }
  | { type: "MULTI_SELECT"; selectedOptionKeys: readonly string[] }
  | {
      type: "CATEGORY";
      statements: readonly {
        statementId: string;
        selectedCategoryChoiceId: string | null;
        isCorrect: boolean;
      }[];
    };

export type QuestionEvaluation =
  | {
      valid: true;
      isCorrect: boolean;
      scoreFraction: number;
      normalizedResponse: NormalizedQuestionResponse;
      details: QuestionEvaluationDetails;
    }
  | { valid: false; issues: readonly ValidationIssue[] };

export interface StudentSafeQuestionProjection {
  questionId: string;
  code: string;
  type: QuestionType;
  bodyJson: unknown;
  stimulus: {
    title: string | null;
    type: StimulusType;
    bodyJson: unknown;
  } | null;
  options?: readonly {
    optionKey: string;
    bodyJson: unknown;
    sortOrder: number;
  }[];
  categoryStatements?: readonly {
    statementId: string;
    bodyJson: unknown;
    sortOrder: number;
  }[];
  categoryChoices?: readonly {
    code: string;
    label: string;
    sortOrder: number;
  }[];
}

export type StudentProjectionResult =
  | { valid: true; value: StudentSafeQuestionProjection }
  | { valid: false; issues: readonly ValidationIssue[] };

const COGNITIVE_LEVELS: readonly string[] = ["UNDERSTAND", "APPLY", "REASON"];
const DIFFICULTIES: readonly string[] = ["EASY", "MEDIUM", "HARD"];
const USAGE_TYPES: readonly string[] = ["PRACTICE", "ASSESSMENT", "BOTH"];
const SOURCE_TYPES: readonly string[] = [
  "OFFICIAL_REFERENCE",
  "THIRD_PARTY_REFERENCE",
  "ORIGINAL",
  "REGENERATED",
];
const STIMULUS_TYPES: readonly string[] = ["TEXT", "IMAGE", "TABLE", "GRAPH", "MIXED"];
const CONTENT_METADATA_KEYS = new Set([
  "type",
  "id",
  "key",
  "marks",
  "attrs",
  "style",
  "className",
  "level",
]);

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message };
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function result(issues: readonly ValidationIssue[]): ValidationResult {
  const unique = new Map<string, ValidationIssue>();
  for (const current of issues) {
    unique.set(`${current.code}\u0000${current.path}\u0000${current.message}`, current);
  }
  const ordered = [...unique.values()].sort((left, right) =>
    compareText(
      `${left.path}\u0000${left.code}\u0000${left.message}`,
      `${right.path}\u0000${right.code}\u0000${right.message}`,
    ),
  );
  return { valid: ordered.length === 0, issues: ordered };
}

function isNonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestampValue(value: unknown): boolean {
  if (value instanceof Date) return Number.isFinite(value.getTime());
  return isNonBlank(value);
}

/**
 * Conservative JSON content check: non-whitespace text must occur somewhere
 * outside known editor metadata keys. Empty objects/arrays and metadata-only
 * blocks are empty. Numeric and boolean leaves do not count as prose content.
 */
export function hasMeaningfulQuestionContent(value: unknown): boolean {
  const seen = new WeakSet<object>();

  function visit(current: unknown): boolean {
    if (typeof current === "string") return current.trim().length > 0;
    if (current === null || typeof current !== "object") return false;
    if (seen.has(current)) return false;
    seen.add(current);

    if (Array.isArray(current)) return current.some(visit);
    return Object.entries(current).some(
      ([key, child]) => !CONTENT_METADATA_KEYS.has(key) && visit(child),
    );
  }

  return visit(value);
}

function validateAggregateIntegrity(aggregate: QuestionAggregate): ValidationIssue[] {
  const { question } = aggregate;
  const issues: ValidationIssue[] = [];

  const requiredStrings: readonly [string, unknown][] = [
    ["question.id", question.id],
    ["question.code", question.code],
    ["question.subjectId", question.subjectId],
    ["question.domainId", question.domainId],
    ["question.topicId", question.topicId],
    ["question.primaryCompetencyId", question.primaryCompetencyId],
    ["question.createdBy", question.createdBy],
  ];
  for (const [path, value] of requiredStrings) {
    if (!isNonBlank(value)) {
      issues.push(issue("QUESTION_REQUIRED_FIELD_MISSING", path, "Required value must be present."));
    }
  }
  if (!isTimestampValue(question.createdAt)) {
    issues.push(issue("QUESTION_REQUIRED_FIELD_MISSING", "question.createdAt", "Creation timestamp must be present."));
  }
  if (!isTimestampValue(question.updatedAt)) {
    issues.push(issue("QUESTION_REQUIRED_FIELD_MISSING", "question.updatedAt", "Update timestamp must be present."));
  }
  if (question.primaryIndicatorId !== null && !isNonBlank(question.primaryIndicatorId)) {
    issues.push(issue("QUESTION_INDICATOR_ID_INVALID", "question.primaryIndicatorId", "Indicator reference must be null or non-empty."));
  }
  if (question.stimulusId !== null && !isNonBlank(question.stimulusId)) {
    issues.push(issue("QUESTION_STIMULUS_ID_INVALID", "question.stimulusId", "Stimulus reference must be null or non-empty."));
  }

  if (!QUESTION_TYPES.includes(question.questionType)) {
    issues.push(issue("QUESTION_TYPE_INVALID", "question.questionType", "Question type is unsupported."));
  }
  if (!QUESTION_STATUSES.includes(question.status)) {
    issues.push(issue("QUESTION_STATUS_INVALID", "question.status", "Question status is unsupported."));
  }
  if (!COGNITIVE_LEVELS.includes(question.cognitiveLevel)) {
    issues.push(
      issue("QUESTION_COGNITIVE_LEVEL_INVALID", "question.cognitiveLevel", "Cognitive level is unsupported."),
    );
  }
  if (!DIFFICULTIES.includes(question.difficulty)) {
    issues.push(issue("QUESTION_DIFFICULTY_INVALID", "question.difficulty", "Difficulty is unsupported."));
  }
  if (!USAGE_TYPES.includes(question.usageType)) {
    issues.push(issue("QUESTION_USAGE_TYPE_INVALID", "question.usageType", "Usage type is unsupported."));
  }
  if (!SOURCE_TYPES.includes(question.sourceType)) {
    issues.push(issue("QUESTION_SOURCE_TYPE_INVALID", "question.sourceType", "Source type is unsupported."));
  }
  if (!Number.isInteger(question.version) || question.version < 1) {
    issues.push(issue("QUESTION_VERSION_INVALID", "question.version", "Question version must be a positive integer."));
  }
  if (!hasMeaningfulQuestionContent(question.questionBodyJson)) {
    issues.push(issue("QUESTION_BODY_EMPTY", "question.questionBodyJson", "Question body must contain meaningful content."));
  }

  const optionIds = new Set<string>();
  const optionKeys = new Set<string>();
  const optionOrders = new Set<number>();
  for (const [index, option] of aggregate.options.entries()) {
    const path = `options[${index}]`;
    if (option.questionId !== question.id) {
      issues.push(issue("OPTION_QUESTION_MISMATCH", `${path}.questionId`, "Option belongs to another question."));
    }
    if (!isNonBlank(option.id) || optionIds.has(option.id)) {
      issues.push(issue("OPTION_ID_INVALID_OR_DUPLICATE", `${path}.id`, "Option id must be present and unique."));
    }
    if (!isNonBlank(option.optionKey) || optionKeys.has(option.optionKey)) {
      issues.push(
        issue("OPTION_KEY_INVALID_OR_DUPLICATE", `${path}.optionKey`, "Option key must be present and unique."),
      );
    }
    if (!Number.isInteger(option.sortOrder) || optionOrders.has(option.sortOrder)) {
      issues.push(
        issue("OPTION_SORT_ORDER_INVALID_OR_DUPLICATE", `${path}.sortOrder`, "Option order must be a unique integer."),
      );
    }
    if (typeof option.isCorrect !== "boolean") {
      issues.push(issue("OPTION_CORRECTNESS_INVALID", `${path}.isCorrect`, "Option correctness must be boolean."));
    }
    if (!hasMeaningfulQuestionContent(option.bodyJson)) {
      issues.push(issue("OPTION_BODY_EMPTY", `${path}.bodyJson`, "Option body must contain meaningful content."));
    }
    optionIds.add(option.id);
    optionKeys.add(option.optionKey);
    optionOrders.add(option.sortOrder);
  }

  const statementIds = new Set<string>();
  const statementOrders = new Set<number>();
  for (const [index, statement] of aggregate.categoryStatements.entries()) {
    const path = `categoryStatements[${index}]`;
    if (statement.questionId !== question.id) {
      issues.push(
        issue("CATEGORY_STATEMENT_QUESTION_MISMATCH", `${path}.questionId`, "Statement belongs to another question."),
      );
    }
    if (!isNonBlank(statement.id) || statementIds.has(statement.id)) {
      issues.push(
        issue("CATEGORY_STATEMENT_ID_INVALID_OR_DUPLICATE", `${path}.id`, "Statement id must be present and unique."),
      );
    }
    if (!Number.isInteger(statement.sortOrder) || statementOrders.has(statement.sortOrder)) {
      issues.push(
        issue(
          "CATEGORY_STATEMENT_SORT_ORDER_INVALID_OR_DUPLICATE",
          `${path}.sortOrder`,
          "Statement order must be a unique integer.",
        ),
      );
    }
    if (!hasMeaningfulQuestionContent(statement.statementBodyJson)) {
      issues.push(
        issue(
          "CATEGORY_STATEMENT_BODY_EMPTY",
          `${path}.statementBodyJson`,
          "Category statement must contain meaningful content.",
        ),
      );
    }
    statementIds.add(statement.id);
    statementOrders.add(statement.sortOrder);
  }

  const choiceIds = new Set<string>();
  const choiceCodes = new Set<string>();
  for (const [index, choice] of aggregate.categoryChoices.entries()) {
    const path = `categoryChoices[${index}]`;
    if (choice.questionId !== question.id) {
      issues.push(issue("CATEGORY_CHOICE_QUESTION_MISMATCH", `${path}.questionId`, "Choice belongs to another question."));
    }
    if (!isNonBlank(choice.id) || choiceIds.has(choice.id)) {
      issues.push(
        issue("CATEGORY_CHOICE_ID_INVALID_OR_DUPLICATE", `${path}.id`, "Category choice id must be present and unique."),
      );
    }
    if (!isNonBlank(choice.code) || choiceCodes.has(choice.code)) {
      issues.push(
        issue("CATEGORY_CHOICE_CODE_INVALID_OR_DUPLICATE", `${path}.code`, "Category choice code must be present and unique."),
      );
    }
    if (!isNonBlank(choice.label)) {
      issues.push(issue("CATEGORY_CHOICE_LABEL_MISSING", `${path}.label`, "Category choice label must be present."));
    }
    if (!Number.isInteger(choice.sortOrder)) {
      issues.push(issue("CATEGORY_CHOICE_SORT_ORDER_INVALID", `${path}.sortOrder`, "Category choice order must be an integer."));
    }
    choiceIds.add(choice.id);
    choiceCodes.add(choice.code);
  }

  const answerPairs = new Set<string>();
  for (const [index, answer] of aggregate.categoryAnswers.entries()) {
    const path = `categoryAnswers[${index}]`;
    const pairKey = `${answer.statementId}\u0000${answer.categoryChoiceId}`;
    if (answerPairs.has(pairKey)) {
      issues.push(issue("CATEGORY_ANSWER_DUPLICATE_PAIR", path, "Category answer pair must be unique."));
    }
    answerPairs.add(pairKey);

    const statement = aggregate.categoryStatements.find((row) => row.id === answer.statementId);
    if (!statement) {
      issues.push(
        issue("CATEGORY_ANSWER_STATEMENT_UNKNOWN", `${path}.statementId`, "Answer references a statement outside this aggregate."),
      );
    }
    const choice = aggregate.categoryChoices.find((row) => row.id === answer.categoryChoiceId);
    if (!choice) {
      issues.push(
        issue("CATEGORY_ANSWER_CHOICE_UNKNOWN", `${path}.categoryChoiceId`, "Answer references a choice outside this aggregate."),
      );
    } else if (choice.questionId !== question.id) {
      issues.push(
        issue(
          "CATEGORY_ANSWER_CHOICE_QUESTION_MISMATCH",
          `${path}.categoryChoiceId`,
          "Mapped category choice belongs to another question.",
        ),
      );
    }
  }

  return issues;
}

function validateTaxonomyAndStimulus(aggregate: QuestionAggregate): ValidationIssue[] {
  const { question, taxonomy, stimulus } = aggregate;
  const issues: ValidationIssue[] = [];

  if (!taxonomy.subject) {
    issues.push(issue("TAXONOMY_SUBJECT_MISSING", "taxonomy.subject", "Question subject relation is missing."));
  } else if (taxonomy.subject.id !== question.subjectId) {
    issues.push(issue("TAXONOMY_SUBJECT_ID_MISMATCH", "taxonomy.subject.id", "Subject relation does not match the question."));
  }

  if (!taxonomy.domain) {
    issues.push(issue("TAXONOMY_DOMAIN_MISSING", "taxonomy.domain", "Question domain relation is missing."));
  } else {
    if (taxonomy.domain.id !== question.domainId) {
      issues.push(issue("TAXONOMY_DOMAIN_ID_MISMATCH", "taxonomy.domain.id", "Domain relation does not match the question."));
    }
    if (taxonomy.domain.subjectId !== question.subjectId) {
      issues.push(
        issue("TAXONOMY_DOMAIN_SUBJECT_MISMATCH", "taxonomy.domain.subjectId", "Domain belongs to another subject."),
      );
    }
  }

  if (!taxonomy.topic) {
    issues.push(issue("TAXONOMY_TOPIC_MISSING", "taxonomy.topic", "Question topic relation is missing."));
  } else {
    if (taxonomy.topic.id !== question.topicId) {
      issues.push(issue("TAXONOMY_TOPIC_ID_MISMATCH", "taxonomy.topic.id", "Topic relation does not match the question."));
    }
    if (taxonomy.topic.domainId !== question.domainId) {
      issues.push(issue("TAXONOMY_TOPIC_DOMAIN_MISMATCH", "taxonomy.topic.domainId", "Topic belongs to another domain."));
    }
  }

  if (!taxonomy.primaryCompetency) {
    issues.push(
      issue("TAXONOMY_COMPETENCY_MISSING", "taxonomy.primaryCompetency", "Primary competency relation is missing."),
    );
  } else {
    if (taxonomy.primaryCompetency.id !== question.primaryCompetencyId) {
      issues.push(
        issue(
          "TAXONOMY_COMPETENCY_ID_MISMATCH",
          "taxonomy.primaryCompetency.id",
          "Primary competency relation does not match the question.",
        ),
      );
    }
    if (taxonomy.primaryCompetency.subjectId !== question.subjectId) {
      issues.push(
        issue(
          "TAXONOMY_COMPETENCY_SUBJECT_MISMATCH",
          "taxonomy.primaryCompetency.subjectId",
          "Primary competency belongs to another subject.",
        ),
      );
    }
  }

  if (question.primaryIndicatorId === null) {
    if (taxonomy.primaryIndicator !== null) {
      issues.push(
        issue(
          "TAXONOMY_INDICATOR_ID_MISMATCH",
          "taxonomy.primaryIndicator",
          "Indicator metadata exists but the question has no primary indicator reference.",
        ),
      );
    }
  } else if (!taxonomy.primaryIndicator) {
    issues.push(
      issue("TAXONOMY_INDICATOR_MISSING", "taxonomy.primaryIndicator", "Primary indicator relation is missing."),
    );
  } else {
    if (taxonomy.primaryIndicator.id !== question.primaryIndicatorId) {
      issues.push(
        issue("TAXONOMY_INDICATOR_ID_MISMATCH", "taxonomy.primaryIndicator.id", "Indicator relation does not match the question."),
      );
    }
    if (taxonomy.primaryIndicator.subjectId !== question.subjectId) {
      issues.push(
        issue("TAXONOMY_INDICATOR_SUBJECT_MISMATCH", "taxonomy.primaryIndicator.subjectId", "Indicator belongs to another subject."),
      );
    }
    if (taxonomy.primaryIndicator.competencyId !== question.primaryCompetencyId) {
      issues.push(
        issue(
          "TAXONOMY_INDICATOR_COMPETENCY_MISMATCH",
          "taxonomy.primaryIndicator.competencyId",
          "Indicator points to another competency.",
        ),
      );
    }
    if (taxonomy.primaryIndicator.topicId !== null && taxonomy.primaryIndicator.topicId !== question.topicId) {
      issues.push(
        issue("TAXONOMY_INDICATOR_TOPIC_MISMATCH", "taxonomy.primaryIndicator.topicId", "Indicator points to another topic."),
      );
    }
  }

  if (question.stimulusId === null) {
    if (stimulus !== null) {
      issues.push(
        issue("STIMULUS_ID_MISMATCH", "stimulus.id", "Stimulus metadata exists but the question has no stimulus reference."),
      );
    }
  } else if (!stimulus) {
    issues.push(issue("STIMULUS_METADATA_MISSING", "stimulus", "Question stimulus relation is missing."));
  } else {
    if (stimulus.id !== question.stimulusId) {
      issues.push(issue("STIMULUS_ID_MISMATCH", "stimulus.id", "Stimulus metadata does not match the question."));
    }
    if (stimulus.subjectId !== question.subjectId) {
      issues.push(issue("STIMULUS_SUBJECT_MISMATCH", "stimulus.subjectId", "Stimulus belongs to another subject."));
    }
    if (!STIMULUS_TYPES.includes(stimulus.stimulusType)) {
      issues.push(issue("STIMULUS_TYPE_INVALID", "stimulus.stimulusType", "Stimulus type is unsupported."));
    }
  }

  return issues;
}

function validateTypeAnswerDefinition(aggregate: QuestionAggregate): ValidationIssue[] {
  const { question } = aggregate;
  const issues: ValidationIssue[] = [];

  if (question.questionType === "SINGLE_CHOICE") {
    if (aggregate.options.length === 0) {
      issues.push(issue("ANSWER_OPTIONS_REQUIRED", "options", "SINGLE_CHOICE requires at least one option."));
    }
    const correctCount = aggregate.options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      issues.push(
        issue(
          "ANSWER_SINGLE_CORRECT_COUNT_INVALID",
          "options.isCorrect",
          "SINGLE_CHOICE requires exactly one correct option.",
        ),
      );
    }
    if (aggregate.categoryAnswers.length > 0) {
      issues.push(
        issue(
          "ANSWER_CATEGORY_ROWS_NOT_ALLOWED",
          "categoryAnswers",
          "SINGLE_CHOICE cannot use CATEGORY answer rows as its answer definition.",
        ),
      );
    }
  } else if (question.questionType === "MULTI_SELECT") {
    if (aggregate.options.length === 0) {
      issues.push(issue("ANSWER_OPTIONS_REQUIRED", "options", "MULTI_SELECT requires at least one option."));
    }
    const correctCount = aggregate.options.filter((option) => option.isCorrect).length;
    if (correctCount <= 1) {
      issues.push(
        issue(
          "ANSWER_MULTI_CORRECT_COUNT_INVALID",
          "options.isCorrect",
          "MULTI_SELECT requires more than one correct option.",
        ),
      );
    }
    if (aggregate.categoryAnswers.length > 0) {
      issues.push(
        issue(
          "ANSWER_CATEGORY_ROWS_NOT_ALLOWED",
          "categoryAnswers",
          "MULTI_SELECT cannot use CATEGORY answer rows as its answer definition.",
        ),
      );
    }
  } else if (question.questionType === "CATEGORY") {
    if (aggregate.categoryStatements.length === 0) {
      issues.push(
        issue("ANSWER_CATEGORY_STATEMENTS_REQUIRED", "categoryStatements", "CATEGORY requires at least one statement."),
      );
    }
    if (aggregate.categoryChoices.length === 0) {
      issues.push(issue("ANSWER_CATEGORY_CHOICES_REQUIRED", "categoryChoices", "CATEGORY requires at least one choice."));
    }

    const mappingCounts = new Map<string, number>();
    for (const answer of aggregate.categoryAnswers) {
      if (aggregate.categoryStatements.some((statement) => statement.id === answer.statementId)) {
        mappingCounts.set(answer.statementId, (mappingCounts.get(answer.statementId) ?? 0) + 1);
      }
    }
    for (const statement of aggregate.categoryStatements) {
      const count = mappingCounts.get(statement.id) ?? 0;
      if (count !== 1) {
        issues.push(
          issue(
            "ANSWER_CATEGORY_MAPPING_COUNT_INVALID",
            `categoryStatements.${statement.id}`,
            "Each CATEGORY statement must have exactly one answer mapping.",
          ),
        );
      }
    }
  } else {
    issues.push(issue("QUESTION_TYPE_INVALID", "question.questionType", "Question type is unsupported."));
  }

  return issues;
}

/** Validates the answer definition without repairing or mutating the aggregate. */
export function validateAnswerDefinition(aggregate: QuestionAggregate): ValidationResult {
  return result([...validateAggregateIntegrity(aggregate), ...validateTypeAnswerDefinition(aggregate)]);
}

/** Checks structural, taxonomy, answer, and conservative content readiness for publishing. */
export function validateQuestionForPublish(aggregate: QuestionAggregate): ValidationResult {
  const issues = [
    ...validateAggregateIntegrity(aggregate),
    ...validateTaxonomyAndStimulus(aggregate),
    ...validateTypeAnswerDefinition(aggregate),
  ];
  if (!hasMeaningfulQuestionContent(aggregate.question.explanationBodyJson)) {
    issues.push(
      issue(
        "QUESTION_EXPLANATION_EMPTY",
        "question.explanationBodyJson",
        "Published questions require meaningful explanation content.",
      ),
    );
  }
  return result(issues);
}

/**
 * Same-status requests are rejected as no-ops. Only the next forward stage is
 * allowed, and VERIFIED -> PUBLISHED additionally requires publish readiness.
 */
export function validateQuestionStatusTransition(
  aggregate: QuestionAggregate,
  nextStatus: QuestionStatus,
): ValidationResult {
  const currentIndex = QUESTION_STATUSES.indexOf(aggregate.question.status);
  const nextIndex = QUESTION_STATUSES.indexOf(nextStatus);

  if (currentIndex < 0 || nextIndex < 0) {
    return result([issue("STATUS_INVALID", "question.status", "Current and target statuses must be supported values.")]);
  }
  if (currentIndex === nextIndex) {
    return result([issue("STATUS_TRANSITION_NOOP", "question.status", "A same-status request is not a workflow transition.")]);
  }
  if (aggregate.question.status === "ARCHIVED") {
    return result([issue("STATUS_TRANSITION_TERMINAL", "question.status", "ARCHIVED is a terminal question status.")]);
  }
  if (nextIndex < currentIndex) {
    return result([issue("STATUS_TRANSITION_BACKWARD", "question.status", "Backward status transitions are not allowed.")]);
  }
  if (nextIndex !== currentIndex + 1) {
    return result([issue("STATUS_TRANSITION_SKIPPED", "question.status", "Status transitions cannot skip workflow stages.")]);
  }
  if (nextStatus === "PUBLISHED") {
    const readiness = validateQuestionForPublish(aggregate);
    if (!readiness.valid) {
      return result([
        issue(
          "STATUS_PUBLISH_REQUIRES_READY_QUESTION",
          "question.status",
          "Question is not ready to publish.",
        ),
        ...readiness.issues,
      ]);
    }
  }
  return result([]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === [...expected].sort()[index]);
}

function invalidResponse(code: string, path: string, message: string): QuestionEvaluation {
  return { valid: false, issues: [issue(code, path, message)] };
}

/**
 * Evaluates an internal normalized response. These types are not a frozen HTTP
 * contract. Results deliberately omit correct option keys and explanations.
 */
export function evaluateQuestionResponse(
  aggregate: QuestionAggregate,
  input: unknown,
): QuestionEvaluation {
  if (aggregate.question.status !== "PUBLISHED") {
    return invalidResponse(
      "EVALUATION_QUESTION_NOT_PUBLISHED",
      "question.status",
      "Students can evaluate only PUBLISHED questions.",
    );
  }
  const readiness = validateQuestionForPublish(aggregate);
  if (!readiness.valid) return { valid: false, issues: readiness.issues };
  if (!isRecord(input) || typeof input.type !== "string") {
    return invalidResponse("RESPONSE_SHAPE_INVALID", "response", "Response must be a normalized object with a type.");
  }
  if (input.type !== aggregate.question.questionType) {
    return invalidResponse("RESPONSE_TYPE_MISMATCH", "response.type", "Response type does not match the question type.");
  }

  if (aggregate.question.questionType === "SINGLE_CHOICE") {
    if (!hasExactKeys(input, ["type", "optionKey"]) || !isNonBlank(input.optionKey)) {
      return invalidResponse("RESPONSE_SHAPE_INVALID", "response", "SINGLE_CHOICE response requires one optionKey only.");
    }
    const selected = aggregate.options.find((option) => option.optionKey === input.optionKey);
    if (!selected) {
      return invalidResponse("RESPONSE_OPTION_UNKNOWN", "response.optionKey", "Selected option is not part of this question.");
    }
    return {
      valid: true,
      isCorrect: selected.isCorrect,
      scoreFraction: selected.isCorrect ? 1 : 0,
      normalizedResponse: { type: "SINGLE_CHOICE", optionKey: selected.optionKey },
      details: { type: "SINGLE_CHOICE", selectedOptionKey: selected.optionKey },
    };
  }

  if (aggregate.question.questionType === "MULTI_SELECT") {
    if (
      !hasExactKeys(input, ["type", "optionKeys"]) ||
      !Array.isArray(input.optionKeys) ||
      !input.optionKeys.every(isNonBlank)
    ) {
      return invalidResponse("RESPONSE_SHAPE_INVALID", "response", "MULTI_SELECT response requires an optionKeys array only.");
    }
    const selectedKeys = input.optionKeys as string[];
    if (new Set(selectedKeys).size !== selectedKeys.length) {
      return invalidResponse("RESPONSE_OPTION_DUPLICATE", "response.optionKeys", "MULTI_SELECT selections cannot contain duplicates.");
    }
    const knownKeys = new Set(aggregate.options.map((option) => option.optionKey));
    const unknownKey = selectedKeys.find((optionKey) => !knownKeys.has(optionKey));
    if (unknownKey !== undefined) {
      return invalidResponse("RESPONSE_OPTION_UNKNOWN", "response.optionKeys", "A selected option is not part of this question.");
    }
    const normalizedKeys = [...selectedKeys].sort(compareText);
    const correctKeys = aggregate.options
      .filter((option) => option.isCorrect)
      .map((option) => option.optionKey)
      .sort(compareText);
    const isCorrect =
      normalizedKeys.length === correctKeys.length &&
      normalizedKeys.every((optionKey, index) => optionKey === correctKeys[index]);
    return {
      valid: true,
      isCorrect,
      scoreFraction: isCorrect ? 1 : 0,
      normalizedResponse: { type: "MULTI_SELECT", optionKeys: normalizedKeys },
      details: { type: "MULTI_SELECT", selectedOptionKeys: normalizedKeys },
    };
  }

  if (!hasExactKeys(input, ["type", "selections"]) || !Array.isArray(input.selections)) {
    return invalidResponse("RESPONSE_SHAPE_INVALID", "response", "CATEGORY response requires a selections array only.");
  }

  const selections: { statementId: string; categoryChoiceId: string }[] = [];
  const selectedStatements = new Set<string>();
  const statementIds = new Set(aggregate.categoryStatements.map((statement) => statement.id));
  const choicesById = new Map(aggregate.categoryChoices.map((choice) => [choice.id, choice]));
  for (const [index, selection] of input.selections.entries()) {
    const path = `response.selections[${index}]`;
    if (
      !isRecord(selection) ||
      !hasExactKeys(selection, ["statementId", "categoryChoiceId"]) ||
      !isNonBlank(selection.statementId) ||
      !isNonBlank(selection.categoryChoiceId)
    ) {
      return invalidResponse("RESPONSE_SHAPE_INVALID", path, "Each CATEGORY selection requires statementId and categoryChoiceId only.");
    }
    if (!statementIds.has(selection.statementId)) {
      return invalidResponse("RESPONSE_STATEMENT_UNKNOWN", `${path}.statementId`, "Statement is not part of this question.");
    }
    const choice = choicesById.get(selection.categoryChoiceId);
    if (!choice) {
      return invalidResponse("RESPONSE_CHOICE_UNKNOWN", `${path}.categoryChoiceId`, "Choice is not part of this question.");
    }
    if (choice.questionId !== aggregate.question.id) {
      return invalidResponse(
        "RESPONSE_CHOICE_QUESTION_MISMATCH",
        `${path}.categoryChoiceId`,
        "Selected choice belongs to another question.",
      );
    }
    if (selectedStatements.has(selection.statementId)) {
      return invalidResponse(
        "RESPONSE_STATEMENT_DUPLICATE",
        `${path}.statementId`,
        "A CATEGORY response can select only one choice per statement.",
      );
    }
    selectedStatements.add(selection.statementId);
    selections.push({ statementId: selection.statementId, categoryChoiceId: selection.categoryChoiceId });
  }

  const correctChoiceByStatement = new Map(
    aggregate.categoryAnswers.map((answer) => [answer.statementId, answer.categoryChoiceId]),
  );
  const orderedStatements = [...aggregate.categoryStatements].sort(
    (left, right) => left.sortOrder - right.sortOrder || compareText(left.id, right.id),
  );
  const selectionByStatement = new Map(selections.map((selection) => [selection.statementId, selection.categoryChoiceId]));
  const statementDetails = orderedStatements.map((statement) => {
    const selectedCategoryChoiceId = selectionByStatement.get(statement.id) ?? null;
    return {
      statementId: statement.id,
      selectedCategoryChoiceId,
      isCorrect: selectedCategoryChoiceId !== null &&
        selectedCategoryChoiceId === correctChoiceByStatement.get(statement.id),
    };
  });
  const correctCount = statementDetails.filter((statement) => statement.isCorrect).length;
  const totalStatements = orderedStatements.length;
  const isCorrect = correctCount === totalStatements;
  const normalizedSelections = [...selections].sort((left, right) => {
    const leftStatement = aggregate.categoryStatements.find((row) => row.id === left.statementId);
    const rightStatement = aggregate.categoryStatements.find((row) => row.id === right.statementId);
    return (leftStatement?.sortOrder ?? 0) - (rightStatement?.sortOrder ?? 0) ||
      compareText(left.statementId, right.statementId);
  });

  return {
    valid: true,
    isCorrect,
    scoreFraction: correctCount / totalStatements,
    normalizedResponse: { type: "CATEGORY", selections: normalizedSelections },
    details: { type: "CATEGORY", statements: statementDetails },
  };
}

/**
 * Creates a pre-answer projection only for a published, publish-ready question.
 * Answer definitions, explanations, provenance, and editorial fields are omitted.
 */
export function projectQuestionForStudent(aggregate: QuestionAggregate): StudentProjectionResult {
  const issues: ValidationIssue[] = [];
  if (aggregate.question.status !== "PUBLISHED") {
    issues.push(
      issue("STUDENT_QUESTION_NOT_PUBLISHED", "question.status", "Students can use only PUBLISHED questions."),
    );
  }
  const readiness = validateQuestionForPublish(aggregate);
  issues.push(...readiness.issues);
  const checked = result(issues);
  if (!checked.valid) return { valid: false, issues: checked.issues };

  const stimulus = aggregate.stimulus
    ? {
        title: aggregate.stimulus.title,
        type: aggregate.stimulus.stimulusType,
        bodyJson: aggregate.stimulus.bodyJson,
      }
    : null;
  const common = {
    questionId: aggregate.question.id,
    code: aggregate.question.code,
    type: aggregate.question.questionType,
    bodyJson: aggregate.question.questionBodyJson,
    stimulus,
  };

  if (aggregate.question.questionType === "CATEGORY") {
    return {
      valid: true,
      value: {
        ...common,
        categoryStatements: [...aggregate.categoryStatements]
          .sort((left, right) => left.sortOrder - right.sortOrder || compareText(left.id, right.id))
          .map((statement) => ({
            statementId: statement.id,
            bodyJson: statement.statementBodyJson,
            sortOrder: statement.sortOrder,
          })),
        categoryChoices: [...aggregate.categoryChoices]
          .sort((left, right) => left.sortOrder - right.sortOrder || compareText(left.code, right.code))
          .map((choice) => ({ code: choice.code, label: choice.label, sortOrder: choice.sortOrder })),
      },
    };
  }

  return {
    valid: true,
    value: {
      ...common,
      options: [...aggregate.options]
        .sort((left, right) => left.sortOrder - right.sortOrder || compareText(left.optionKey, right.optionKey))
        .map((option) => ({
          optionKey: option.optionKey,
          bodyJson: option.bodyJson,
          sortOrder: option.sortOrder,
        })),
    },
  };
}
