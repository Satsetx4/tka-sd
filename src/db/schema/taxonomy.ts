import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  sortOrder: integer("sort_order").notNull(),
  isActive: boolean("is_active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const domains = pgTable(
  "domains",
  {
    id: uuid("id").primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull(),
    isActive: boolean("is_active").notNull(),
  },
  (table) => [unique().on(table.subjectId, table.slug)],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey(),
    domainId: uuid("domain_id")
      .notNull()
      .references(() => domains.id),
    parentTopicId: uuid("parent_topic_id").references(
      (): AnyPgColumn => topics.id,
    ),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull(),
    isActive: boolean("is_active").notNull(),
  },
  (table) => [
    unique("topics_domain_id_parent_topic_id_slug_unique")
      .on(table.domainId, table.parentTopicId, table.slug)
      .nullsNotDistinct(),
  ],
);

export const competencies = pgTable(
  "competencies",
  {
    id: uuid("id").primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull(),
    isActive: boolean("is_active").notNull(),
  },
);

export const indicators = pgTable("indicators", {
  id: uuid("id").primaryKey(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id),
  topicId: uuid("topic_id").references(() => topics.id),
  competencyId: uuid("competency_id")
    .notNull()
    .references(() => competencies.id),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  officialReference: text("official_reference"),
  sortOrder: integer("sort_order").notNull(),
  isActive: boolean("is_active").notNull(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});
