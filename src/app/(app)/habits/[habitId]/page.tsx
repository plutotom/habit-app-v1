"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@backend/api";
import { Id } from "@backend/dataModel";
import {
  formatCompletedAt,
  formatCreatedDate,
  getHabitCreatedLocalDay,
  getLocalDay,
  isHabitActiveOnDay,
  shiftLocalDay,
} from "@/lib/dates";

type DayStatus =
  | "done"
  | "skip"
  | "missed"
  | "future"
  | "before_creation"
  | "not_scheduled";

export default function HabitDetailPage() {
  const { habitId } = useParams<{ habitId: string }>();

  const user = useQuery(api.routes.auth.users.current);
  const habit = useQuery(api.routes.habits.queries.get, {
    habitId: habitId as Id<"habits">,
  });
  const checkins = useQuery(api.routes.checkins.queries.forHabit, {
    habitId: habitId as Id<"habits">,
    limit: 120,
  });
  const streak = useQuery(api.routes.checkins.queries.streak, {
    habitId: habitId as Id<"habits">,
  });

  const timezone = user?.timezone ?? "UTC";
  const localDay = getLocalDay(timezone);

  if (
    habit === undefined ||
    checkins === undefined ||
    streak === undefined ||
    user === undefined
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="py-20 text-center text-muted">
        Habit not found.{" "}
        <Link href="/today" className="text-foreground hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  const createdDay = getHabitCreatedLocalDay(habit, timezone);
  const completed = checkins.filter((c) => !c.isSkip);
  const totalReps = completed.length;
  const checkinMap = new Map(checkins.map((c) => [c.localDay, c]));

  const heatmapDays: Array<{ day: string; status: DayStatus }> = [];
  for (let i = 34; i >= 0; i--) {
    const day = shiftLocalDay(localDay, -i);
    const c = checkinMap.get(day);

    if (day > localDay) {
      heatmapDays.push({ day, status: "future" });
    } else if (day < createdDay) {
      heatmapDays.push({ day, status: "before_creation" });
    } else if (c) {
      heatmapDays.push({ day, status: c.isSkip ? "skip" : "done" });
    } else if (!isHabitActiveOnDay(habit, day, timezone)) {
      heatmapDays.push({ day, status: "not_scheduled" });
    } else {
      heatmapDays.push({ day, status: "missed" });
    }
  }

  const statusColor: Record<DayStatus, string> = {
    done: "bg-accent-orange",
    skip: "bg-pill",
    missed: "bg-pill/50",
    future: "bg-transparent border border-border/50",
    before_creation: "bg-transparent",
    not_scheduled: "bg-pill/30",
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Link
          href="/today"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pill text-muted transition-colors hover:text-foreground"
          aria-label="Back"
        >
          ←
        </Link>
        <Link
          href={`/habits/${habitId}/edit`}
          className="rounded-full bg-pill px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Edit
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-serif text-2xl text-foreground">{habit.title}</p>
        {habit.description && (
          <>
            <p className="text-sm text-muted">I want to become</p>
            <p className="font-serif text-2xl text-foreground">
              {habit.description}
            </p>
          </>
        )}
        <p className="mt-2 text-sm text-muted">
          Started {formatCreatedDate(habit, timezone)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-surface p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-accent-orange">
            {streak.current}
          </div>
          <div className="mt-1 text-[10px] font-medium text-muted">
            Current streak
          </div>
        </div>
        <div className="rounded-2xl bg-surface p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-foreground">
            {streak.longest}
          </div>
          <div className="mt-1 text-[10px] font-medium text-muted">
            Best streak
          </div>
        </div>
        <div className="rounded-2xl bg-surface p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-foreground">{totalReps}</div>
          <div className="mt-1 text-[10px] font-medium text-muted">
            Total reps
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Last 35 days</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapDays.map(({ day, status }) => {
            const clickable =
              status !== "before_creation" && status !== "future";
            const className = `aspect-square rounded-lg ${statusColor[status]} ${
              clickable ? "transition-opacity hover:opacity-80" : ""
            }`;

            if (!clickable) {
              return (
                <div
                  key={day}
                  title={day}
                  className={className}
                  aria-hidden
                />
              );
            }

            return (
              <Link
                key={day}
                href={`/today?day=${day}`}
                title={day}
                className={className}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-accent-orange" />
            Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-pill/50" />
            Missed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-pill/30" />
            Off day
          </span>
        </div>
      </div>

      {/* History list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Completion history</h2>
        {completed.length === 0 ? (
          <p className="rounded-2xl bg-pill px-4 py-6 text-center text-sm text-muted">
            No completions yet
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {completed.slice(0, 30).map((c) => (
              <li key={c._id}>
                <Link
                  href={`/today?day=${c.localDay}`}
                  className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-sm transition-colors hover:bg-pill"
                >
                  <span className="text-sm font-medium">
                    {new Date(c.localDay + "T12:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      },
                    )}
                  </span>
                  <span className="text-xs text-muted">
                    {formatCompletedAt(c.completedAt, timezone)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
