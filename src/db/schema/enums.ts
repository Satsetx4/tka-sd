import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["PARENT", "ADMIN"]);
export const profileStatusEnum = pgEnum("profile_status", ["ACTIVE", "ARCHIVED"]);
export const contentStatusEnum = pgEnum("content_status", [
  "DRAFT",
  "IN_REVIEW",
  "VERIFIED",
  "PUBLISHED",
  "ARCHIVED",
]);
export const questionTypeEnum = pgEnum("question_type", [
  "SINGLE_CHOICE",
  "MULTI_SELECT",
  "CATEGORY",
]);
export const cognitiveLevelEnum = pgEnum("cognitive_level", ["UNDERSTAND", "APPLY", "REASON"]);
export const difficultyEnum = pgEnum("difficulty", ["EASY", "MEDIUM", "HARD"]);
export const usageTypeEnum = pgEnum("usage_type", ["PRACTICE", "ASSESSMENT", "BOTH"]);
export const sourceTypeEnum = pgEnum("source_type", [
  "OFFICIAL_REFERENCE",
  "THIRD_PARTY_REFERENCE",
  "ORIGINAL",
  "REGENERATED",
]);
export const stimulusTypeEnum = pgEnum("stimulus_type", ["TEXT", "IMAGE", "TABLE", "GRAPH", "MIXED"]);
export const textTypeEnum = pgEnum("text_type", ["INFORMATION", "FICTION"]);
export const assetTypeEnum = pgEnum("asset_type", ["IMAGE", "ILLUSTRATION", "DIAGRAM", "GRAPH"]);
export const lessonBlockTypeEnum = pgEnum("lesson_block_type", [
  "INTRO",
  "OBJECTIVE",
  "CONTENT",
  "EXAMPLE",
  "TIP",
  "CHECKPOINT",
  "SUMMARY",
  "CTA",
]);
export const lessonProgressStatusEnum = pgEnum("lesson_progress_status", [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
]);
export const practiceSessionStatusEnum = pgEnum("practice_session_status", [
  "ACTIVE",
  "COMPLETED",
  "ABANDONED",
]);
export const tryoutAttemptStatusEnum = pgEnum("tryout_attempt_status", [
  "IN_PROGRESS",
  "SUBMITTED",
  "EXPIRED",
  "INVALIDATED",
]);
export const seasonStatusEnum = pgEnum("season_status", ["UPCOMING", "ACTIVE", "ENDED"]);
export const purchaseStatusEnum = pgEnum("purchase_status", ["PENDING", "PAID", "FAILED", "REFUNDED"]);
