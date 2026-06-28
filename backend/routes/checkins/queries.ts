import { v } from "convex/values";

import { query } from "../../_generated/server";
import { getUser } from "../../lib/auth";
import {
  computeCurrentStreak,
  computeLongestStreak,
  getHabitCreatedLocalDay,
  timestampToLocalDay,
} from "../../lib/dates";

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

    const checkins = await ctx.db
      .query("checkins")
      .withIndex("by_habitId", (q) => q.eq("habitId", habitId))
      .order("desc")
      .take(limit);

    return checkins;
  },
});

export const forToday = query({
  args: { localDay: v.string() },
  handler: async (ctx, { localDay }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("checkins")
      .withIndex("by_userId_localDay", (q) =>
        q.eq("userId", user._id).eq("localDay", localDay),
      )
      .collect();
  },
});

export const forDayRange = query({
  args: { days: v.array(v.string()) },
  handler: async (ctx, { days }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const results = [];
    for (const localDay of days) {
      const dayCheckins = await ctx.db
        .query("checkins")
        .withIndex("by_userId_localDay", (q) =>
          q.eq("userId", user._id).eq("localDay", localDay),
        )
        .collect();
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
      .collect();

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
