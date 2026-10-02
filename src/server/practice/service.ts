import "server-only";

import { randomUUID } from "node:crypto";
import {
  evaluateQuestionResponse,
  projectQuestionForStudent,
  type NormalizedQuestionResponse,
  type QuestionAggregate,
  type QuestionEvaluation,
  type StudentSafeQuestionProjection,
} from "../questions/domain";
import {
  arePracticeResponsesSemanticallyEqual,
  getNextUnansweredPracticeItem,
  normalizePracticeResponse,
  selectPracticeSnapshot,
  validatePracticeActor,
  validatePracticeResponseTimeMs,
  validatePracticeStartRequest,
  type NormalizedPracticeResponse,
  type PracticeAnswerInput,
  type PracticeActor,
  type PracticeErrorCode,
  type PracticeResult,
} from "./domain";
import {
  abandonPracticeSessionRow,
  countPracticeAnswers,
  getOwnedPracticeSession,
  getPracticeAnswer,
  insertPracticeAnswer,
  insertPracticeSessionAndItems,
  listPracticeCandidates,
  listPracticeSnapshotItems,
  loadQuestionAggregate,
  lockOwnedChild,
  lockOwnedPracticeSession,
  topicBelongsToSubject,
  updatePracticeSessionAfterAnswer,
  withPracticeTransaction,
  type PracticeCandidateRow,
  type PracticeSessionRow,
} from "./repository";

type SuccessfulEvaluation = Extract<QuestionEvaluation, { valid: true }>;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validatePracticeIds(
  values: readonly (readonly [field: string, value: string])[],
): PracticeResult<true> {
  for (const [field, value] of values) {
    if (!UUID_PATTERN.test(value)) {
      return failure("INVALID_INPUT", `${field} must be a UUID.`, field);
    }
  }
  return { ok: true, value: true };
}

function compareStableText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export interface PracticeSessionView {
  id: string;
  subjectId: string;
  topicId: string | null;
  status: PracticeSessionRow["status"];
  questionTarget: number;
  questionsAnswered: number;
  correctCount: number;
  startedAt: Date;
  completedAt: Date | null;
  lastActivityAt: Date;
}

export interface PracticeSessionItemView {
  questionId: string;
  position: number;
  answered: boolean;
}

export interface PracticeSessionResult {
  session: PracticeSessionView;
  items: readonly PracticeSessionItemView[];
}

export interface PracticeQuestionResult {
  session: PracticeSessionView;
  item: { questionId: string; position: number };
  question: StudentSafeQuestionProjection;
}

export type BrowserSafePracticeResponse = PracticeAnswerInput;

export type PracticeCorrectAnswer =
  | { type: "SINGLE_CHOICE"; optionKey: string }
  | { type: "MULTI_SELECT"; optionKeys: readonly string[] }
  | {
      type: "CATEGORY";
      selections: readonly { statementId: string; categoryChoiceCode: string }[];
    };

export interface PracticeFeedback {
  isCorrect: boolean;
  scoreFraction: number;
  selectedResponse: BrowserSafePracticeResponse;
  correctAnswer: PracticeCorrectAnswer;
  explanationBodyJson: unknown;
}

export interface PracticeSubmissionResult {
  session: PracticeSessionView;
  item: { questionId: string; position: number };
  feedback: PracticeFeedback;
  idempotentRetry: boolean;
}

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

function asServiceFailure<T>(): PracticeResult<T> {
  return failure("INTERNAL_ERROR", "Practice request could not be completed.");
}

async function safely<T>(
  operation: () => Promise<PracticeResult<T>>,
): Promise<PracticeResult<T>> {
  try {
    return await operation();
  } catch {
    return asServiceFailure<T>();
  }
}

function sessionView(session: PracticeSessionRow): PracticeSessionView {
  return {
    id: session.id,
    subjectId: session.subjectId,
    topicId: session.topicId,
    status: session.status,
    questionTarget: session.questionTarget,
    questionsAnswered: session.questionsAnswered,
    correctCount: session.correctCount,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    lastActivityAt: session.lastActivityAt,
  };
}

