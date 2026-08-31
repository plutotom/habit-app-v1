import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getUser, requireUser } from "./lib/auth";
import {
  computeCurrentStreak,
  computeLongestStreak,
  getHabitCreatedLocalDay,
  isHabitActiveOnDay,
  timestampToLocalDay,
} from "./lib/dates";

const MAX_CHECKINS = 400;
const MAX_RANGE_DAYS = 31;
const MAX_HABITS_PER_DAY = 200;

export const forHabit = query({
  args: {
    habitId: v.id("habits"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { habitId, limit = 90 }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) return [];

    return await ctx.db
      .query("checkins")
      .withIndex("by_habitId", (q) => q.eq("habitId", habitId))
      .order("desc")
      .take(Math.min(limit, MAX_CHECKINS));
  },
});

export const forDayRange = query({
  args: { days: v.array(v.string()) },
  handler: async (ctx, { days }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const results = [];
    for (const localDay of days.slice(0, MAX_RANGE_DAYS)) {
      const dayCheckins = await ctx.db
        .query("checkins")
        .withIndex("by_userId_localDay", (q) =>
          q.eq("userId", user._id).eq("localDay", localDay),
        )
        .take(MAX_HABITS_PER_DAY);
      results.push(...dayCheckins);
    }

    return results;
  },
});

export const streak = query({
  args: { habitId: v.id("habits") },
  handler: async (ctx, { habitId }) => {
    const user = await getUser(ctx);
    if (!user) return { current: 0, longest: 0 };

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) return { current: 0, longest: 0 };

    const timezone = user.timezone ?? "UTC";
    const todayLocal = timestampToLocalDay(Date.now(), timezone);
    const createdDay = getHabitCreatedLocalDay(habit, timezone);

    const checkins = await ctx.db
      .query("checkins")
      .withIndex("by_habitId", (q) => q.eq("habitId", habitId))
      .order("desc")
      .take(MAX_CHECKINS);

    const completed = checkins
      .filter((c) => !c.isSkip && c.localDay >= createdDay)
      .map((c) => c.localDay)
      .sort()
      .reverse();

    if (completed.length === 0) return { current: 0, longest: 0 };

    const current = computeCurrentStreak(
      completed,
      todayLocal,
      createdDay,
      habit.scheduleType,
      habit.allowedDays,
    );
    const longest = computeLongestStreak(
      completed,
      createdDay,
      habit.scheduleType,
      habit.allowedDays,
    );

    return { current, longest };
  },
});

export const checkin = mutation({
  args: {
    habitId: v.id("habits"),
    localDay: v.string(),
  },
  handler: async (ctx, { habitId, localDay }) => {
    const user = await requireUser(ctx);

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");

    const createdDay = getHabitCreatedLocalDay(habit, user.timezone);
    if (localDay < createdDay) {
      throw new Error("Cannot check in before this habit was created");
    }
    if (!isHabitActiveOnDay(habit, localDay, user.timezone)) {
      throw new Error("Habit is not scheduled for this day");
    }

    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_habitId_localDay", (q) =>
        q.eq("habitId", habitId).eq("localDay", localDay),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: 1,
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
      value: 1,
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
