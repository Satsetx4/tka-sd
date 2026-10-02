import "server-only";

import { createHash } from "node:crypto";
import {
  validateQuestionForPublish,
  type NormalizedQuestionResponse,
  type QuestionAggregate,
  type QuestionStatus,
  type UsageType,
} from "../questions/domain";

export const PRACTICE_SESSION_STATUSES = ["ACTIVE", "COMPLETED", "ABANDONED"] as const;
export type PracticeSessionStatus = (typeof PRACTICE_SESSION_STATUSES)[number];

export type PracticeErrorCode =
  | "INVALID_INPUT"
  | "INSUFFICIENT_QUESTIONS"
  | "INVALID_CANDIDATE"
  | "INVALID_QUESTION"
  | "INVALID_RESPONSE"
  | "CATEGORY_CHOICE_UNKNOWN"
  | "CATEGORY_CHOICE_AMBIGUOUS"
  | "CATEGORY_STATEMENT_UNKNOWN"
  | "CATEGORY_STATEMENT_DUPLICATE"
  | "NOT_FOUND_OR_FORBIDDEN"
  | "SESSION_NOT_ACTIVE"
  | "QUESTION_NOT_IN_SNAPSHOT"
  | "ANSWER_CONFLICT"
  | "ANSWER_ALREADY_PERSISTED"
  | "SESSION_STATE_INCONSISTENT"
  | "INTERNAL_ERROR";

export interface PracticeError {
  code: PracticeErrorCode;
  message: string;
  field?: string;
}

export type PracticeResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PracticeError };

export interface PracticeActor {
  parentUserId: string;
}

export interface PracticeStartRequest {
  childProfileId: string;
  subjectId: string;
  topicId?: string;
  questionTarget: number;
}

export interface PracticeSelectionScope {
  subjectId: string;
  topicId?: string | null;
  questionTarget: number;
}

export interface PracticeCandidateMetadata {
  questionId: string;
  status: QuestionStatus;
  usageType: UsageType;
  subjectId: string;
  topicId: string;
  exposureCount: number;
}

export interface PracticeSnapshotItem {
  questionId: string;
  position: number;
}

export type PracticeAnswerInput =
  | { type: "SINGLE_CHOICE"; optionKey: string }
  | { type: "MULTI_SELECT"; optionKeys: readonly string[] }
  | {
      type: "CATEGORY";
      selections: readonly { statementId: string; categoryChoiceCode: string }[];
    };

export type NormalizedPracticeResponse = NormalizedQuestionResponse;

