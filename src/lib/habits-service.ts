import { addDays, eachDayOfInterval, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import {
  checkins,
  freezeTokens,
  habitAnalyticsDaily,
  habits,
  streaksCache,
  users,
} from "@/db/schema";
import { toLocalDay } from "@/lib/dates";
import { tagHabitAnalytics, tagHabitDetail, tagHabitRecords, tagUserHabits } from "@/lib/cache-tags";
import { ApiError } from "@/lib/errors";
import type { HabitCreateInput, HabitUpdateInput } from "@/lib/validators";

const STREAK_LOOKBACK_DAYS = 120;
const EWMA_ALPHA = 0.2;

export async function listHabits(userId: string) {
  return await unstable_cache(
    async () =>
      db.query.habits.findMany({
        where: eq(habits.userId, userId),
        with: {
          streaksCache: true,
        },
      }),
    ["listHabits", userId],
    { tags: [tagUserHabits(userId)], revalidate: 300 },
  )();
}

export async function createHabit(userId: string, input: HabitCreateInput) {
  validateHabitInput(input);

  const [record] = await db
    .insert(habits)
    .values({
      userId,
      title: input.title,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
      category: input.category ?? null,
      trackType: input.trackType,
      scheduleType: input.scheduleType,
      countTarget: input.countTarget ?? null,
      perPeriod: input.perPeriod ?? null,
      allowedDays: input.allowedDays ?? [],
      dayBoundaryOffsetMinutes: input.dayBoundaryOffsetMinutes ?? 0,
      skipPolicy: input.skipPolicy ?? "none",
      freezeEnabled: input.freezeEnabled ?? true,
    })
    .returning();

  await db
    .insert(streaksCache)
    .values({ habitId: record.id, userId, currentStreak: 0, longestStreak: 0 })
    .onConflictDoNothing();

  return record;
}

export async function getHabitOrThrow(habitId: string, userId: string) {
  const habit = await unstable_cache(
    async () =>
      db.query.habits.findFirst({
        where: and(eq(habits.id, habitId), eq(habits.userId, userId)),
        with: {
          streaksCache: true,
        },
      }),
    ["getHabitOrThrow", habitId, userId],
    { tags: [tagHabitDetail(habitId), tagUserHabits(userId)], revalidate: 300 },
  )();

  if (!habit) {
    throw new ApiError(404, "Habit not found");
  }

  return habit;
}

export async function updateHabit(habitId: string, userId: string, input: HabitUpdateInput) {
  if (Object.keys(input).length === 0) {
    const habit = await getHabitOrThrow(habitId, userId);
    return habit;
  }

  if (input.dayBoundaryOffsetMinutes !== undefined) {
    const value = input.dayBoundaryOffsetMinutes;
    if (value < -720 || value > 720) {
      throw new ApiError(400, "dayBoundaryOffsetMinutes must be between -720 and 720");
    }
  }

  if (input.allowedDays && input.allowedDays.length) {
    const unique = new Set(input.allowedDays);
    if (unique.size !== input.allowedDays.length) {
      throw new ApiError(400, "allowedDays cannot contain duplicates");
    }
  }

  await db
    .update(habits)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));

  return getHabitOrThrow(habitId, userId);
}

export async function listCheckins(
  habitId: string,
  userId: string,
  range?: { start: string; end: string },
) {
  const where = [eq(checkins.habitId, habitId), eq(checkins.userId, userId)];

  if (range?.start) {
    where.push(gte(checkins.localDay, range.start));
  }
  if (range?.end) {
    where.push(lte(checkins.localDay, range.end));
  }

  return await unstable_cache(
    async () =>
      db
        .select()
        .from(checkins)
        .where(and(...where))
        .orderBy(desc(checkins.localDay), desc(checkins.occurredAt)),
    ["listCheckins", habitId, userId, String(range?.start ?? ""), String(range?.end ?? "")],
    { tags: [tagHabitRecords(habitId)], revalidate: 120 },
  )();
}

export async function createCheckin({
  user,
  habit,
  occurredAt,
  quantity,
  note,
  source,
}: {
  user: typeof users.$inferSelect;
  habit: typeof habits.$inferSelect;
  occurredAt: Date;
  quantity?: number;
  note?: string;
  source?: "manual" | "timer";
}) {
  const localDay = toLocalDay(
    occurredAt,
    user.timezone,
    habit.dayBoundaryOffsetMinutes ?? 0,
  );

  if (habit.trackType === "binary") {
    const existing = await db
      .select()
      .from(checkins)
      .where(
        and(
          eq(checkins.habitId, habit.id),
          eq(checkins.userId, user.id),
          eq(checkins.localDay, localDay),
          eq(checkins.isSkip, false),
        ),
      )
      .limit(1);

    if (existing.length) {
      // Idempotent: return existing completion instead of throwing
      return existing[0];
    }
  }

  const [record] = await db
    .insert(checkins)
    .values({
      habitId: habit.id,
      userId: user.id,
      occurredAt,
      localDay,
      quantity: quantity !== undefined ? String(quantity) : null,
      note: note ?? null,
      source: source ?? "manual",
      isSkip: false,
    })
    .returning();

  await recomputeStreaksAndAnalytics({ habit, user, localDay });

  return record;
}

