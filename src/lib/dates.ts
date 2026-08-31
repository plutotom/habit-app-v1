export type WeekStart = "mon" | "sun";

export function getLocalDay(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export type WeekDay = {
  label: string;
  date: number;
  localDay: string;
  isToday: boolean;
  isFuture: boolean;
};

/** Returns a Sun–Sat or Mon–Sun week for the given offset (0 = current week). */
export function getWeekDays(
  timezone: string,
  weekOffset = 0,
  weekStart: WeekStart = "mon",
): WeekDay[] {
  const localDayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    day: "numeric",
  });

  const todayLocal = localDayFormatter.format(new Date());
  const today = new Date(todayLocal + "T12:00:00");
  const dayOfWeek = today.getDay();
  const startOffset =
    weekStart === "sun"
      ? -dayOfWeek
      : dayOfWeek === 0
        ? -6
        : 1 - dayOfWeek;

  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayLocal + "T12:00:00");
    d.setDate(d.getDate() + startOffset + weekOffset * 7 + i);
    const localDay = localDayFormatter.format(d);
    days.push({
      label: weekdayFormatter.format(d),
      date: Number(dayFormatter.format(d)),
      localDay,
      isToday: localDay === todayLocal,
      isFuture: localDay > todayLocal,
    });
  }

  return days;
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

export function timestampToLocalDay(
  timestamp: number,
  timezone: string,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function getHabitCreatedLocalDay(
  habit: { createdAt: number; createdLocalDay?: string },
  timezone: string,
): string {
  return habit.createdLocalDay ?? timestampToLocalDay(habit.createdAt, timezone);
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

export function formatCreatedDate(
  habit: { createdAt: number; createdLocalDay?: string },
  timezone: string,
): string {
  const localDay = getHabitCreatedLocalDay(habit, timezone);
  const d = new Date(localDay + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDayHeading(localDay: string, timezone: string): string {
  const today = getLocalDay(timezone);
  if (localDay === today) return "Today";

  const yesterday = shiftLocalDay(today, -1);
  if (localDay === yesterday) return "Yesterday";

  const d = new Date(localDay + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function shiftLocalDay(localDay: string, days: number): string {
  const d = new Date(localDay + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekOffsetForDay(
  localDay: string,
  timezone: string,
  weekStart: WeekStart = "mon",
): number {
  if (getWeekDays(timezone, 0, weekStart).some((d) => d.localDay === localDay)) {
    return 0;
  }

  for (let offset = -1; offset >= -52; offset--) {
    const week = getWeekDays(timezone, offset, weekStart);
    if (week.some((d) => d.localDay === localDay)) return offset;
  }

  return 0;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatCompletedAt(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatShortDate(localDay: string): string {
  return new Date(localDay + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
