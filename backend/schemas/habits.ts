import { defineTable } from "convex/server";
import { v } from "convex/values";

export const trackTypeValidator = v.union(
  v.literal("binary"),
  v.literal("count"),
  v.literal("duration"),
);

export const scheduleTypeValidator = v.union(
  v.literal("daily"),
  v.literal("specific_days"),
);

export const habitTables = {
  habits: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    trackType: trackTypeValidator,
    scheduleType: scheduleTypeValidator,
    countTarget: v.optional(v.number()),
    durationTarget: v.optional(v.number()),
    // Days of week (0=Sun, 1=Mon, ..., 6=Sat) for specific_days schedule
    allowedDays: v.optional(v.array(v.number())),
    isArchived: v.boolean(),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_archived", ["userId", "isArchived"]),
};
