import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getUser, requireUser } from "./lib/auth";
import { validateLocalDay } from "../shared/validation";
import { setCompletedDay } from "./lib/statistics";
import { checkinDocValidator } from "./schema";
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
  returns: v.array(checkinDocValidator),
  args: {
    habitId: v.id("habits"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { habitId, limit = 90 }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) return [];

    if (!Number.isInteger(limit) || limit < 1)
      throw new Error("Limit must be a positive integer");
    return await ctx.db
      .query("checkins")
      .withIndex("by_habitId_localDay", (q) => q.eq("habitId", habitId))
      .order("desc")
      .take(Math.min(limit, MAX_CHECKINS));
  },
});

export const forDayRange = query({
  returns: v.array(checkinDocValidator),
  args: { days: v.array(v.string()) },
  handler: async (ctx, { days }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    if (days.length > MAX_RANGE_DAYS)
      throw new Error("Request at most 31 days");
    const results = [];
    for (const localDay of new Set(days)) {
      validateLocalDay(localDay);
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
  args: { habitId: v.id("habits"), todayLocal: v.string() },
  returns: v.union(
    v.null(),
    v.object({ current: v.number(), longest: v.number(), total: v.number() }),
  ),
  handler: async (ctx, { habitId, todayLocal }) => {
    validateLocalDay(todayLocal);
    const user = await getUser(ctx);
    if (!user) return null;

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id || !habit.statisticsReady)
      return null;

    const timezone = user.timezone ?? "UTC";
    const createdDay = getHabitCreatedLocalDay(habit, timezone);

    // Four-digit dates admit at most 10,000 yearly buckets, with <=366 days each.
    const years = await ctx.db
      .query("habitYears")
      .withIndex("by_habitId_and_year", (q) => q.eq("habitId", habitId))
      .take(10_000);

    const completed = years
      .flatMap((year) => year.completedDays)
      .filter((day) => day >= createdDay && day <= todayLocal)
      .sort()
      .reverse();

    if (completed.length === 0) return { current: 0, longest: 0, total: 0 };

    const scheduled = completed.filter((day) =>
      isHabitActiveOnDay(habit, day, timezone),
    );

    const current = computeCurrentStreak(
      scheduled,
      todayLocal,
      createdDay,
      habit.scheduleType,
      habit.allowedDays,
    );
    const longest = computeLongestStreak(
      scheduled,
      createdDay,
      habit.scheduleType,
      habit.allowedDays,
    );

    return { current, longest, total: completed.length };
  },
});

/** Resumable, transactional backfill for pre-summary habits; no check-ins are deleted. */
export const ensureStatistics = mutation({
  args: { habitId: v.id("habits") },
  returns: v.boolean(),
  handler: async (ctx, { habitId }) => {
    const user = await requireUser(ctx);
    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");
    if (habit.statisticsReady) return true;
    const batch = await ctx.db
      .query("checkins")
      .withIndex("by_habitId", (q) => q.eq("habitId", habitId))
      .paginate({ cursor: habit.statisticsCursor ?? null, numItems: 256 });
    for (const checkin of batch.page) {
      await setCompletedDay(ctx, habitId, checkin.localDay, !checkin.isSkip);
    }
    await ctx.db.patch(habitId, {
      statisticsReady: batch.isDone,
      statisticsCursor: batch.isDone ? undefined : batch.continueCursor,
    });
    return batch.isDone;
  },
});

export const checkin = mutation({
  returns: v.id("checkins"),
  args: {
    habitId: v.id("habits"),
    localDay: v.string(),
  },
  handler: async (ctx, { habitId, localDay }) => {
    const user = await requireUser(ctx);

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");

    validateLocalDay(localDay);
    if (habit.isArchived) throw new Error("Cannot complete an archived habit");
    if (localDay !== timestampToLocalDay(Date.now(), user.timezone)) {
      throw new Error("Only today's habits can be completed");
    }
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

    await setCompletedDay(ctx, habitId, localDay, true);
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
  returns: v.null(),
  args: { habitId: v.id("habits"), localDay: v.string() },
  handler: async (ctx, { habitId, localDay }) => {
    const user = await requireUser(ctx);

    const habit = await ctx.db.get(habitId);
    if (!habit || habit.userId !== user._id) throw new Error("Habit not found");

    validateLocalDay(localDay);
    if (
      habit.isArchived ||
      localDay !== timestampToLocalDay(Date.now(), user.timezone)
    ) {
      throw new Error("Only today's active habits can be undone");
    }
    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_habitId_localDay", (q) =>
        q.eq("habitId", habitId).eq("localDay", localDay),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    await setCompletedDay(ctx, habitId, localDay, false);
    return null;
  },
});
