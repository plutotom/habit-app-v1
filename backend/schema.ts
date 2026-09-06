import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const weekStartValidator = v.union(v.literal("mon"), v.literal("sun"));

export const scheduleTypeValidator = v.union(
  v.literal("daily"),
  v.literal("specific_days"),
);

const schema = defineSchema({
  users: defineTable({
    workosId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    timezone: v.string(),
    weekStart: weekStartValidator,
    createdAt: v.number(),
  }).index("by_workosId", ["workosId"]),

  habits: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    scheduleType: scheduleTypeValidator,
    // Days of week (0=Sun … 6=Sat) when scheduleType is specific_days
    allowedDays: v.optional(v.array(v.number())),
    isArchived: v.boolean(),
    order: v.number(),
    createdAt: v.number(),
    createdLocalDay: v.optional(v.string()),
    statisticsReady: v.optional(v.boolean()),
    statisticsCursor: v.optional(v.string()),
    // Legacy fields from earlier POC iterations. Kept optional so existing
    // documents still validate; new habits no longer write these.
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    trackType: v.optional(
      v.union(v.literal("binary"), v.literal("count"), v.literal("duration")),
    ),
    countTarget: v.optional(v.number()),
    durationTarget: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_archived", ["userId", "isArchived"]),

  habitYears: defineTable({
    habitId: v.id("habits"),
    year: v.string(),
    // At most 366 unique calendar dates per document.
    completedDays: v.array(v.string()),
  }).index("by_habitId_and_year", ["habitId", "year"]),

  checkins: defineTable({
    habitId: v.id("habits"),
    userId: v.id("users"),
    localDay: v.string(),
    completedAt: v.number(),
    value: v.number(),
    note: v.optional(v.string()),
    isSkip: v.boolean(),
  })
    .index("by_habitId_localDay", ["habitId", "localDay"])
    .index("by_userId_localDay", ["userId", "localDay"])
    .index("by_habitId", ["habitId"]),
});

export default schema;
export const habitDocValidator = v.object({
  ...schema.tables.habits.validator.fields,
  _id: v.id("habits"),
  _creationTime: v.number(),
});
export const userDocValidator = v.object({
  ...schema.tables.users.validator.fields,
  _id: v.id("users"),
  _creationTime: v.number(),
});
export const checkinDocValidator = v.object({
  ...schema.tables.checkins.validator.fields,
  _id: v.id("checkins"),
  _creationTime: v.number(),
});
