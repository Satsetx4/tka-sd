import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  assetTypeEnum,
  contentStatusEnum,
  sourceTypeEnum,
  stimulusTypeEnum,
  textTypeEnum,
} from "./enums";
import { users } from "./identity";
import { subjects } from "./taxonomy";

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey(),
    storageKey: text("storage_key").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    assetType: assetTypeEnum("asset_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    altText: text("alt_text").notNull(),
    caption: text("caption"),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceReference: text("source_reference"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("media_assets_file_size_check", sql`${table.fileSize} >= 0`)],
);

export const stimuli = pgTable(
  "stimuli",
  {
    id: uuid("id").primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    title: text("title"),
    stimulusType: stimulusTypeEnum("stimulus_type").notNull(),
    bodyJson: jsonb("body_json").notNull(),
    textType: textTypeEnum("text_type"),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceReference: text("source_reference"),
    status: contentStatusEnum("status").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("stimuli_version_check", sql`${table.version} > 0`),
    index("stimuli_subject_id_status_idx").on(table.subjectId, table.status),
  ],
);
