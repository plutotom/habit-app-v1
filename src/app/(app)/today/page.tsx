"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/api";
import { useState } from "react";

function getLocalDay(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isDueToday(
  habit: {
    scheduleType: string;
    allowedDays?: number[];
  },
  timezone: string,
): boolean {
  if (habit.scheduleType === "daily") return true;
  if (habit.scheduleType === "specific_days" && habit.allowedDays) {
    const today = new Date(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    );
    return habit.allowedDays.includes(today.getDay());
  }
  return true;
}

export default function TodayPage() {
  const user = useQuery(api.routes.auth.users.current);
  const habits = useQuery(api.routes.habits.queries.list, {});
  const timezone = user?.timezone ?? "UTC";
  const localDay = getLocalDay(timezone);
  const todayCheckins = useQuery(api.routes.checkins.queries.forToday, { localDay });
  const checkin = useMutation(api.routes.checkins.mutations.checkin);
  const undoCheckin = useMutation(api.routes.checkins.mutations.undoCheckin);

  const [loading, setLoading] = useState<string | null>(null);

  if (user === undefined || habits === undefined || todayCheckins === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const checkinMap = new Map(todayCheckins.map((c) => [c.habitId, c]));
  const dueHabits = (habits ?? []).filter((h) => isDueToday(h, timezone));
  const completedCount = dueHabits.filter((h) => {
    const c = checkinMap.get(h._id);
    return c && !c.isSkip;
  }).length;

  async function handleCheckin(habitId: string) {
    setLoading(habitId);
    try {
      const existing = checkinMap.get(habitId as never);
      if (existing && !existing.isSkip) {
        await undoCheckin({ habitId: habitId as never, localDay });
      } else {
        await checkin({ habitId: habitId as never, localDay });
      }
    } finally {
      setLoading(null);
    }
  }

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Today</h1>
          <p className="text-sm text-muted">{dateLabel}</p>
        </div>
        {dueHabits.length > 0 && (
          <span className="text-sm text-muted">
            {completedCount}/{dueHabits.length}
          </span>
        )}
      </div>

      {dueHabits.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-muted">No habits scheduled for today.</p>
          <Link
            href="/habits/new"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
          >
            Add a habit
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {dueHabits.map((habit) => {
          const c = checkinMap.get(habit._id);
          const done = !!c && !c.isSkip;
          const isLoading = loading === habit._id;

          return (
            <li key={habit._id}>
              <div
                className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                  done
                    ? "border-accent/30 bg-accent/10"
                    : "border-border bg-card hover:bg-card/80"
                }`}
              >
                <button
                  onClick={() => handleCheckin(habit._id)}
                  disabled={isLoading}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-lg transition-all ${
                    done
                      ? "border-accent bg-accent text-background"
                      : "border-muted/40 text-transparent hover:border-accent/60"
                  }`}
                  aria-label={done ? "Undo check-in" : "Check in"}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : done ? (
                    "✓"
                  ) : (
                    ""
                  )}
                </button>

                <Link href={`/habits/${habit._id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {habit.emoji && <span>{habit.emoji}</span>}
                    <span
                      className={`font-medium ${done ? "text-muted line-through" : "text-foreground"}`}
                    >
                      {habit.title}
                    </span>
                  </div>
                  {habit.trackType !== "binary" && (
                    <p className="text-xs text-muted mt-0.5">
                      {habit.trackType === "count" &&
                        habit.countTarget &&
                        `Target: ${habit.countTarget}`}
                      {habit.trackType === "duration" &&
                        habit.durationTarget &&
                        `${habit.durationTarget} min`}
                    </p>
                  )}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {habits && habits.length > 0 && dueHabits.length < habits.length && (
        <p className="text-center text-xs text-muted">
          {habits.length - dueHabits.length} habit
          {habits.length - dueHabits.length !== 1 ? "s" : ""} not scheduled today
        </p>
      )}
    </div>
  );
}
