"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@backend/api";
import { Id } from "@backend/dataModel";
import { getLocalDay, getWeekDays, ordinal } from "@/lib/dates";
import { Spinner } from "@/components/ui/Spinner";

function HabitCompletedContent() {
  const { habitId } = useParams<{ habitId: string }>();
  const searchParams = useSearchParams();

  const user = useQuery(api.users.current);
  const habit = useQuery(api.habits.get, {
    habitId: habitId as Id<"habits">,
  });
  const checkins = useQuery(api.checkins.forHabit, {
    habitId: habitId as Id<"habits">,
    limit: 365,
  });

  const timezone = user?.timezone ?? "UTC";
  const weekStart = user?.weekStart ?? "mon";
  const localDay = searchParams.get("day") ?? getLocalDay(timezone);

  if (habit === undefined || checkins === undefined || user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121212]">
        <Spinner className="h-8 w-8" light />
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
  const weekDays = getWeekDays(timezone, 0, weekStart);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#121212] text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, #333 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative flex flex-1 flex-col items-center px-6 pb-10 pt-16">
        <h1 className="text-lg font-semibold tracking-tight">
          Habit completed!
        </h1>

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

        <h2 className="mt-8 text-center font-serif text-3xl leading-tight">
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

        <div className="mt-10 flex w-full max-w-sm justify-between px-2">
          {weekDays.map((day) => {
            const completed = checkinDays.has(day.localDay);
            const isSelected = day.localDay === localDay;

            return (
              <div
                key={day.localDay}
                className="flex flex-col items-center gap-2"
              >
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
                  className={`text-[10px] ${isSelected ? "text-white" : "text-white/50"}`}
                >
                  {day.label}
                </span>
                {isSelected && <div className="h-1 w-1 rounded-full bg-white" />}
              </div>
            );
          })}
        </div>

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
          <Spinner className="h-8 w-8" light />
        </div>
      }
    >
      <HabitCompletedContent />
    </Suspense>
  );
}