function failure<T = never>(
  code: PracticeErrorCode,
  message: string,
  field?: string,
): PracticeResult<T> {
  return {
    ok: false,
    error: { code, message, ...(field ? { field } : {}) },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return keys.length === sortedExpected.length && keys.every((key, index) => key === sortedExpected[index]);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function validatePracticeActor(input: unknown): PracticeResult<PracticeActor> {
  if (!isRecord(input) || !isNonBlankString(input.parentUserId)) {
    return failure("INVALID_INPUT", "An authenticated parent user ID is required.", "parentUserId");
  }
  return { ok: true, value: { parentUserId: input.parentUserId } };
}

export function validatePracticeStartRequest(input: unknown): PracticeResult<PracticeStartRequest> {
  if (
    !isRecord(input) ||
    !isNonBlankString(input.childProfileId) ||
    !isNonBlankString(input.subjectId) ||
    !Number.isInteger(input.questionTarget) ||
    (input.questionTarget as number) <= 0
  ) {
    return failure(
      "INVALID_INPUT",
      "childProfileId, subjectId, and a positive integer questionTarget are required.",
      "startRequest",
    );
  }

  if (
    input.topicId !== undefined &&
    input.topicId !== null &&
    !isNonBlankString(input.topicId)
  ) {
    return failure("INVALID_INPUT", "topicId must be a non-empty ID when provided.", "topicId");
  }

  return {
    ok: true,
    value: {
      childProfileId: input.childProfileId,
      subjectId: input.subjectId,
      ...(isNonBlankString(input.topicId) ? { topicId: input.topicId } : {}),
      questionTarget: input.questionTarget as number,
    },
  };
}

export function isEligiblePracticeCandidate(
  candidate: PracticeCandidateMetadata,
  scope: PracticeSelectionScope,
): boolean {
  return (
    candidate.status === "PUBLISHED" &&
    (candidate.usageType === "PRACTICE" || candidate.usageType === "BOTH") &&
    candidate.subjectId === scope.subjectId &&
    (scope.topicId === undefined ||
      scope.topicId === null ||
      candidate.topicId === scope.topicId)
  );
}

function stableSeedRank(seed: string, questionId: string): string {
  return createHash("sha256").update(seed).update("\u0000").update(questionId).digest("hex");
}

/**
 * Selects eligible IDs by ascending persisted-answer exposure, then SHA-256
 * rank of seed + NUL + questionId. The session UUID is the intended seed.
 */
export function selectPracticeSnapshot(
  seed: string,
  candidates: readonly PracticeCandidateMetadata[],
  scope: PracticeSelectionScope,
): PracticeResult<readonly PracticeSnapshotItem[]> {
  if (!isNonBlankString(seed)) {
    return failure("INVALID_INPUT", "A non-empty deterministic selection seed is required.", "seed");
  }
  if (
    !isNonBlankString(scope.subjectId) ||
    !Number.isInteger(scope.questionTarget) ||
    scope.questionTarget <= 0
  ) {
    return failure("INVALID_INPUT", "A subject and positive integer target are required.", "scope");
  }

  const eligible = candidates.filter((candidate) => isEligiblePracticeCandidate(candidate, scope));
  const seen = new Set<string>();
  for (const candidate of eligible) {
    if (
      !isNonBlankString(candidate.questionId) ||
      !Number.isInteger(candidate.exposureCount) ||
      candidate.exposureCount < 0 ||
      seen.has(candidate.questionId)
    ) {
      return failure("INVALID_CANDIDATE", "Candidate metadata is incomplete or duplicated.");
    }
    seen.add(candidate.questionId);
  }

  if (eligible.length < scope.questionTarget) {
    return failure(
      "INSUFFICIENT_QUESTIONS",
      "There are not enough published, practice-ready questions for this request.",
      "questionTarget",
    );
  }

  const ordered = [...eligible].sort((left, right) => {
    const exposure = left.exposureCount - right.exposureCount;
    if (exposure !== 0) return exposure;
    const rank = compareText(
      stableSeedRank(seed, left.questionId),
      stableSeedRank(seed, right.questionId),
    );
    return rank || compareText(left.questionId, right.questionId);
  });

  return {
    ok: true,
    value: ordered.slice(0, scope.questionTarget).map((candidate, index) => ({
      questionId: candidate.questionId,
      position: index + 1,
    })),
  };
}

export function canTransitionPracticeSession(
  current: PracticeSessionStatus,
  next: PracticeSessionStatus,
): boolean {
  return current === "ACTIVE" && (next === "COMPLETED" || next === "ABANDONED");
}

export function transitionPracticeSession(
  current: PracticeSessionStatus,
  next: PracticeSessionStatus,
): PracticeResult<PracticeSessionStatus> {
  if (!canTransitionPracticeSession(current, next)) {
    return failure("SESSION_NOT_ACTIVE", "Only an ACTIVE practice session can become terminal.");
  }
  return { ok: true, value: next };
}

export function validatePracticeResponseTimeMs(
  value: unknown,
): PracticeResult<number | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (
    !Number.isInteger(value) ||
    (value as number) < 0 ||
    (value as number) > 2_147_483_647
  ) {
    return failure(
      "INVALID_INPUT",
      "responseTimeMs must be a non-negative integer supported by the database when provided.",
      "responseTimeMs",
    );
  }
  return { ok: true, value: value as number };
}

export function normalizePracticeResponse(
  aggregate: QuestionAggregate,
  input: unknown,
): PracticeResult<NormalizedPracticeResponse> {
  if (aggregate.question.status !== "PUBLISHED" || !validateQuestionForPublish(aggregate).valid) {
    return failure("INVALID_QUESTION", "Only complete, publish-ready questions can be answered.");
  }
  if (!isRecord(input) || typeof input.type !== "string") {
    return failure("INVALID_RESPONSE", "Response must identify its question type.", "response");
  }

  if (input.type === "SINGLE_CHOICE") {
    if (
      aggregate.question.questionType !== "SINGLE_CHOICE" ||
      !hasExactKeys(input, ["type", "optionKey"]) ||
      !isNonBlankString(input.optionKey)
    ) {
      return failure("INVALID_RESPONSE", "A single-choice response requires one optionKey.", "response");
    }
    if (!aggregate.options.some((option) => option.optionKey === input.optionKey)) {
      return failure("INVALID_RESPONSE", "Selected option is not part of this question.", "optionKey");
    }
    return {
      ok: true,
      value: { type: "SINGLE_CHOICE", optionKey: input.optionKey },
    };
  }

  if (input.type === "MULTI_SELECT") {
    if (
      aggregate.question.questionType !== "MULTI_SELECT" ||
      !hasExactKeys(input, ["type", "optionKeys"]) ||
      !Array.isArray(input.optionKeys) ||
      !input.optionKeys.every(isNonBlankString)
    ) {
      return failure("INVALID_RESPONSE", "A multi-select response requires optionKeys.", "response");
    }
    const keys = input.optionKeys as string[];
    if (new Set(keys).size !== keys.length) {
      return failure("INVALID_RESPONSE", "MULTI_SELECT optionKeys cannot contain duplicates.", "optionKeys");
    }
    const knownKeys = new Set(aggregate.options.map((option) => option.optionKey));
    if (keys.some((key) => !knownKeys.has(key))) {
      return failure("INVALID_RESPONSE", "A selected option is not part of this question.", "optionKeys");
    }
    return {
      ok: true,
      value: { type: "MULTI_SELECT", optionKeys: [...keys].sort(compareText) },
    };
  }

  if (
    input.type !== "CATEGORY" ||
    aggregate.question.questionType !== "CATEGORY" ||
    !hasExactKeys(input, ["type", "selections"]) ||
    !Array.isArray(input.selections)
  ) {
    return failure("INVALID_RESPONSE", "Response type does not match the question.", "response.type");
  }

  const statements = new Map(aggregate.categoryStatements.map((statement) => [statement.id, statement]));
  const choiceIds = new Set<string>();
  const choiceCodes = new Set<string>();
  for (const choice of aggregate.categoryChoices) {
    if (
      choice.questionId !== aggregate.question.id ||
      choiceIds.has(choice.id) ||
      choiceCodes.has(choice.code)
    ) {
      return failure("INVALID_QUESTION", "CATEGORY choices are duplicated or belong to another question.");
    }
    choiceIds.add(choice.id);
    choiceCodes.add(choice.code);
  }

  const selectedStatements = new Set<string>();
  const selections: { statementId: string; categoryChoiceId: string }[] = [];
  for (const [index, selection] of input.selections.entries()) {
    if (
      !isRecord(selection) ||
      !hasExactKeys(selection, ["statementId", "categoryChoiceCode"]) ||
      !isNonBlankString(selection.statementId) ||
      !isNonBlankString(selection.categoryChoiceCode)
    ) {
      return failure(
        "INVALID_RESPONSE",
        "Each CATEGORY selection requires statementId and categoryChoiceCode only.",
        "selections[" + index + "]",
      );
    }
    if (!statements.has(selection.statementId)) {
      return failure(
        "CATEGORY_STATEMENT_UNKNOWN",
        "Statement is not part of this question.",
        "selections[" + index + "].statementId",
      );
    }
    if (selectedStatements.has(selection.statementId)) {
      return failure(
        "CATEGORY_STATEMENT_DUPLICATE",
        "A CATEGORY response can select only one choice per statement.",
        "selections[" + index + "].statementId",
      );
    }
    selectedStatements.add(selection.statementId);

    const matchingChoices = aggregate.categoryChoices.filter(
      (choice) =>
        choice.questionId === aggregate.question.id &&
        choice.code === selection.categoryChoiceCode,
    );
    if (matchingChoices.length === 0) {
      return failure(
        "CATEGORY_CHOICE_UNKNOWN",
        "Choice code is not part of this question.",
        "selections[" + index + "].categoryChoiceCode",
      );
    }
    if (matchingChoices.length !== 1) {
      return failure(
        "CATEGORY_CHOICE_AMBIGUOUS",
        "Choice code does not uniquely identify a choice for this question.",
        "selections[" + index + "].categoryChoiceCode",
      );
    }
    selections.push({
      statementId: selection.statementId,
      categoryChoiceId: matchingChoices[0]!.id,
    });
  }

  selections.sort((left, right) => {
    const leftOrder = statements.get(left.statementId)!.sortOrder;
    const rightOrder = statements.get(right.statementId)!.sortOrder;
    return leftOrder - rightOrder || compareText(left.statementId, right.statementId);
  });
  return {
    ok: true,
    value: { type: "CATEGORY", selections },
  };
}

function canonicalResponse(response: NormalizedPracticeResponse): NormalizedPracticeResponse {
  if (response.type === "SINGLE_CHOICE") {
    return { type: "SINGLE_CHOICE", optionKey: response.optionKey };
  }
  if (response.type === "MULTI_SELECT") {
    return {
      type: "MULTI_SELECT",
      optionKeys: [...new Set(response.optionKeys)].sort(compareText),
    };
  }
  return {
    type: "CATEGORY",
    selections: [...response.selections]
      .map((selection) => ({
        statementId: selection.statementId,
        categoryChoiceId: selection.categoryChoiceId,
      }))
      .sort(
        (left, right) =>
          compareText(left.statementId, right.statementId) ||
          compareText(left.categoryChoiceId, right.categoryChoiceId),
      ),
  };
}

/** Compare evaluator-normalized responses; array ordering does not change meaning. */
export function arePracticeResponsesSemanticallyEqual(
  left: NormalizedPracticeResponse,
  right: NormalizedPracticeResponse,
): boolean {
  return JSON.stringify(canonicalResponse(left)) === JSON.stringify(canonicalResponse(right));
}

export interface PracticeSnapshotNavigationItem {
  questionId: string;
  position: number;
}

export function getNextUnansweredPracticeItem(
  items: readonly PracticeSnapshotNavigationItem[],
  answeredQuestionIds: ReadonlySet<string>,
): PracticeSnapshotNavigationItem | null {
  return (
    [...items]
      .sort(
        (left, right) =>
          left.position - right.position || compareText(left.questionId, right.questionId),
      )
      .find((item) => !answeredQuestionIds.has(item.questionId)) ?? null
  );
}
