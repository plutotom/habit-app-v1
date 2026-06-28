import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { requireUser } from "../../lib/auth";
import { trackTypeValidator, scheduleTypeValidator } from "../../schemas/habits";

const habitFields = {
  title: v.string(),
  description: v.optional(v.string()),
  emoji: v.optional(v.string()),
  color: v.optional(v.string()),
  trackType: trackTypeValidator,
  scheduleType: scheduleTypeValidator,
  countTarget: v.optional(v.number()),
  durationTarget: v.optional(v.number()),
  allowedDays: v.optional(v.array(v.number())),
};

export const create = mutation({
  args: habitFields,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query("habits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const order = existing.length;

    return await ctx.db.insert("habits", {
      ...args,
      userId: user._id,
      isArchived: false,
      order,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    habitId: v.id("habits"),
    ...habitFields,
  },
  handler: async (ctx, { habitId, ...fields }) => {
    const user = await requireUser(ctx);

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");

    await ctx.db.patch(habitId, fields);
  },
});

export const archive = mutation({
  args: { habitId: v.id("habits") },
  handler: async (ctx, { habitId }) => {
    const user = await requireUser(ctx);

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");

    await ctx.db.patch(habitId, { isArchived: true });
  },
});

export const reorder = mutation({
  args: { habitIds: v.array(v.id("habits")) },
  handler: async (ctx, { habitIds }) => {
    const user = await requireUser(ctx);

    await Promise.all(
      habitIds.map((habitId, order) =>
        ctx.db.get(habitId).then((habit) => {
          if (habit && habit.userId === user._id) {
            return ctx.db.patch(habitId, { order });
          }
        }),
      ),
    );
  },
});