function validEvaluation(
  aggregate: QuestionAggregate,
  response: unknown,
): PracticeResult<SuccessfulEvaluation> {
  const evaluation = evaluateQuestionResponse(aggregate, response);
  if (!evaluation.valid) {
    return failure("INVALID_RESPONSE", "Response does not match this question.", "response");
  }
  return { ok: true, value: evaluation };
}

function isNormalizedPersistedResponse(value: unknown): value is NormalizedPracticeResponse {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.type === "SINGLE_CHOICE") {
    return (
      Object.keys(record).sort().join(",") === "optionKey,type" &&
      typeof record.optionKey === "string"
    );
  }
  if (record.type === "MULTI_SELECT") {
    return (
      Object.keys(record).sort().join(",") === "optionKeys,type" &&
      Array.isArray(record.optionKeys) &&
      record.optionKeys.every((key) => typeof key === "string")
    );
  }
  if (record.type === "CATEGORY") {
    return (
      Object.keys(record).sort().join(",") === "selections,type" &&
      Array.isArray(record.selections) &&
      record.selections.every((selection) => {
        if (selection === null || typeof selection !== "object" || Array.isArray(selection)) {
          return false;
        }
        const item = selection as Record<string, unknown>;
        return (
          Object.keys(item).sort().join(",") === "categoryChoiceId,statementId" &&
          typeof item.statementId === "string" &&
          typeof item.categoryChoiceId === "string"
        );
      })
    );
  }
  return false;
}

function publicResponse(
  aggregate: QuestionAggregate,
  response: NormalizedPracticeResponse,
): PracticeResult<BrowserSafePracticeResponse> {
  if (response.type === "SINGLE_CHOICE") {
    return {
      ok: true,
      value: { type: "SINGLE_CHOICE", optionKey: response.optionKey },
    };
  }
  if (response.type === "MULTI_SELECT") {
    return {
      ok: true,
      value: { type: "MULTI_SELECT", optionKeys: [...response.optionKeys] },
    };
  }

  const selections: { statementId: string; categoryChoiceCode: string }[] = [];
  for (const selection of response.selections) {
    const matches = aggregate.categoryChoices.filter(
      (choice) =>
        choice.questionId === aggregate.question.id &&
        choice.id === selection.categoryChoiceId,
    );
    if (matches.length !== 1) {
      return failure("INVALID_QUESTION", "CATEGORY feedback cannot safely resolve this choice.");
    }
    selections.push({
      statementId: selection.statementId,
      categoryChoiceCode: matches[0]!.code,
    });
  }
  return { ok: true, value: { type: "CATEGORY", selections } };
}

function correctAnswer(
  aggregate: QuestionAggregate,
): PracticeResult<PracticeCorrectAnswer> {
  if (aggregate.question.questionType === "SINGLE_CHOICE") {
    const options = aggregate.options.filter((option) => option.isCorrect);
    if (options.length !== 1) {
      return failure("INVALID_QUESTION", "Published question has no unique correct option.");
    }
    return {
      ok: true,
      value: { type: "SINGLE_CHOICE", optionKey: options[0]!.optionKey },
    };
  }
  if (aggregate.question.questionType === "MULTI_SELECT") {
    return {
      ok: true,
      value: {
        type: "MULTI_SELECT",
        optionKeys: aggregate.options
          .filter((option) => option.isCorrect)
          .map((option) => option.optionKey)
          .sort(),
      },
    };
  }

  const statements = [...aggregate.categoryStatements].sort(
    (left, right) => left.sortOrder - right.sortOrder || compareStableText(left.id, right.id),
  );
  const selections: { statementId: string; categoryChoiceCode: string }[] = [];
  for (const statement of statements) {
    const answers = aggregate.categoryAnswers.filter(
      (answer) => answer.statementId === statement.id,
    );
    if (answers.length !== 1) {
      return failure("INVALID_QUESTION", "Published CATEGORY question has no unique statement answer.");
    }
    const choices = aggregate.categoryChoices.filter(
      (choice) =>
        choice.questionId === aggregate.question.id &&
        choice.id === answers[0]!.categoryChoiceId,
    );
    if (choices.length !== 1) {
      return failure("INVALID_QUESTION", "Published CATEGORY answer does not resolve to a safe choice code.");
    }
    selections.push({
      statementId: statement.id,
      categoryChoiceCode: choices[0]!.code,
    });
  }
  return { ok: true, value: { type: "CATEGORY", selections } };
}

