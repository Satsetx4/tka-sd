import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import {
  cognitiveLevelEnum,
  contentStatusEnum,
  difficultyEnum,
  questionTypeEnum,
  sourceTypeEnum,
  usageTypeEnum,
} from "./enums";
import { users } from "./identity";
import { stimuli } from "./media";
import { competencies, domains, indicators, subjects, tags, topics } from "./taxonomy";

export const questions = pgTable(
  "questions",
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
    primaryCompetencyId: uuid("primary_competency_id")
      .notNull()
      .references(() => competencies.id),
    primaryIndicatorId: uuid("primary_indicator_id").references(() => indicators.id),
    stimulusId: uuid("stimulus_id").references(() => stimuli.id),
    questionType: questionTypeEnum("question_type").notNull(),
    cognitiveLevel: cognitiveLevelEnum("cognitive_level").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    usageType: usageTypeEnum("usage_type").notNull(),
    questionBodyJson: jsonb("question_body_json").notNull(),
    explanationBodyJson: jsonb("explanation_body_json").notNull(),
    status: contentStatusEnum("status").notNull(),
    version: integer("version").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceReference: text("source_reference"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    verifiedBy: uuid("verified_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("questions_subject_id_topic_id_status_idx").on(
      table.subjectId,
      table.topicId,
      table.status,
    ),
    index("questions_status_usage_type_idx").on(table.status, table.usageType),
    index("questions_primary_competency_id_status_idx").on(
      table.primaryCompetencyId,
      table.status,
    ),
    index("questions_stimulus_id_idx").on(table.stimulusId),
  ],
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    optionKey: text("option_key").notNull(),
    bodyJson: jsonb("body_json").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    unique("question_options_question_id_option_key_unique").on(
      table.questionId,
      table.optionKey,
    ),
    unique("question_options_question_id_sort_order_unique").on(
      table.questionId,
      table.sortOrder,
    ),
  ],
);

export const categoryStatements = pgTable(
  "category_statements",
  {
    id: uuid("id").primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    statementBodyJson: jsonb("statement_body_json").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    unique("category_statements_question_id_sort_order_unique").on(
      table.questionId,
      table.sortOrder,
    ),
  ],
);

export const categoryChoices = pgTable(
  "category_choices",
  {
    id: uuid("id").primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    code: text("code").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    unique("category_choices_question_id_code_unique").on(table.questionId, table.code),
  ],
);

export const categoryAnswers = pgTable(
  "category_answers",
  {
    statementId: uuid("statement_id")
      .notNull()
      .references(() => categoryStatements.id),
    categoryChoiceId: uuid("category_choice_id")
      .notNull()
      .references(() => categoryChoices.id),
  },
  (table) => [primaryKey({ columns: [table.statementId, table.categoryChoiceId] })],
);

export const questionTags = pgTable(
  "question_tags",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.questionId, table.tagId] })],
);
