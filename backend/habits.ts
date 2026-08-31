import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireUser, getUser } from "./lib/auth";
import { timestampToLocalDay } from "./lib/dates";
import { scheduleTypeValidator } from "./schema";

const MAX_HABITS = 200;

const habitFields = {
  title: v.string(),
  description: v.optional(v.string()),
  scheduleType: scheduleTypeValidator,
  allowedDays: v.optional(v.array(v.number())),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const habits = await ctx.db
      .query("habits")
      .withIndex("by_userId_archived", (q) =>
        q.eq("userId", user._id).eq("isArchived", false),
      )
      .take(MAX_HABITS);

    return habits.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { habitId: v.id("habits") },
  handler: async (ctx, { habitId }) => {
    const user = await getUser(ctx);
    if (!user) return null;

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id || habit.isArchived) return null;
    return habit;
  },
});

export const create = mutation({
  args: habitFields,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query("habits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(MAX_HABITS);

    const createdAt = Date.now();

    return await ctx.db.insert("habits", {
      title: args.title,
      description: args.description,
      scheduleType: args.scheduleType,
      allowedDays:
        args.scheduleType === "specific_days" ? args.allowedDays : undefined,
      userId: user._id,
      isArchived: false,
      order: existing.length,
      createdAt,
      createdLocalDay: timestampToLocalDay(createdAt, user.timezone),
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

    await ctx.db.patch(habitId, {
      title: fields.title,
      description: fields.description,
      scheduleType: fields.scheduleType,
      allowedDays:
        fields.scheduleType === "specific_days" ? fields.allowedDays : undefined,
    });
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
