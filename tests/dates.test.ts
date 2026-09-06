import { afterEach, expect, test, vi } from "vitest";
import { getWeekDays, shiftLocalDay, weekOffsetForDay } from "../src/lib/dates";
import { computeCurrentStreak } from "../backend/lib/dates";
import { isLocalDay } from "../shared/validation";

afterEach(() => vi.useRealTimers());

test("weekdays do not shift when profile and device timezones differ", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-05T18:00:00Z"));
  for (const zone of [
    "Asia/Tokyo",
    "Pacific/Kiritimati",
    "America/Chicago",
    "Pacific/Honolulu",
  ]) {
    expect(getWeekDays(zone, 0, "mon").map((day) => day.label)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(getWeekDays(zone, 0, "sun")[0]?.label).toBe("Sun");
  }
});

test("calendar arithmetic handles leap days, DST, year boundaries, and history older than a year", () => {
  expect(shiftLocalDay("2024-02-28", 1)).toBe("2024-02-29");
  expect(shiftLocalDay("2026-03-08", 1)).toBe("2026-03-09");
  expect(shiftLocalDay("2025-12-31", 1)).toBe("2026-01-01");
  expect(isLocalDay("2026-02-29")).toBe(false);
  expect(isLocalDay("2024-02-29")).toBe(true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-05T18:00:00Z"));
  const offset = weekOffsetForDay("2024-01-01", "America/Chicago", "mon");
  expect(offset).toBeLessThan(-52);
  expect(getWeekDays("America/Chicago", offset, "mon")[0]?.localDay).toBe(
    "2024-01-01",
  );
});

test("scheduled streaks survive rest days but expire after a missed scheduled day", () => {
  const days = ["2026-09-04", "2026-09-02", "2026-08-31"];
  expect(
    computeCurrentStreak(
      days,
      "2026-09-06",
      "2026-08-01",
      "specific_days",
      [1, 3, 5],
    ),
  ).toBe(3);
  expect(
    computeCurrentStreak(
      days,
      "2026-09-08",
      "2026-08-01",
      "specific_days",
      [1, 3, 5],
    ),
  ).toBe(0);
});
