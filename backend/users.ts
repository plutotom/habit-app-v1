import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { weekStartValidator, userDocValidator } from "./schema";
import { validateTimezone } from "../shared/validation";

export const current = query({
  args: {},
  returns: v.union(v.null(), userDocValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
      .unique();
  },
});

export const getOrCreate = mutation({
  returns: v.id("users"),
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
      .unique();
    if (existing) return existing._id;
    validateTimezone(args.timezone ?? "UTC");

    return await ctx.db.insert("users", {
      workosId: identity.subject,
      email: identity.email ?? args.email ?? "",
      name: args.name,
      timezone: args.timezone ?? "UTC",
      weekStart: "mon",
      createdAt: Date.now(),
    });
  },
});

export const updateProfile = mutation({
  returns: v.null(),
  args: {
    timezone: v.optional(v.string()),
    weekStart: v.optional(weekStartValidator),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_workosId", (q) => q.eq("workosId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");
    if (args.timezone !== undefined) validateTimezone(args.timezone);

    await ctx.db.patch(user._id, {
      ...(args.timezone !== undefined ? { timezone: args.timezone } : {}),
      ...(args.weekStart !== undefined ? { weekStart: args.weekStart } : {}),
      ...(args.name !== undefined ? { name: args.name } : {}),
    });
    return null;
  },
});
