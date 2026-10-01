import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { contentStatusEnum, lessonBlockTypeEnum, lessonProgressStatusEnum } from "./enums";
import { childProfiles, users } from "./identity";
import { domains, subjects, topics } from "./taxonomy";

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey(),
    code: text("code").notNull().unique(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    estimatedMinutes: smallint("estimated_minutes").notNull(),
    status: contentStatusEnum("status").notNull(),
    version: integer("version").notNull(),
    isFree: boolean("is_free")
      .notNull()
      .default(false),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("lessons_estimated_minutes_check", sql`${table.estimatedMinutes} > 0`),
    unique("lessons_subject_id_slug_unique").on(table.subjectId, table.slug),
  ],
);

export const lessonBlocks = pgTable(
  "lesson_blocks",
  {
    id: uuid("id").primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id),
    blockType: lessonBlockTypeEnum("block_type").notNull(),
    contentJson: jsonb("content_json").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [unique("lesson_blocks_lesson_id_sort_order_unique").on(table.lessonId, table.sortOrder)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey(),
    childProfileId: uuid("child_profile_id")
      .notNull()
      .references(() => childProfiles.id),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id),
    status: lessonProgressStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastBlockIndex: integer("last_block_index").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("lesson_progress_child_profile_id_lesson_id_unique").on(
      table.childProfileId,
      table.lessonId,
    ),
  ],
);
