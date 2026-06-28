import { v } from "convex/values";

import { query } from "../../_generated/server";
import { getUser } from "../../lib/auth";

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived = false }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const habits = await ctx.db
      .query("habits")
      .withIndex("by_userId_archived", (q) =>
        q.eq("userId", user._id).eq("isArchived", includeArchived),
      )
      .collect();

    return habits.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { habitId: v.id("habits") },
  handler: async (ctx, { habitId }) => {
    const user = await getUser(ctx);
    if (!user) return null;

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) return null;
    return habit;
  },
});
