"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@backend/api";
import { Id } from "@backend/dataModel";
import { getLocalDay, getWeekDays, ordinal } from "@/lib/dates";

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function HabitCompletedContent() {
  const { habitId } = useParams<{ habitId: string }>();
  const searchParams = useSearchParams();

  const user = useQuery(api.routes.auth.users.current);
  const habit = useQuery(api.routes.habits.queries.get, {
    habitId: habitId as Id<"habits">,
  });
  const checkins = useQuery(api.routes.checkins.queries.forHabit, {
    habitId: habitId as Id<"habits">,
    limit: 365,
  });

  const timezone = user?.timezone ?? "UTC";
  const localDay = searchParams.get("day") ?? getLocalDay(timezone);

  if (habit === undefined || checkins === undefined || user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (!habit) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#121212] text-white">
        <p>Habit not found.</p>
        <Link href="/today" className="underline">
          Back to home
        </Link>
      </div>
    );
  }

  const completedCheckins = checkins.filter((c) => !c.isSkip);
  const totalReps = completedCheckins.length;
  const checkinDays = new Set(completedCheckins.map((c) => c.localDay));

  // Build Mon–Sun week containing the completion day
  const weekDays = getWeekDays(timezone);
  const todayIndex = weekDays.findIndex((d) => d.localDay === localDay);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#121212] text-white">
      {/* Dot pattern background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle, #333 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative flex flex-1 flex-col items-center px-6 pb-10 pt-16">
        <h1 className="text-lg font-semibold tracking-tight">
          Habit completed!
        </h1>

        {/* Hexagon badge */}
        <div className="relative mt-10 flex items-center justify-center">
          <div className="absolute h-44 w-44 rounded-full bg-gradient-to-b from-[#f5c842]/40 to-[#f0a020]/20 blur-xl" />
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#f5c842]/60">
            <div
              className="flex h-24 w-24 items-center justify-center bg-gradient-to-b from-[#f5c842] to-[#f0a020]"
              style={{
                clipPath:
                  "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)",
              }}
            >
              <span className="font-serif text-5xl text-[#3d2a00]">
                {totalReps}
              </span>
            </div>
          </div>
        </div>

        {/* Motivational text */}
        <h2 className="font-serif mt-8 text-center text-3xl leading-tight">
          {totalReps === 1
            ? "1st Step to Greatness!"
            : `${ordinal(totalReps)} Step to Greatness!`}
        </h2>
        <p className="mt-3 text-center text-sm text-white/70">
          Congrats! You have earned{" "}
          <span className="font-semibold text-[#f5c842]">
            {totalReps} Rep Milestone
          </span>
        </p>

        {/* Weekly progress */}
        <div className="mt-10 flex w-full max-w-sm justify-between px-2">
          {WEEK_LABELS.map((label, i) => {
            const day = weekDays[i];
            const completed = day ? checkinDays.has(day.localDay) : false;
            const isToday = i === todayIndex;

            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                    completed
                      ? "bg-white text-[#121212]"
                      : "border border-white/40"
                  }`}
                >
                  {completed ? "✓" : ""}
                </div>
                <span
                  className={`text-[10px] ${isToday ? "text-white" : "text-white/50"}`}
                >
                  {label}
                </span>
                {isToday && (
                  <div className="h-1 w-1 rounded-full bg-white" />
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-auto flex w-full max-w-sm flex-col gap-3 pt-10">
          <Link
            href={`/habits/${habitId}`}
            className="flex w-full items-center justify-center rounded-full bg-white py-4 text-sm font-semibold text-[#121212] transition-opacity hover:opacity-90"
          >
            View habit details
          </Link>
          <Link
            href="/today"
            className="flex w-full items-center justify-center rounded-full bg-[#2a2a2a] py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HabitCompletedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#121212]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      }
    >
      <HabitCompletedContent />
    </Suspense>
  );
}
