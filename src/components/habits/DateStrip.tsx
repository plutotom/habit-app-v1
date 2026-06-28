"use client";

import type { WeekDay } from "@/lib/dates";

type DateStripProps = {
  days: WeekDay[];
  selectedDay: string;
  todayLocal: string;
  completedDays: Set<string>;
  canGoNextWeek: boolean;
  onSelectDay: (localDay: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

export function DateStrip({
  days,
  selectedDay,
  todayLocal,
  completedDays,
  canGoNextWeek,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
}: DateStripProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onPrevWeek}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-pill hover:text-foreground"
          aria-label="Previous week"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={onNextWeek}
          disabled={!canGoNextWeek}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-pill hover:text-foreground disabled:opacity-30"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      <div className="flex items-end justify-between gap-1 px-1">
        {days.map((day) => {
          const isSelected = day.localDay === selectedDay;
          const hasCompletions = completedDays.has(day.localDay);

          return (
            <button
              key={day.localDay}
              type="button"
              disabled={day.isFuture}
              onClick={() => onSelectDay(day.localDay)}
              className="flex flex-1 flex-col items-center gap-1.5 disabled:opacity-35"
            >
              <span
                className={`text-[11px] font-medium tracking-wide ${
                  isSelected ? "text-foreground" : "text-muted"
                }`}
              >
                {day.isToday ? "Today" : day.label}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isSelected
                    ? "bg-foreground text-background"
                    : hasCompletions
                      ? "bg-pill text-foreground"
                      : "text-muted"
                }`}
              >
                {day.date}
              </div>
              <div className="flex h-1.5 items-center justify-center">
                {isSelected ? (
                  <div className="h-0.5 w-full max-w-[28px] rounded-full bg-foreground" />
                ) : hasCompletions ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-accent-orange" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
