import { differenceInWeeks, parseISO } from "date-fns";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { freezeTokens, habits, userCounters } from "@/db/schema";
import { ApiError } from "@/lib/errors";

const FREEZE_CAP = 5;

export async function ensureUserCounters(userId: string) {
  const counters = await db.query.userCounters.findFirst({
    where: eq(userCounters.userId, userId),
  });

  if (counters) {
    return counters;
  }

  const [inserted] = await db
    .insert(userCounters)
    .values({ userId, freezeTokensAvailable: 0 })
    .returning();

  return inserted;
}

export async function grantFreezeTokensIfEligible(userId: string) {
  const counters = await ensureUserCounters(userId);
  const lastGrant = counters.lastFreezeGrantAt;
  const now = new Date();

  if (counters.freezeTokensAvailable >= FREEZE_CAP) {
    return counters;
  }

  if (!lastGrant) {
    return incrementTokens({ userId, weeksToGrant: 1, baseline: counters });
  }

  const weeksElapsed = differenceInWeeks(now, lastGrant, {
    roundingMethod: "floor",
  });

  if (weeksElapsed < 1) {
    return counters;
  }

  return incrementTokens({
    userId,
    weeksToGrant: weeksElapsed,
    baseline: counters,
  });
}

async function incrementTokens({
  userId,
  weeksToGrant,
  baseline,
}: {
  userId: string;
  weeksToGrant: number;
  baseline: typeof userCounters.$inferSelect;
}) {
  const available = Math.min(
    FREEZE_CAP,
    baseline.freezeTokensAvailable + weeksToGrant
  );
  const granted = available - baseline.freezeTokensAvailable;

  const [updated] = await db
    .update(userCounters)
    .set({
      freezeTokensAvailable: available,
      lastFreezeGrantAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userCounters.userId, userId))
    .returning();

  if (granted > 0) {
    const tokens = Array.from({ length: granted }).map(() => ({
      userId,
      status: "available" as const,
    }));
    await db.insert(freezeTokens).values(tokens);
  }

  return updated;
}

export async function activateFreezeToken({
  userId,
  habitId,
  coveredLocalDay,
}: {
  userId: string;
  habitId?: string;
  coveredLocalDay: string;
}) {
  const counters = await ensureUserCounters(userId);

  if (counters.freezeTokensAvailable <= 0) {
    throw new ApiError(422, "No freeze tokens available");
  }

  if (habitId) {
    const habit = await db.query.habits.findFirst({
      where: and(eq(habits.id, habitId), eq(habits.userId, userId)),
    });

    if (!habit) {
      throw new ApiError(404, "Habit not found");
    }
  }

  const coveredDate = parseISO(`${coveredLocalDay}T00:00:00.000Z`);
  const now = new Date();
  const diffWeeks = differenceInWeeks(now, coveredDate, {
    roundingMethod: "floor",
  });

  if (diffWeeks >= 8) {
    throw new ApiError(422, "Freeze tokens can only cover the last 7 weeks");
  }

  const [token] = await db
    .insert(freezeTokens)
    .values({
      userId,
      status: "used",
      coveredHabitId: habitId ?? null,
      coveredLocalDay,
      usedAt: now,
    })
    .returning();

  await db
    .update(userCounters)
    .set({
      freezeTokensAvailable: counters.freezeTokensAvailable - 1,
      updatedAt: new Date(),
    })
    .where(eq(userCounters.userId, userId));

  return token;
}
