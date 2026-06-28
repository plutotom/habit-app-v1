import { v } from "convex/values";

import { query } from "../../_generated/server";
import { getUser } from "../../lib/auth";

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

export const streak = query({
  args: { habitId: v.id("habits") },
  handler: async (ctx, { habitId }) => {
    const user = await getUser(ctx);
    if (!user) return { current: 0, longest: 0 };

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) return { current: 0, longest: 0 };

    // Fetch all non-skip checkins, ordered newest first
    const checkins = await ctx.db
      .query("checkins")
      .withIndex("by_habitId", (q) => q.eq("habitId", habitId))
      .order("desc")
      .collect();

    const completed = checkins
      .filter((c) => !c.isSkip)
      .map((c) => c.localDay)
      .sort()
      .reverse();

    if (completed.length === 0) return { current: 0, longest: 0 };

    const current = computeCurrentStreak(completed, habit.scheduleType, habit.allowedDays);
    const longest = computeLongestStreak(completed, habit.scheduleType, habit.allowedDays);

    return { current, longest };
  },
});

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round(
    (new Date(a).getTime() - new Date(b).getTime()) / msPerDay,
  );
}

function prevScheduledDay(
  day: string,
  scheduleType: string,
  allowedDays?: number[],
): string | null {
  if (scheduleType === "daily") {
    const d = new Date(day);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  if (scheduleType === "specific_days" && allowedDays && allowedDays.length > 0) {
    const d = new Date(day);
    for (let i = 1; i <= 7; i++) {
      d.setDate(d.getDate() - 1);
      if (allowedDays.includes(d.getDay())) {
        return d.toISOString().slice(0, 10);
      }
    }
  }

  return null;
}

function computeCurrentStreak(
  completed: string[],
  scheduleType: string,
  allowedDays?: number[],
): number {
  if (completed.length === 0) return 0;

  // completed is sorted newest first
  const today = new Date().toISOString().slice(0, 10);
  const newest = completed[0];

  // Streak is broken if the most recent checkin is more than 1 scheduled day ago
  const prevDay = prevScheduledDay(today, scheduleType, allowedDays);
  if (newest !== today && newest !== prevDay) return 0;

  let streak = 1;
  for (let i = 1; i < completed.length; i++) {
    const expectedPrev = prevScheduledDay(completed[i - 1], scheduleType, allowedDays);
    if (completed[i] === expectedPrev) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function computeLongestStreak(
  completed: string[],
  scheduleType: string,
  allowedDays?: number[],
): number {
  if (completed.length === 0) return 0;

  // completed is sorted newest first; reverse for forward iteration
  const sorted = [...completed].reverse();

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const expectedPrev = prevScheduledDay(sorted[i], scheduleType, allowedDays);
    if (sorted[i - 1] === expectedPrev) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}
