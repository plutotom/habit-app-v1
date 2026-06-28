import { defineTable } from "convex/server";
import { v } from "convex/values";

export const weekStartValidator = v.union(v.literal("mon"), v.literal("sun"));

export const userTables = {
  users: defineTable({
    workosId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    timezone: v.string(),
    weekStart: weekStartValidator,
    createdAt: v.number(),
  }).index("by_workosId", ["workosId"]),
};
