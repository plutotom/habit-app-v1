"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { api } from "@backend/api";
import { Id } from "@backend/dataModel";

const HOLD_DURATION_MS = 3000;

type HabitCardProps = {
  habitId: Id<"habits">;
  title: string;
  description?: string;
  done: boolean;
  localDay: string;
  canComplete: boolean;
  onComplete: () => Promise<void>;
};

export function HabitCard({
  habitId,
  title,
  description,
  done,
  localDay,
  canComplete,
  onComplete,
}: HabitCardProps) {
  const router = useRouter();
  const streak = useQuery(api.routes.checkins.queries.streak, { habitId });
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdStartRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  const startHold = useCallback(() => {
    if (done || isCompleting || !canComplete) return;

    holdStartRef.current = Date.now();
    setIsHolding(true);
    setHoldProgress(0);

    holdTimerRef.current = setInterval(() => {
      if (!holdStartRef.current) return;
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        setIsCompleting(true);
        void onComplete().then(() => {
          router.push(`/habits/${habitId}/completed?day=${localDay}`);
        });
      }
    }, 16);
  }, [done, isCompleting, canComplete, habitId, localDay, onComplete, router]);

  const streakCount = streak?.current ?? 0;

  return (
    <div className="relative px-2">
      {/* Streak badge */}
      <div className="absolute -right-1 top-6 z-10 flex flex-col items-center rounded-2xl bg-gradient-to-b from-[#f5c842] to-[#f0a020] px-2.5 py-2 shadow-sm">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-foreground"
          aria-hidden
        >
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
        </svg>
        <span className="text-xs font-bold text-foreground">{streakCount}</span>
      </div>

      <div
        className={`relative overflow-hidden rounded-[2rem] bg-surface px-8 py-14 shadow-[0_2px_24px_rgba(0,0,0,0.06)] select-none ${
          done ? "opacity-70" : canComplete ? "cursor-pointer touch-none" : ""
        }`}
        onPointerDown={(e) => {
          if (!canComplete) return;
          e.preventDefault();
          startHold();
        }}
        onPointerUp={canComplete ? clearHold : undefined}
        onPointerLeave={canComplete ? clearHold : undefined}
        onPointerCancel={canComplete ? clearHold : undefined}
        onContextMenu={(e) => e.preventDefault()}
        role={canComplete ? "button" : undefined}
        aria-label={
          done
            ? "Habit completed"
            : canComplete
              ? "Hold for 3 seconds to complete"
              : "Habit history"
        }
        tabIndex={canComplete && !done ? 0 : -1}
      >
        {/* Hold progress ring */}
        {isHolding && !done && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg className="h-48 w-48 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="3"
              />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="#f5a623"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${holdProgress * 289} 289`}
              />
            </svg>
          </div>
        )}

        {/* Menu */}
        <div className="mb-10 flex justify-center gap-2">
          <Link
            href={`/habits/${habitId}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full bg-pill px-4 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            Details
          </Link>
          <Link
            href={`/habits/${habitId}/edit`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full bg-pill px-4 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            Edit
          </Link>
        </div>

        {/* Habit content */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-serif text-[1.65rem] leading-snug text-foreground">
            {title}
          </p>
          {description && (
            <>
              <p className="text-sm text-muted">I want to become</p>
              <p className="font-serif text-[1.65rem] leading-snug text-foreground">
                {description}
              </p>
            </>
          )}
        </div>

        {done && (
          <div className="mt-8 flex justify-center">
            <span className="rounded-full bg-pill px-4 py-1.5 text-sm font-medium text-muted">
              Completed
            </span>
          </div>
        )}

        {!done && canComplete && !isHolding && !isCompleting && (
          <p className="mt-10 text-center text-xs text-muted">
            Press and hold to complete
          </p>
        )}

        {!done && !canComplete && (
          <p className="mt-10 text-center text-xs text-muted">Not completed</p>
        )}

        {isHolding && !done && (
          <p className="mt-10 text-center text-xs font-medium text-accent-orange">
            Keep holding…
          </p>
        )}
      </div>
    </div>
  );
}
