"use client";

import React from "react";
import { addDays, differenceInCalendarDays, eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek } from "date-fns";

type DayDatum = {
  date: string; // yyyy-MM-dd
  completionRate: number; // 0..1
};

type Props = {
  start: string; // yyyy-MM-dd
  end: string; // yyyy-MM-dd
  days: DayDatum[];
};

function intensity(rate: number) {
  if (rate <= 0) return "bg-surface";
  if (rate < 0.25) return "bg-emerald-900/40";
  if (rate < 0.5) return "bg-emerald-800/60";
  if (rate < 0.75) return "bg-emerald-700/80";
  return "bg-emerald-600";
}

export default function ContributionHeatmap({ start, end, days }: Props) {
  const map = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const d of days) m.set(d.date, Math.max(0, Math.min(1, Number(d.completionRate ?? 0))));
    return m;
  }, [days]);

  const startDate = parseISO(start);
  const endDate = parseISO(end);

  const gridStart = startOfWeek(startDate, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endDate, { weekStartsOn: 0 });

  const totalDays = differenceInCalendarDays(gridEnd, gridStart) + 1;
  const allDays = Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
  const weeks = [] as Date[][];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  return (
    <div className="flex gap-1 overflow-x-auto py-2">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((date, di) => {
            const key = format(date, "yyyy-MM-dd");
            const rate = map.get(key) ?? 0;
            return (
              <div
                key={di}
                className={`h-3 w-3 rounded-sm ${intensity(rate)}`}
                title={`${key} · ${Math.round(rate * 100)}%`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}


