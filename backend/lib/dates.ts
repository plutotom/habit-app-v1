/** Shared date helpers for Convex backend (keep in sync with src/lib/dates.ts). */

export function timestampToLocalDay(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function shiftLocalDay(localDay: string, days: number): string {
  const d = new Date(localDay + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getHabitCreatedLocalDay(
  habit: { createdAt: number; createdLocalDay?: string },
  timezone: string,
): string {
  return habit.createdLocalDay ?? timestampToLocalDay(habit.createdAt, timezone);
}

export function isDueOnDay(
  habit: { scheduleType: string; allowedDays?: number[] },
  localDay: string,
): boolean {
  if (habit.scheduleType === "daily") return true;
  if (habit.scheduleType === "specific_days" && habit.allowedDays) {
    const d = new Date(localDay + "T12:00:00");
    return habit.allowedDays.includes(d.getDay());
  }
  return true;
}

export function isHabitActiveOnDay(
  habit: {
    createdAt: number;
    createdLocalDay?: string;
    scheduleType: string;
    allowedDays?: number[];
  },
  localDay: string,
  timezone: string,
): boolean {
  const createdDay = getHabitCreatedLocalDay(habit, timezone);
  if (localDay < createdDay) return false;
  return isDueOnDay(habit, localDay);
}

export function prevScheduledDay(
  day: string,
  scheduleType: string,
  allowedDays?: number[],
): string | null {
  if (scheduleType === "daily") {
    return shiftLocalDay(day, -1);
  }

  if (scheduleType === "specific_days" && allowedDays && allowedDays.length > 0) {
    const d = new Date(day + "T12:00:00");
    for (let i = 1; i <= 7; i++) {
      d.setDate(d.getDate() - 1);
      if (allowedDays.includes(d.getDay())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${dd}`;
      }
    }
  }

  return null;
}

export function computeCurrentStreak(
  completed: string[],
  todayLocal: string,
  createdDay: string,
  scheduleType: string,
  allowedDays?: number[],
): number {
  if (completed.length === 0) return 0;

  const newest = completed[0];
  const prevDay = prevScheduledDay(todayLocal, scheduleType, allowedDays);

  const validLatest =
    newest === todayLocal ||
    (prevDay !== null && prevDay >= createdDay && newest === prevDay);

  if (!validLatest) return 0;

  let streak = 1;
  for (let i = 1; i < completed.length; i++) {
    const expectedPrev = prevScheduledDay(
      completed[i - 1],
      scheduleType,
      allowedDays,
    );
    if (!expectedPrev || expectedPrev < createdDay) break;
    if (completed[i] === expectedPrev) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export function computeLongestStreak(
  completed: string[],
  createdDay: string,
  scheduleType: string,
  allowedDays?: number[],
): number {
  const sorted = [...completed].reverse();
  if (sorted.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const expectedPrev = prevScheduledDay(sorted[i], scheduleType, allowedDays);
    if (
      expectedPrev &&
      expectedPrev >= createdDay &&
      sorted[i - 1] === expectedPrev
    ) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}
