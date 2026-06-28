import { defineTable } from "convex/server";
import { v } from "convex/values";

export const checkinTables = {
  checkins: defineTable({
    habitId: v.id("habits"),
    userId: v.id("users"),
    // User's local date in YYYY-MM-DD format
    localDay: v.string(),
    completedAt: v.number(),
    // 1 for binary, actual count/minutes for count/duration
    value: v.number(),
    note: v.optional(v.string()),
    isSkip: v.boolean(),
  })
    .index("by_habitId_localDay", ["habitId", "localDay"])
    .index("by_userId_localDay", ["userId", "localDay"])
    .index("by_habitId", ["habitId"]),
};
