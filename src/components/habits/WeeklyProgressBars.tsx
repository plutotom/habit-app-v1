"use client";

import React from "react";

type DayProgress = {
  label: string; // S M T W T F S
  rate: number; // 0..1
};

export default function WeeklyProgressBars({ days }: { days: DayProgress[] }) {
  return (
    <div className="flex items-center justify-between gap-2">
      {days.map((d, idx) => (
        <Ring key={idx} label={d.label} rate={d.rate} />
      ))}
    </div>
  );
}

function Ring({ label, rate }: { label: string; rate: number }) {
  const size = 44;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, rate));
  const offset = c * (1 - clamped);

  return (
    <div className="flex flex-col items-center text-xs">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="currentColor" className="opacity-20" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke="currentColor"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="text-accent"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-current text-[12px]">
          {label}
        </text>
      </svg>
    </div>
  );
}


