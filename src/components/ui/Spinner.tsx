"use client";

import React from "react";

type SpinnerProps = {
  className?: string;
  size?: number; // px
  strokeWidth?: number; // px
  label?: string;
};

export function Spinner({ className, size = 18, strokeWidth = 2, label }: SpinnerProps) {
  const ariaLabel = label ?? "Loading";
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span className={className} role="status" aria-label={ariaLabel} aria-live="polite">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="animate-spin"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.75}
          className="opacity-80"
        />
      </svg>
    </span>
  );
}

export default Spinner;



