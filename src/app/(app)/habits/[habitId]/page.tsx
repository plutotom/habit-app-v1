"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/api";
import { Id } from "@backend/dataModel";

function getLocalDay(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function HabitDetailPage() {
  const { habitId } = useParams<{ habitId: string }>();
  const router = useRouter();

  const user = useQuery(api.routes.auth.users.current);
  const habit = useQuery(api.routes.habits.queries.get, {
    habitId: habitId as Id<"habits">,
  });
  const checkins = useQuery(api.routes.checkins.queries.forHabit, {
    habitId: habitId as Id<"habits">,
    limit: 60,
  });
  const streak = useQuery(api.routes.checkins.queries.streak, {
    habitId: habitId as Id<"habits">,
  });
  const archive = useMutation(api.routes.habits.mutations.archive);
  const checkinMutation = useMutation(api.routes.checkins.mutations.checkin);
  const undoCheckin = useMutation(api.routes.checkins.mutations.undoCheckin);

  const timezone = user?.timezone ?? "UTC";
  const localDay = getLocalDay(timezone);

  if (habit === undefined || checkins === undefined || streak === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="py-20 text-center text-muted">
        Habit not found.{" "}
        <Link href="/today" className="text-accent hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  const todayCheckin = checkins.find(
    (c) => c.localDay === localDay && !c.isSkip,
  );
  const checkinMap = new Map(checkins.map((c) => [c.localDay, c]));

  // Build last 35 days grid
  const days: Array<{ day: string; status: "done" | "skip" | "missed" | "future" }> = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    const c = checkinMap.get(day);
    if (day > localDay) {
      days.push({ day, status: "future" });
    } else if (c) {
      days.push({ day, status: c.isSkip ? "skip" : "done" });
    } else {
      days.push({ day, status: "missed" });
    }
  }

  async function handleTodayCheckin() {
    if (todayCheckin) {
      await undoCheckin({ habitId: habitId as Id<"habits">, localDay });
    } else {
      await checkinMutation({ habitId: habitId as Id<"habits">, localDay });
    }
  }

  async function handleArchive() {
    if (!confirm("Archive this habit? You can't undo this easily.")) return;
    await archive({ habitId: habitId as Id<"habits"> });
    router.push("/today");
  }

  const statusColor = {
    done: "bg-accent",
    skip: "bg-muted/30",
    missed: "bg-card",
    future: "bg-card/40",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {habit.emoji && <span className="text-2xl">{habit.emoji}</span>}
            <h1 className="text-2xl font-semibold">{habit.title}</h1>
          </div>
          {habit.description && (
            <p className="mt-1 text-sm text-muted">{habit.description}</p>
          )}
        </div>
        <Link
          href={`/habits/${habitId}/edit`}
          className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Streak stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <div className="text-3xl font-bold text-accent">{streak.current}</div>
          <div className="text-xs text-muted mt-1">Current streak</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <div className="text-3xl font-bold text-foreground">{streak.longest}</div>
          <div className="text-xs text-muted mt-1">Longest streak</div>
        </div>
      </div>

      {/* Today check-in */}
      <button
        onClick={handleTodayCheckin}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold transition-all ${
          todayCheckin
            ? "bg-accent/20 border border-accent/40 text-foreground"
            : "bg-accent text-background hover:opacity-90"
        }`}
      >
        {todayCheckin ? "✓ Done today — tap to undo" : "Mark done today"}
      </button>

      {/* 35-day heatmap */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Last 35 days</h2>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ day, status }) => (
            <div
              key={day}
              title={day}
              className={`aspect-square rounded-md ${statusColor[status]}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-accent" /> Done
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-card border border-border" /> Missed
          </span>
        </div>
      </div>

      {/* Schedule info */}
      <div className="rounded-2xl border border-border bg-card p-4 text-sm">
        <div className="flex justify-between text-muted">
          <span>Track type</span>
          <span className="capitalize text-foreground">{habit.trackType}</span>
        </div>
        <div className="mt-2 flex justify-between text-muted">
          <span>Schedule</span>
          <span className="text-foreground">
            {habit.scheduleType === "daily"
              ? "Every day"
              : `${habit.allowedDays?.length ?? 0} days/week`}
          </span>
        </div>
        {habit.trackType === "count" && habit.countTarget && (
          <div className="mt-2 flex justify-between text-muted">
            <span>Daily target</span>
            <span className="text-foreground">{habit.countTarget}</span>
          </div>
        )}
        {habit.trackType === "duration" && habit.durationTarget && (
          <div className="mt-2 flex justify-between text-muted">
            <span>Duration target</span>
            <span className="text-foreground">{habit.durationTarget} min</span>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <button
        onClick={handleArchive}
        className="rounded-xl border border-border py-2.5 text-sm text-muted hover:border-red-500/50 hover:text-red-400 transition-colors"
      >
        Archive habit
      </button>
    </div>
  );
}
