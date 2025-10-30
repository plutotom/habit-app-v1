import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const trackTypeEnum = pgEnum("track_type", [
  "binary",
  "count",
  "duration",
  "timer",
]);

export const scheduleTypeEnum = pgEnum("schedule_type", [
  "daily",
  "weekly",
  "monthly",
  "custom",
]);

export const perPeriodEnum = pgEnum("per_period", ["day", "week", "month"]);

export const skipPolicyEnum = pgEnum("skip_policy", [
  "none",
  "allow_skips",
  "vacation",
]);

export const checkinSourceEnum = pgEnum("checkin_source", ["manual", "timer"]);

export const freezeStatusEnum = pgEnum("freeze_status", [
  "available",
  "used",
  "expired",
]);

export const weekStartEnum = pgEnum("week_start", ["mon", "sun"]);

export const exportTypeEnum = pgEnum("export_type", ["csv", "json"]);

export const exportStatusEnum = pgEnum("export_status", [
  "pending",
  "processing",
  "ready",
  "failed",
  "expired",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email"),
  timezone: text("timezone").notNull(),
  weekStart: weekStartEnum("week_start").default("mon").notNull(),
  preferences: jsonb("preferences")
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
});

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    icon: text("icon"),
    color: text("color"),
    category: text("category"),
    trackType: trackTypeEnum("track_type").notNull(),
    scheduleType: scheduleTypeEnum("schedule_type").notNull(),
    countTarget: integer("count_target"),
    perPeriod: perPeriodEnum("per_period"),
    allowedDays: jsonb("allowed_days").default(sql`'[]'::jsonb`).notNull(),
    dayBoundaryOffsetMinutes: integer("day_boundary_offset_minutes")
      .default(0)
      .notNull(),
    skipPolicy: skipPolicyEnum("skip_policy").default("none").notNull(),
    freezeEnabled: boolean("freeze_enabled").default(true).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("habits_user_idx").on(table.userId),
  }),
);

export const habitCustomRules = pgTable(
  "habit_custom_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    ruleKey: text("rule_key").notNull(),
    ruleValue: jsonb("rule_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    habitIdx: index("habit_custom_rules_habit_idx").on(table.habitId),
  }),
);

export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    localDay: date("local_day").notNull(),
    quantity: numeric("quantity"),
    source: checkinSourceEnum("source").default("manual").notNull(),
    note: text("note"),
    isSkip: boolean("is_skip").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    habitByDateIdx: index("checkins_habit_date_idx").on(
      table.habitId,
      table.occurredAt,
    ),
    userByDateIdx: index("checkins_user_date_idx").on(
      table.userId,
      table.occurredAt,
    ),
    skipUnique: uniqueIndex("checkins_skip_unique")
      .on(table.habitId, table.localDay)
      .where(sql`${table.isSkip} = true`),
    skipQuantityCheck: check(
      "checkins_skip_quantity_check",
      sql`NOT (${table.isSkip} AND ${table.quantity} IS NOT NULL AND ${table.quantity} <> 0)`
    ),
  }),
);

export const freezeTokens = pgTable(
  "freeze_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    habitId: uuid("habit_id")
      .references(() => habits.id, { onDelete: "set null" }),
    coveredHabitId: uuid("covered_habit_id").references(() => habits.id, {
      onDelete: "set null",
    }),
    status: freezeStatusEnum("status").default("available").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    coveredLocalDay: date("covered_local_day"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("freeze_tokens_user_idx").on(table.userId),
    statusIdx: index("freeze_tokens_status_idx").on(table.status),
  }),
);

export const streaksCache = pgTable(
  "streaks_cache",
  {
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStreak: integer("current_streak").default(0).notNull(),
    longestStreak: integer("longest_streak").default(0).notNull(),
    lastSuccessLocalDay: date("last_success_local_day"),
    currentChainStart: date("current_chain_start"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.habitId] }),
    userIdx: index("streaks_cache_user_idx").on(table.userId),
  }),
);

export const habitAnalyticsDaily = pgTable(
  "habit_analytics_daily",
  {
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    completions: integer("completions").default(0).notNull(),
    target: integer("target"),
    completionRate: numeric("completion_rate"),
    strengthScore: numeric("strength_score"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.habitId, table.date] }),
    habitIdx: index("habit_analytics_daily_habit_idx").on(table.habitId),
  }),
);

export const eventsLog = pgTable(
  "events_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    requestId: text("request_id"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("events_log_user_idx").on(table.userId),
    typeIdx: index("events_log_type_idx").on(table.eventType),
  }),
);

export const exportsTable = pgTable(
  "exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exportType: exportTypeEnum("export_type").default("csv").notNull(),
    params: jsonb("params").notNull(),
    status: exportStatusEnum("status").default("pending").notNull(),
    storageKey: text("storage_key"),
    resultUrl: text("result_url"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userRequestedIdx: index("exports_user_requested_idx").on(
      table.userId,
      table.requestedAt,
    ),
  }),
);

export const userCounters = pgTable("user_counters", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .primaryKey(),
  freezeTokensAvailable: integer("freeze_tokens_available")
    .default(0)
    .notNull(),
  lastFreezeGrantAt: timestamp("last_freeze_grant_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true })
      .defaultNow()
      .notNull(),
    count: integer("count").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    rateLimitPk: primaryKey({ columns: [table.userId, table.bucket] }),
  }),
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    status: jobStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusIdx: index("jobs_status_idx").on(table.status),
    typeIdx: index("jobs_type_idx").on(table.type),
  }),
);

