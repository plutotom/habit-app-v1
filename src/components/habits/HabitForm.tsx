"use client";

import React from "react";
import SubmitButton from "@/components/ui/SubmitButton";

const trackTypes = [
  { label: "Binary", value: "binary" },
  { label: "Count", value: "count" },
  { label: "Duration", value: "duration" },
  { label: "Timer", value: "timer" },
];

const scheduleTypes = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "custom" },
];

const dayOptions = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type HabitFormValues = {
  title?: string;
  description?: string | null;
  trackType?: string | null;
  scheduleType?: string | null;
  countTarget?: number | null;
  dayBoundaryOffsetMinutes?: number | null;
  allowedDays?: string[] | null;
  freezeEnabled?: boolean | null;
};

export default function HabitForm({
  action,
  initialValues,
  heading,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: HabitFormValues;
  heading: string;
  submitLabel: string;
}) {
  const values = initialValues ?? {};

  return (
    <form action={action} className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl border border-border bg-card/70 p-8">
      <h1 className="text-2xl font-semibold">{heading}</h1>
      <label className="flex flex-col gap-2 text-sm">
        Title
        <input
          required
          name="title"
          defaultValue={values.title ?? ""}
          maxLength={120}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Description
        <textarea
          name="description"
          rows={3}
          maxLength={1024}
          placeholder="Optional context"
          defaultValue={values.description ?? ""}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Track type
          <select name="trackType" className="rounded-lg border border-border bg-surface px-3 py-2" defaultValue={values.trackType ?? "binary"}>
            {trackTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Schedule
          <select name="scheduleType" className="rounded-lg border border-border bg-surface px-3 py-2" defaultValue={values.scheduleType ?? "daily"}>
            {scheduleTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Count target
          <input
            name="countTarget"
            type="number"
            min={1}
            defaultValue={values.countTarget ?? 1}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Day boundary offset (minutes)
          <input
            name="dayBoundaryOffsetMinutes"
            type="number"
            min={-720}
            max={720}
            defaultValue={values.dayBoundaryOffsetMinutes ?? 0}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium">Allowed days</legend>
        <div className="flex flex-wrap gap-3">
          {dayOptions.map((day) => (
            <label key={day} className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs uppercase tracking-wide">
              <input type="checkbox" name="allowedDays" value={day} defaultChecked={values.allowedDays?.includes(day) ?? false} /> {day}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">Leave unchecked to allow every day.</p>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="freezeEnabled" defaultChecked={values.freezeEnabled ?? true} /> Enable freeze support
      </label>
      <div className="flex justify-end">
        <SubmitButton variant="primary" pendingText="Saving...">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}