export async function createSkip({
  user,
  habit,
  localDay,
  note,
}: {
  user: typeof users.$inferSelect;
  habit: typeof habits.$inferSelect;
  localDay: string;
  note?: string;
}) {
  // If a skip already exists for this habit and day, return it (avoid unique violation)
  const existing = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.habitId, habit.id),
        eq(checkins.userId, user.id),
        eq(checkins.localDay, localDay),
        eq(checkins.isSkip, true),
      ),
    )
    .limit(1);

  if (existing.length) {
    return existing[0];
  }

  const [record] = await db
    .insert(checkins)
    .values({
      habitId: habit.id,
      userId: user.id,
      occurredAt: new Date(),
      localDay,
      quantity: null,
      note: note ?? null,
      source: "manual",
      isSkip: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!record) {
    // In case of a race, fetch the existing row created by another request
    const [conflicted] = await db
      .select()
      .from(checkins)
      .where(
        and(
          eq(checkins.habitId, habit.id),
          eq(checkins.userId, user.id),
          eq(checkins.localDay, localDay),
          eq(checkins.isSkip, true),
        ),
      )
      .limit(1);
    if (conflicted) {
      return conflicted;
    }
  }

  await recomputeStreaksAndAnalytics({ habit, user, localDay });

  return record!;
}

export async function recomputeStreaksAndAnalytics({
  habit,
  user,
  localDay,
}: {
  habit: typeof habits.$inferSelect;
  user: typeof users.$inferSelect;
  localDay: string;
}) {
  await Promise.all([
    upsertDailyAnalytics({ habit, user, localDay }),
    recomputeStreaks({ habit, user, referenceDay: localDay }),
  ]);
}

async function upsertDailyAnalytics({
  habit,
  user,
  localDay,
}: {
  habit: typeof habits.$inferSelect;
  user: typeof users.$inferSelect;
  localDay: string;
}) {
  const dayCheckins = await db
    .select()
    .from(checkins)
    .where(
      and(
        eq(checkins.habitId, habit.id),
        eq(checkins.userId, user.id),
        eq(checkins.localDay, localDay),
        eq(checkins.isSkip, false),
      ),
    );

  const completions = computeCompletions(habit.trackType, dayCheckins, habit.countTarget);
  const target = habit.trackType === "binary" ? 1 : habit.countTarget ?? 1;
  const completionRate = target > 0 ? Math.min(1, completions / target) : 0;

  const prevDay = format(addDays(new Date(`${localDay}T00:00:00Z`), -1), "yyyy-MM-dd");
  const previous = await db
    .select({ strengthScore: habitAnalyticsDaily.strengthScore })
    .from(habitAnalyticsDaily)
    .where(
      and(
        eq(habitAnalyticsDaily.habitId, habit.id),
        eq(habitAnalyticsDaily.date, prevDay),
      ),
    )
    .limit(1);

  const prevStrength = Number(previous[0]?.strengthScore ?? 0);
  const todayScore = completionRate * 100;
  const strengthScore = Number(
    (EWMA_ALPHA * todayScore + (1 - EWMA_ALPHA) * prevStrength).toFixed(2),
  );

  await db
    .insert(habitAnalyticsDaily)
    .values({
      habitId: habit.id,
      userId: user.id,
      date: localDay,
      completions: Math.round(completions),
      target,
      completionRate: String(completionRate),
      strengthScore: String(strengthScore),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [habitAnalyticsDaily.habitId, habitAnalyticsDaily.date],
      set: {
        completions: Math.round(completions),
        target,
        completionRate: String(completionRate),
        strengthScore: String(strengthScore),
        updatedAt: new Date(),
      },
    });
}

