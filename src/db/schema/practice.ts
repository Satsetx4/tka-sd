import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { practiceSessionStatusEnum } from "./enums";
import { childProfiles } from "./identity";
import { questions } from "./questions";
import { subjects, topics } from "./taxonomy";

export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: uuid("id").primaryKey(),
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    topicId: uuid("topic_id").references(() => topics.id),
    status: practiceSessionStatusEnum("status").notNull(),
    questionTarget: integer("question_target").notNull(),
    questionsAnswered: integer("questions_answered").notNull(),
    correctCount: integer("correct_count").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("practice_sessions_child_profile_id_started_at_idx").on(
      table.childProfileId,
      table.startedAt.desc(),
    ),
  ],
);

export const practiceSessionItems = pgTable(
  "practice_session_items",
  {
    practiceSessionId: uuid("practice_session_id")
      .notNull()
      .references(() => practiceSessions.id),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.practiceSessionId, table.questionId] }),
    unique("practice_session_items_session_position_unique").on(
      table.practiceSessionId,
      table.position,
    ),
  ],
);

export const practiceAnswers = pgTable(
  "practice_answers",
  {
    id: uuid("id").primaryKey(),
    practiceSessionId: uuid("practice_session_id")
      .notNull()
      .references(() => practiceSessions.id),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    responseJson: jsonb("response_json").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    scoreFraction: numeric("score_fraction", { precision: 5, scale: 4 }).notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull(),
    responseTimeMs: integer("response_time_ms"),
  },
  (table) => [
    unique("practice_answers_session_question_unique").on(
      table.practiceSessionId,
      table.questionId,
    ),
    check(
      "practice_answers_score_fraction_range_check",
      sql`${table.scoreFraction} >= 0 AND ${table.scoreFraction} <= 1`,
    ),
  ],
);