function feedback(
  aggregate: QuestionAggregate,
  evaluation: SuccessfulEvaluation,
  persistedScoreFraction: number,
): PracticeResult<PracticeFeedback> {
  const selectedResponse = publicResponse(aggregate, evaluation.normalizedResponse);
  if (!selectedResponse.ok) return selectedResponse;
  const answer = correctAnswer(aggregate);
  if (!answer.ok) return answer;
  return {
    ok: true,
    value: {
      isCorrect: evaluation.isCorrect,
      scoreFraction: persistedScoreFraction,
      selectedResponse: selectedResponse.value,
      correctAnswer: answer.value,
      explanationBodyJson: aggregate.question.explanationBodyJson,
    },
  };
}

function validPracticeAggregate(aggregate: QuestionAggregate): boolean {
  return (
    aggregate.question.status === "PUBLISHED" &&
    projectQuestionForStudent(aggregate).valid
  );
}

function eligiblePracticeMetadata(
  candidates: readonly PracticeCandidateRow[],
): PracticeCandidateRow[] {
  return candidates.filter((candidate) => validPracticeAggregate(candidate.aggregate));
}

export async function startPracticeSession(
  actorInput: PracticeActor,
  requestInput: unknown,
): Promise<PracticeResult<PracticeSessionResult>> {
  const actor = validatePracticeActor(actorInput);
  if (!actor.ok) return actor;
  const request = validatePracticeStartRequest(requestInput);
  if (!request.ok) return request;
  const ids = validatePracticeIds([
    ["parentUserId", actor.value.parentUserId],
    ["childProfileId", request.value.childProfileId],
    ["subjectId", request.value.subjectId],
    ...(request.value.topicId ? [["topicId", request.value.topicId] as const] : []),
  ]);
  if (!ids.ok) return ids;

  const sessionId = randomUUID();
  const now = new Date();
  return safely(() =>
    withPracticeTransaction(async (tx) => {
      const owned = await lockOwnedChild(
        tx,
        actor.value.parentUserId,
        request.value.childProfileId,
      );
      if (!owned) {
        return failure(
          "NOT_FOUND_OR_FORBIDDEN",
          "The requested child profile was not found.",
        );
      }
      if (
        request.value.topicId &&
        !(await topicBelongsToSubject(
          tx,
          request.value.topicId,
          request.value.subjectId,
        ))
      ) {
        return failure("INVALID_INPUT", "topicId does not belong to subjectId.", "topicId");
      }

      const allCandidates = await listPracticeCandidates(
        tx,
        request.value.childProfileId,
        request.value.subjectId,
        request.value.topicId,
      );
      const readyCandidates = eligiblePracticeMetadata(allCandidates);
      const selection = selectPracticeSnapshot(
        sessionId,
        readyCandidates.map((candidate) => ({
          questionId: candidate.questionId,
          status: candidate.status,
          usageType: candidate.usageType,
          subjectId: candidate.subjectId,
          topicId: candidate.topicId,
          exposureCount: candidate.exposureCount,
        })),
        {
          subjectId: request.value.subjectId,
          topicId: request.value.topicId,
          questionTarget: request.value.questionTarget,
        },
      );
      if (!selection.ok) return selection;

      const session = await insertPracticeSessionAndItems(
        tx,
        {
          id: sessionId,
          childProfileId: request.value.childProfileId,
          subjectId: request.value.subjectId,
          topicId: request.value.topicId ?? null,
          status: "ACTIVE",
          questionTarget: request.value.questionTarget,
          questionsAnswered: 0,
          correctCount: 0,
          startedAt: now,
          completedAt: null,
          lastActivityAt: now,
        },
        selection.value.map((item) => ({
          practiceSessionId: sessionId,
          questionId: item.questionId,
          position: item.position,
        })),
      );
      return {
        ok: true,
        value: {
          session: sessionView(session),
          items: selection.value.map((item) => ({ ...item, answered: false })),
        },
      };
    }),
  );
}

