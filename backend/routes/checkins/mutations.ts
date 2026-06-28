import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { requireUser } from "../../lib/auth";

export const checkin = mutation({
  args: {
    habitId: v.id("habits"),
    localDay: v.string(),
    value: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { habitId, localDay, value = 1, note }) => {
    const user = await requireUser(ctx);

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");

    // Upsert: remove existing checkin for this day if any
    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_habitId_localDay", (q) =>
        q.eq("habitId", habitId).eq("localDay", localDay),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        note,
        isSkip: false,
        completedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("checkins", {
      habitId,
      userId: user._id,
      localDay,
      completedAt: Date.now(),
      value,
      note,
      isSkip: false,
    });
  },
});

export const undoCheckin = mutation({
  args: { habitId: v.id("habits"), localDay: v.string() },
  handler: async (ctx, { habitId, localDay }) => {
    const user = await requireUser(ctx);

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");

    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_habitId_localDay", (q) =>
        q.eq("habitId", habitId).eq("localDay", localDay),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const skip = mutation({
  args: { habitId: v.id("habits"), localDay: v.string() },
  handler: async (ctx, { habitId, localDay }) => {
    const user = await requireUser(ctx);

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");

    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_habitId_localDay", (q) =>
        q.eq("habitId", habitId).eq("localDay", localDay),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { isSkip: true, value: 0 });
      return existing._id;
    }

    return await ctx.db.insert("checkins", {
      habitId,
      userId: user._id,
      localDay,
      completedAt: Date.now(),
      value: 0,
      isSkip: true,
    });
  },
});
