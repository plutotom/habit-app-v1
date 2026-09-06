/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { shiftLocalDay } from "./lib/dates";

const modules = import.meta.glob("./**/*.ts");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-05T18:00:00Z"));
});
afterEach(() => vi.useRealTimers());

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({
    subject: "owner",
    issuer: "https://api.workos.com/",
  });
  const userId = await owner.mutation(api.users.getOrCreate, {
    timezone: "America/Chicago",
  });
  const habitId = await owner.mutation(api.habits.create, {
    title: "Walk",
    scheduleType: "daily",
  });
  return { t, owner, userId, habitId };
}

test("completion and undo are idempotent, and totals follow each write", async () => {
  const { owner, habitId } = await setup();
  const args = { habitId, localDay: "2026-09-05" };
  await owner.mutation(api.checkins.checkin, args);
  await owner.mutation(api.checkins.checkin, args);
  expect(
    await owner.query(api.checkins.streak, {
      habitId,
      todayLocal: args.localDay,
    }),
  ).toEqual({ current: 1, longest: 1, total: 1 });
  await owner.mutation(api.checkins.undoCheckin, args);
  await owner.mutation(api.checkins.undoCheckin, args);
  expect(
    await owner.query(api.checkins.streak, {
      habitId,
      todayLocal: args.localDay,
    }),
  ).toEqual({ current: 0, longest: 0, total: 0 });
  await owner.mutation(api.checkins.checkin, args);
  expect(
    (
      await owner.query(api.checkins.streak, {
        habitId,
        todayLocal: args.localDay,
      })
    )?.total,
  ).toBe(1);
});

test("other users cannot read, complete, undo, or backfill someone else's habit", async () => {
  const { t, owner, habitId } = await setup();
  await owner.mutation(api.checkins.checkin, {
    habitId,
    localDay: "2026-09-05",
  });
  const other = t.withIdentity({ subject: "other" });
  await other.mutation(api.users.getOrCreate, {});
  expect(await other.query(api.habits.get, { habitId })).toBeNull();
  expect(await other.query(api.checkins.forHabit, { habitId })).toEqual([]);
  expect(
    await other.query(api.checkins.streak, {
      habitId,
      todayLocal: "2026-09-05",
    }),
  ).toBeNull();
  await expect(
    other.mutation(api.checkins.checkin, { habitId, localDay: "2026-09-05" }),
  ).rejects.toThrow();
  await expect(
    other.mutation(api.checkins.undoCheckin, {
      habitId,
      localDay: "2026-09-05",
    }),
  ).rejects.toThrow();
  await expect(
    other.mutation(api.checkins.ensureStatistics, { habitId }),
  ).rejects.toThrow();
});

test("invalid schedules, dates, timezones, archived writes and future check-ins are rejected", async () => {
  const { owner, habitId } = await setup();
  for (const allowedDays of [[], [7], [1.5], [1, 1]]) {
    await expect(
      owner.mutation(api.habits.create, {
        title: "Walk",
        scheduleType: "specific_days",
        allowedDays,
      }),
    ).rejects.toThrow();
  }
  await expect(
    owner.mutation(api.habits.create, { title: " ", scheduleType: "daily" }),
  ).rejects.toThrow();
  await expect(
    owner.mutation(api.users.updateProfile, { timezone: "Not/A_Timezone" }),
  ).rejects.toThrow();
  for (const localDay of [
    "invalid",
    "2026-02-30",
    "2026-09-06",
    "2026-09-04",
  ]) {
    await expect(
      owner.mutation(api.checkins.checkin, { habitId, localDay }),
    ).rejects.toThrow();
  }
  await owner.mutation(api.habits.archive, { habitId });
  await expect(
    owner.mutation(api.checkins.checkin, { habitId, localDay: "2026-09-05" }),
  ).rejects.toThrow();
});

test("legacy history backfills over multiple batches and preserves a 450-day streak", async () => {
  const { t, owner, userId, habitId } = await setup();
  await t.run(async (ctx) => {
    await ctx.db.patch(habitId, {
      createdLocalDay: "2020-01-01",
      statisticsReady: undefined,
    });
    for (let i = 0; i < 450; i++)
      await ctx.db.insert("checkins", {
        habitId,
        userId,
        localDay: shiftLocalDay("2026-09-05", -i),
        completedAt: Date.now(),
        value: 1,
        isSkip: false,
      });
  });
  expect(
    await owner.query(api.checkins.streak, {
      habitId,
      todayLocal: "2026-09-05",
    }),
  ).toBeNull();
  expect(await owner.mutation(api.checkins.ensureStatistics, { habitId })).toBe(
    false,
  );
  // Undo a record already processed by backfill, then resume the remaining batch.
  await owner.mutation(api.checkins.undoCheckin, {
    habitId,
    localDay: "2026-09-05",
  });
  expect(await owner.mutation(api.checkins.ensureStatistics, { habitId })).toBe(
    true,
  );
  expect(
    (
      await owner.query(api.checkins.streak, {
        habitId,
        todayLocal: "2026-09-05",
      })
    )?.total,
  ).toBe(449);
  await owner.mutation(api.checkins.checkin, {
    habitId,
    localDay: "2026-09-05",
  });
  expect(
    await owner.query(api.checkins.streak, {
      habitId,
      todayLocal: "2026-09-05",
    }),
  ).toEqual({ current: 450, longest: 450, total: 450 });
  expect(
    await owner.query(api.checkins.streak, {
      habitId,
      todayLocal: "2026-09-07",
    }),
  ).toEqual({ current: 0, longest: 450, total: 450 });
  const years = await t.run((ctx) => ctx.db.query("habitYears").take(10));
  expect(years.every((year) => year.completedDays.length <= 366)).toBe(true);
});

test("an old best streak survives even when recent completions are beyond the old 400-record window", async () => {
  const { t, owner, userId, habitId } = await setup();
  await t.run(async (ctx) => {
    await ctx.db.patch(habitId, {
      createdLocalDay: "2020-01-01",
      statisticsReady: undefined,
    });
    for (let i = 0; i < 500; i++)
      await ctx.db.insert("checkins", {
        habitId,
        userId,
        localDay: shiftLocalDay("2026-09-05", -i - (i >= 200 ? 1 : 0)),
        completedAt: Date.now(),
        value: 1,
        isSkip: false,
      });
  });
  while (!(await owner.mutation(api.checkins.ensureStatistics, { habitId }))) {
    /* advance bounded backfill */
  }
  expect(
    await owner.query(api.checkins.streak, {
      habitId,
      todayLocal: "2026-09-05",
    }),
  ).toEqual({ current: 200, longest: 300, total: 500 });
});