export async function getPracticeSession(
  actorInput: PracticeActor,
  sessionId: string,
): Promise<PracticeResult<PracticeSessionResult>> {
  const actor = validatePracticeActor(actorInput);
  if (!actor.ok) return actor;
  if (!sessionId.trim()) return failure("INVALID_INPUT", "sessionId is required.", "sessionId");
  const ids = validatePracticeIds([
    ["parentUserId", actor.value.parentUserId],
    ["sessionId", sessionId],
  ]);
  if (!ids.ok) return ids;

  return safely(() =>
    withPracticeTransaction(async (tx) => {
      const session = await getOwnedPracticeSession(
        tx,
        sessionId,
        actor.value.parentUserId,
      );
      if (!session) {
        return failure("NOT_FOUND_OR_FORBIDDEN", "Practice session was not found.");
      }
      const items = await listPracticeSnapshotItems(tx, session.id);
      return {
        ok: true,
        value: {
          session: sessionView(session),
          items: items.map((item) => ({
            questionId: item.questionId,
            position: item.position,
            answered: item.answer !== null,
          })),
        },
      };
    }),
  );
}

export async function getPracticeQuestion(
  actorInput: PracticeActor,
  sessionId: string,
  questionId?: string,
): Promise<PracticeResult<PracticeQuestionResult>> {
  const actor = validatePracticeActor(actorInput);
  if (!actor.ok) return actor;
  if (!sessionId.trim()) return failure("INVALID_INPUT", "sessionId is required.", "sessionId");
  if (questionId !== undefined && !questionId.trim()) {
    return failure("INVALID_INPUT", "questionId must be non-empty when provided.", "questionId");
  }
  const ids = validatePracticeIds([
    ["parentUserId", actor.value.parentUserId],
    ["sessionId", sessionId],
    ...(questionId ? [["questionId", questionId] as const] : []),
  ]);
  if (!ids.ok) return ids;

  return safely(() =>
    withPracticeTransaction(async (tx) => {
      const session = await getOwnedPracticeSession(
        tx,
        sessionId,
        actor.value.parentUserId,
      );
      if (!session) {
        return failure("NOT_FOUND_OR_FORBIDDEN", "Practice session was not found.");
      }
      if (session.status !== "ACTIVE") {
        return failure("SESSION_NOT_ACTIVE", "Practice session is no longer active.");
      }

      const items = await listPracticeSnapshotItems(tx, session.id);
      if (items.length !== session.questionTarget) {
        return failure("SESSION_STATE_INCONSISTENT", "Session snapshot length does not match its target.");
      }
      const item = questionId
        ? items.find((candidate) => candidate.questionId === questionId)
        : getNextUnansweredPracticeItem(
            items,
            new Set(
              items
                .filter((candidate) => candidate.answer !== null)
                .map((candidate) => candidate.questionId),
            ),
          );
      if (!item) {
        return questionId
          ? failure("QUESTION_NOT_IN_SNAPSHOT", "Question is not part of this session snapshot.")
          : failure("SESSION_STATE_INCONSISTENT", "No unanswered snapshot item exists in an active session.");
      }
      if ("answer" in item && item.answer !== null) {
        return failure("ANSWER_ALREADY_PERSISTED", "This snapshot question already has an answer.");
      }

      const aggregate = await loadQuestionAggregate(tx, item.questionId);
      if (!aggregate || !validPracticeAggregate(aggregate)) {
        return failure("INVALID_QUESTION", "Snapshot question is no longer publish-ready.");
      }
      const projection = projectQuestionForStudent(aggregate);
      if (!projection.valid) {
        return failure("INVALID_QUESTION", "Snapshot question is no longer publish-ready.");
      }
      return {
        ok: true,
        value: {
          session: sessionView(session),
          item: { questionId: item.questionId, position: item.position },
          question: projection.value,
        },
      };
    }),
  );
}

