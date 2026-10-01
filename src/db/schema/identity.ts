import {
  check,
  customType,
  integer,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { profileStatusEnum, userRoleEnum } from "./enums";

const citextColumn = customType<{ data: string }>({
  dataType: () => "citext",
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  authProviderUserId: text("auth_provider_user_id").notNull().unique(),
  email: citextColumn("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: userRoleEnum("role").notNull().default("PARENT"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const childProfiles = pgTable(
  "child_profiles",
  {
    id: uuid("id").primaryKey(),
    parentUserId: uuid("parent_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    grade: smallint("grade").notNull(),
    avatarKey: text("avatar_key"),
    status: profileStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("child_profiles_grade_check", sql`${table.grade} in (4, 5, 6)`),
    index("child_profiles_parent_user_id_status_idx").on(table.parentUserId, table.status),
  ],
);

export const parentPins = pgTable(
  "parent_pins",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id),
    pinHash: text("pin_hash").notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [check("parent_pins_failed_attempts_check", sql`${table.failedAttempts} >= 0`)],
);