async function recomputeStreaks({
  habit,
  user,
  referenceDay,
}: {
  habit: typeof habits.$inferSelect;
  user: typeof users.$inferSelect;
  referenceDay: string;
}) {
  const timezone = user.timezone ?? "UTC";
  const offset = habit.dayBoundaryOffsetMinutes ?? 0;
  const endDay = referenceDay;
  const lookbackStart = format(
    addDays(new Date(`${referenceDay}T00:00:00Z`), -STREAK_LOOKBACK_DAYS),
    "yyyy-MM-dd",
  );

  const records = await db
    .select({
      localDay: checkins.localDay,
      quantity: checkins.quantity,
      isSkip: checkins.isSkip,
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.habitId, habit.id),
        eq(checkins.userId, user.id),
        gte(checkins.localDay, lookbackStart),
        lte(checkins.localDay, endDay),
      ),
    )
    .orderBy(asc(checkins.localDay));

  const freezeDays = await db
    .select({ day: freezeTokens.coveredLocalDay })
    .from(freezeTokens)
    .where(
      and(
        eq(freezeTokens.userId, user.id),
        eq(freezeTokens.status, "used"),
        eq(freezeTokens.coveredHabitId, habit.id),
        gte(freezeTokens.coveredLocalDay, lookbackStart),
        lte(freezeTokens.coveredLocalDay, endDay),
      ),
    );

  const successDays = new Map<string, { completions: number; isSkip: boolean }>();
  for (const record of records) {
    const key = record.localDay;
    const entry = successDays.get(key) ?? { completions: 0, isSkip: false };
    entry.isSkip = entry.isSkip || record.isSkip;
    if (!record.isSkip && record.quantity) {
      entry.completions += Number(record.quantity);
    } else if (!record.isSkip) {
      entry.completions += 1;
    }
    successDays.set(key, entry);
  }

  const freezeSet = new Set(freezeDays.map((row) => row.day).filter((day): day is string => Boolean(day)));
  const allowedDays =
    Array.isArray(habit.allowedDays) && habit.allowedDays.length > 0
      ? (habit.allowedDays as string[])
      : null;

  const expectedDays = buildExpectedDays({
    schedule: habit.scheduleType,
    allowedDays,
    timezone,
    offset,
    start: lookbackStart,
    end: endDay,
  });

  let currentStreak = 0;
  let longestStreak = 0;
  let chain = 0;

  for (const day of expectedDays) {
    const isSuccess = dayMetExpectation({
      day,
      habit,
      successDays,
      freezeSet,
    });

    if (isSuccess) {
      chain += 1;
      if (chain > longestStreak) {
        longestStreak = chain;
      }
    } else {
      chain = 0;
    }
  }

  for (let i = expectedDays.length - 1; i >= 0; i -= 1) {
    const day = expectedDays[i];
    if (dayMetExpectation({ day, habit, successDays, freezeSet })) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  await db
    .insert(streaksCache)
    .values({
      habitId: habit.id,
      userId: user.id,
      currentStreak,
      longestStreak,
      lastSuccessLocalDay:
        currentStreak > 0 ? expectedDays[expectedDays.length - 1] ?? null : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [streaksCache.habitId],
      set: {
        currentStreak,
        longestStreak,
        lastSuccessLocalDay:
          currentStreak > 0 ? expectedDays[expectedDays.length - 1] ?? null : null,
        updatedAt: new Date(),
      },
    });
}

function buildExpectedDays({
  schedule,
  allowedDays,
  timezone,
  offset,
  start,
  end,
}: {
  schedule: string;
  allowedDays: string[] | null;
  timezone: string;
  offset: number;
  start: string;
  end: string;
}) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return days
    .map((date) => {
      const local = toLocalDay(date, timezone, offset);
      if (schedule === "monthly") {
        return local;
      }

      if (!allowedDays || allowedDays.length === 0) {
        return local;
      }

      const dayOfWeek = formatInTimeZone(date, timezone, "EEE").slice(0, 3).toLowerCase();
      if (allowedDays.includes(dayOfWeek)) {
        return local;
      }
      return null;
    })
    .filter((value): value is string => value !== null);
}

function dayMetExpectation({
  day,
  habit,
  successDays,
  freezeSet,
}: {
  day: string;
  habit: typeof habits.$inferSelect;
  successDays: Map<string, { completions: number; isSkip: boolean }>;
  freezeSet: Set<string>;
}) {
  const info = successDays.get(day);
  const target = habit.trackType === "binary" ? 1 : habit.countTarget ?? 1;

  if (info && info.isSkip) {
    return true;
  }

  if (info && info.completions >= target) {
    return true;
  }

  if (freezeSet.has(day)) {
    return true;
  }

  return false;
}

function validateHabitInput(input: HabitCreateInput) {
  if (input.scheduleType !== "daily" && input.scheduleType !== "custom") {
    if (!input.countTarget || input.countTarget <= 0) {
      throw new ApiError(
        400,
        "countTarget must be provided for weekly and monthly schedules",
      );
    }
  }
}

export function computeCompletions(
  trackType: string,
  dayCheckins: typeof checkins.$inferSelect[],
  countTarget?: number | null,
) {
  if (trackType === "binary") {
    return dayCheckins.length > 0 ? 1 : 0;
  }

  if (trackType === "count" || trackType === "duration" || trackType === "timer") {
    return dayCheckins.reduce((total, record) => {
      return total + Number(record.quantity ?? 0);
    }, 0);
  }

  return countTarget ?? 1;
}

export async function getHabitAnalyticsRange({
  habitId,
  userId,
  start,
  end,
}: {
  habitId: string;
  userId: string;
  start: string;
  end: string;
}) {
  const rows = await unstable_cache(
    async () =>
      db
        .select()
        .from(habitAnalyticsDaily)
        .where(
          and(
            eq(habitAnalyticsDaily.habitId, habitId),
            eq(habitAnalyticsDaily.userId, userId),
            gte(habitAnalyticsDaily.date, start),
            lte(habitAnalyticsDaily.date, end),
          ),
        )
        .orderBy(asc(habitAnalyticsDaily.date)),
    ["getHabitAnalyticsRange", habitId, userId, start, end],
    { tags: [tagHabitAnalytics(habitId)], revalidate: 300 },
  )();

  return rows;
}

export async function deleteHabit(habitId: string, userId: string) {
  await db.delete(habits).where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
}