export async function getNextPracticeQuestion(
  actor: PracticeActor,
  sessionId: string,
): Promise<PracticeResult<PracticeQuestionResult>> {
  return getPracticeQuestion(actor, sessionId);
}

export async function submitPracticeAnswer(
  actorInput: PracticeActor,
  sessionId: string,
  questionId: string,
  responseInput: unknown,
  responseTimeMsInput?: unknown,
): Promise<PracticeResult<PracticeSubmissionResult>> {
  const actor = validatePracticeActor(actorInput);
  if (!actor.ok) return actor;
  if (!sessionId.trim()) return failure("INVALID_INPUT", "sessionId is required.", "sessionId");
  if (!questionId.trim()) return failure("INVALID_INPUT", "questionId is required.", "questionId");
  const ids = validatePracticeIds([
    ["parentUserId", actor.value.parentUserId],
    ["sessionId", sessionId],
    ["questionId", questionId],
  ]);
  if (!ids.ok) return ids;
  const responseTimeMs = validatePracticeResponseTimeMs(responseTimeMsInput);
  if (!responseTimeMs.ok) return responseTimeMs;

  return safely(() =>
    withPracticeTransaction(async (tx) => {
      const session = await lockOwnedPracticeSession(
        tx,
        sessionId,
        actor.value.parentUserId,
      );
      if (!session) {
        return failure("NOT_FOUND_OR_FORBIDDEN", "Practice session was not found.");
      }
      if (session.status === "ABANDONED") {
        return failure("SESSION_NOT_ACTIVE", "Practice session is no longer active.");
      }
      const snapshotItems = await listPracticeSnapshotItems(tx, session.id);
      const item = snapshotItems.find((candidate) => candidate.questionId === questionId);
      if (!item) {
        return failure("QUESTION_NOT_IN_SNAPSHOT", "Question is not part of this session snapshot.");
      }
      const aggregate = await loadQuestionAggregate(tx, questionId);
      if (!aggregate || !validPracticeAggregate(aggregate)) {
        return failure("INVALID_QUESTION", "Snapshot question is no longer publish-ready.");
      }
      const normalized = normalizePracticeResponse(aggregate, responseInput);
      if (!normalized.ok) return normalized;

      const existing = await getPracticeAnswer(tx, session.id, questionId);
      if (existing) {
        if (!isNormalizedPersistedResponse(existing.responseJson)) {
          return failure("INTERNAL_ERROR", "Persisted practice answer is invalid.");
        }
        if (
          !arePracticeResponsesSemanticallyEqual(
            normalized.value,
            existing.responseJson as NormalizedQuestionResponse,
          )
        ) {
          return failure(
            "ANSWER_CONFLICT",
            "A different answer was already saved for this question.",
          );
        }
        const retryEvaluation = validEvaluation(aggregate, existing.responseJson);
        if (!retryEvaluation.ok) return retryEvaluation;
        const retryFeedback = feedback(
          aggregate,
          retryEvaluation.value,
          Number(existing.scoreFraction),
        );
        if (!retryFeedback.ok) return retryFeedback;
        return {
          ok: true,
          value: {
            session: sessionView(session),
            item: { questionId, position: item.position },
            feedback: retryFeedback.value,
            idempotentRetry: true,
          },
        };
      }

      if (session.status !== "ACTIVE") {
        return failure("SESSION_NOT_ACTIVE", "Practice session is no longer active.");
      }
      if (item.answer !== null) {
        return failure("SESSION_STATE_INCONSISTENT", "Snapshot answer state could not be reconciled.");
      }
      if (snapshotItems.length !== session.questionTarget) {
        return failure("SESSION_STATE_INCONSISTENT", "Session snapshot length does not match its target.");
      }

      const storedCounts = await countPracticeAnswers(tx, session.id);
      const answeredSnapshotCount = snapshotItems.filter(
        (snapshotItem) => snapshotItem.answer !== null,
      ).length;
      const correctSnapshotCount = snapshotItems.filter(
        (snapshotItem) => snapshotItem.answer?.isCorrect === true,
      ).length;
      if (
        storedCounts.total !== session.questionsAnswered ||
        storedCounts.correct !== session.correctCount ||
        answeredSnapshotCount !== storedCounts.total ||
        correctSnapshotCount !== storedCounts.correct ||
        storedCounts.total >= session.questionTarget
      ) {
        return failure(
          "SESSION_STATE_INCONSISTENT",
          "Practice answer rows and session counters are inconsistent.",
        );
      }

      const evaluation = validEvaluation(aggregate, normalized.value);
      if (!evaluation.ok) return evaluation;
      const nextQuestionsAnswered = storedCounts.total + 1;
      const nextCorrectCount = storedCounts.correct + (evaluation.value.isCorrect ? 1 : 0);
      if (
        nextQuestionsAnswered > session.questionTarget ||
        nextCorrectCount > nextQuestionsAnswered
      ) {
        return failure("SESSION_STATE_INCONSISTENT", "Practice counters would exceed their valid range.");
      }
      const feedbackBeforeWrite = feedback(
        aggregate,
        evaluation.value,
        evaluation.value.scoreFraction,
      );
      if (!feedbackBeforeWrite.ok) return feedbackBeforeWrite;
      const answeredAt = new Date();
      const answer = await insertPracticeAnswer(tx, {
        id: randomUUID(),
        practiceSessionId: session.id,
        questionId,
        responseJson: evaluation.value.normalizedResponse,
        isCorrect: evaluation.value.isCorrect,
        scoreFraction: String(evaluation.value.scoreFraction),
        answeredAt,
        responseTimeMs: responseTimeMs.value ?? null,
      });
      const completed = nextQuestionsAnswered === session.questionTarget;
      const updated = await updatePracticeSessionAfterAnswer(tx, session.id, {
        questionsAnswered: nextQuestionsAnswered,
        correctCount: nextCorrectCount,
        status: completed ? "COMPLETED" : "ACTIVE",
        lastActivityAt: answeredAt,
        completedAt: completed ? answeredAt : null,
      });
      if (!updated) {
        throw new Error("Practice session update returned no row after answer insertion.");
      }
      return {
        ok: true,
        value: {
          session: sessionView(updated),
          item: { questionId, position: item.position },
          feedback: {
            ...feedbackBeforeWrite.value,
            scoreFraction: Number(answer.scoreFraction),
          },
          idempotentRetry: false,
        },
      };
    }),
  );
}

export async function abandonPracticeSession(
  actorInput: PracticeActor,
  sessionId: string,
): Promise<PracticeResult<PracticeSessionView>> {
  const actor = validatePracticeActor(actorInput);
  if (!actor.ok) return actor;
  if (!sessionId.trim()) return failure("INVALID_INPUT", "sessionId is required.", "sessionId");
  const ids = validatePracticeIds([
    ["parentUserId", actor.value.parentUserId],
    ["sessionId", sessionId],
  ]);
  if (!ids.ok) return ids;

  return safely(() =>
    withPracticeTransaction(async (tx) => {
      const session = await lockOwnedPracticeSession(
        tx,
        sessionId,
        actor.value.parentUserId,
      );
      if (!session) {
        return failure("NOT_FOUND_OR_FORBIDDEN", "Practice session was not found.");
      }
      if (session.status !== "ACTIVE") {
        return failure("SESSION_NOT_ACTIVE", "Only an active practice session can be abandoned.");
      }
      const updated = await abandonPracticeSessionRow(tx, session.id, new Date());
      if (!updated) {
        return failure("SESSION_NOT_ACTIVE", "Practice session is no longer active.");
      }
      return { ok: true, value: sessionView(updated) };
    }),
  );
}
