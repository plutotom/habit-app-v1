import { addMinutes, endOfMonth, endOfWeek, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone, utcToZonedTime } from "date-fns-tz";

export function toLocalDay(
  date: Date,
  timezone: string,
  offsetMinutes = 0,
): string {
  const shifted = addMinutes(date, offsetMinutes);
  const zoned = utcToZonedTime(shifted, timezone);
  return formatInTimeZone(zoned, timezone, "yyyy-MM-dd");
}

export function parseLocalDay(localDay: string): Date {
  return parseISO(`${localDay}T00:00:00.000Z`);
}

export function getPeriodBounds(
  schedule: "daily" | "weekly" | "monthly",
  localDay: string,
  options: { weekStartsOn: 0 | 1 },
) {
  const day = parseISO(localDay);
  if (schedule === "weekly") {
    return {
      start: startOfWeek(day, options),
      end: endOfWeek(day, options),
    };
  }

  if (schedule === "monthly") {
    return {
      start: startOfMonth(day),
      end: endOfMonth(day),
    };
  }

  return { start: day, end: day };
}

