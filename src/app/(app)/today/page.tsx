"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/api";
import { Suspense, useEffect, useMemo, useState } from "react";
import { DateStrip } from "@/components/habits/DateStrip";
import { HabitCard } from "@/components/habits/HabitCard";
import {
  formatDayHeading,
  getHabitCreatedLocalDay,
  getLocalDay,
  getWeekDays,
  isHabitActiveOnDay,
  weekOffsetForDay,
} from "@/lib/dates";
import { Id } from "@backend/dataModel";

function TodayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const user = useQuery(api.routes.auth.users.current);
  const habits = useQuery(api.routes.habits.queries.list, {});
  const timezone = user?.timezone ?? "UTC";
  const todayLocal = getLocalDay(timezone);

  const dayParam = searchParams.get("day");
  const selectedDay =
    dayParam && dayParam <= todayLocal ? dayParam : todayLocal;

  const [weekOffset, setWeekOffset] = useState(() =>
    weekOffsetForDay(selectedDay, timezone),
  );

  useEffect(() => {
    setWeekOffset(weekOffsetForDay(selectedDay, timezone));
  }, [selectedDay, timezone]);

  const weekDays = useMemo(
    () => getWeekDays(timezone, weekOffset),
    [timezone, weekOffset],
  );

  const weekDayStrings = useMemo(
    () => weekDays.map((d) => d.localDay),
    [weekDays],
  );

  const weekCheckins = useQuery(api.routes.checkins.queries.forDayRange, {
    days: weekDayStrings,
  });
  const dayCheckins = useQuery(api.routes.checkins.queries.forToday, {
    localDay: selectedDay,
  });
  const checkin = useMutation(api.routes.checkins.mutations.checkin);

  const [completingId, setCompletingId] = useState<string | null>(null);

  function selectDay(localDay: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (localDay === todayLocal) {
      params.delete("day");
    } else {
      params.set("day", localDay);
    }
    const qs = params.toString();
    router.replace(qs ? `/today?${qs}` : "/today", { scroll: false });
    setWeekOffset(weekOffsetForDay(localDay, timezone));
  }

  if (
    user === undefined ||
    habits === undefined ||
    dayCheckins === undefined ||
    weekCheckins === undefined
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  const checkinMap = new Map(dayCheckins.map((c) => [c.habitId, c]));
  const dueHabits = (habits ?? []).filter((h) =>
    isHabitActiveOnDay(h, selectedDay, timezone),
  );
  const isToday = selectedDay === todayLocal;
  const canComplete = isToday;

  const earliestHabitDay =
    habits && habits.length > 0
      ? habits.reduce(
          (earliest, h) => {
            const created = getHabitCreatedLocalDay(h, timezone);
            return created < earliest ? created : earliest;
          },
          getHabitCreatedLocalDay(habits[0], timezone),
        )
      : null;
  const isBeforeAnyHabits =
    earliestHabitDay !== null && selectedDay < earliestHabitDay;

  const completedDays = new Set<string>();
  for (const c of weekCheckins) {
    if (!c.isSkip) completedDays.add(c.localDay);
  }

  const completedCount = dueHabits.filter((h) => {
    const c = checkinMap.get(h._id);
    return c && !c.isSkip;
  }).length;

  const canGoNextWeek = weekOffset < 0;

  async function handleComplete(habitId: Id<"habits">) {
    setCompletingId(habitId);
    try {
      await checkin({ habitId, localDay: selectedDay });
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-lg font-semibold">
            {formatDayHeading(selectedDay, timezone)}
          </h1>
          {dueHabits.length > 0 && (
            <p className="text-xs text-muted">
              {completedCount}/{dueHabits.length} completed
            </p>
          )}
        </div>
        <Link
          href="/habits/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          <span className="text-base leading-none">+</span>
          Habits
        </Link>
      </div>

      {/* Date strip */}
      <DateStrip
        days={weekDays}
        selectedDay={selectedDay}
        todayLocal={todayLocal}
        completedDays={completedDays}
        canGoNextWeek={canGoNextWeek}
        onSelectDay={selectDay}
        onPrevWeek={() => setWeekOffset((o) => o - 1)}
        onNextWeek={() => setWeekOffset((o) => Math.min(o + 1, 0))}
      />

      <div className="h-px bg-border" />

      {!isToday && (
        <p className="rounded-2xl bg-pill px-4 py-3 text-center text-sm text-muted">
          Viewing history — switch to today to complete habits
        </p>
      )}

      {/* Habit cards */}
      {dueHabits.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="font-serif text-xl text-muted">
            {isBeforeAnyHabits
              ? "No habits yet on this day"
              : isToday
                ? "No habits for today"
                : "No habits scheduled"}
          </p>
          {isBeforeAnyHabits && earliestHabitDay && (
            <p className="text-sm text-muted">
              Your first habit starts{" "}
              {new Date(earliestHabitDay + "T12:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric" },
              )}
            </p>
          )}
          {isToday && !isBeforeAnyHabits && (
            <Link
              href="/habits/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <span className="text-base leading-none">+</span>
              Create your first habit
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {dueHabits.map((habit) => {
            const c = checkinMap.get(habit._id);
            const done = !!c && !c.isSkip;

            return (
              <HabitCard
                key={habit._id}
                habitId={habit._id}
                title={habit.title}
                description={habit.description}
                done={done}
                localDay={selectedDay}
                canComplete={canComplete}
                onComplete={() => handleComplete(habit._id)}
              />
            );
          })}
        </div>
      )}

      {completingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      )}
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      }
    >
      <TodayPageContent />
    </Suspense>
  );
}
