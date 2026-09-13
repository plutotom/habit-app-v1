import { shiftLocalDay } from "@/lib/dates";
import type { HabitStatistics, ScheduleType } from "@/local/types";

function previousScheduledDay(
  day: string,
  scheduleType: ScheduleType,
  allowedDays?: number[],
): string | null {
  if (scheduleType === "daily") return shiftLocalDay(day, -1);
  if (!allowedDays?.length) return null;
  let candidate = day;
  for (let index = 0; index < 7; index += 1) {
    candidate = shiftLocalDay(candidate, -1);
    const weekday = new Date(`${candidate}T12:00:00Z`).getUTCDay();
    if (allowedDays.includes(weekday)) return candidate;
  }
  return null;
}

export function computeHabitStatistics(
  completedDays: string[],
  todayLocal: string,
  createdLocalDay: string,
  scheduleType: ScheduleType,
  allowedDays?: number[],
): HabitStatistics {
  const completed = [...new Set(completedDays)]
    .filter((day) => day >= createdLocalDay && day <= todayLocal)
    .sort()
    .reverse();
  const total = completed.length;
  if (total === 0) return { current: 0, longest: 0, total: 0 };

  const previousDue = previousScheduledDay(
    todayLocal,
    scheduleType,
    allowedDays,
  );
  const newest = completed[0]!;
  let current =
    newest === todayLocal ||
    (previousDue !== null &&
      previousDue >= createdLocalDay &&
      newest === previousDue)
      ? 1
      : 0;
  if (current > 0) {
    for (let index = 1; index < completed.length; index += 1) {
      const expected = previousScheduledDay(
        completed[index - 1]!,
        scheduleType,
        allowedDays,
      );
      if (!expected || expected < createdLocalDay) break;
      if (completed[index] !== expected) break;
      current += 1;
    }
  }

  const chronological = [...completed].reverse();
  let longest = 1;
  let run = 1;
  for (let index = 1; index < chronological.length; index += 1) {
    const expected = previousScheduledDay(
      chronological[index]!,
      scheduleType,
      allowedDays,
    );
    if (expected === chronological[index - 1] && expected >= createdLocalDay) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  return { current, longest, total };
}
