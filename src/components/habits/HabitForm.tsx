"use client";

import { type FormEvent, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type HabitFormValues = {
  title: string;
  description?: string;
  scheduleType: "daily" | "specific_days";
  allowedDays?: number[];
};

type HabitFormProps = {
  initial?: HabitFormValues;
  submitLabel: string;
  savingLabel: string;
  saving: boolean;
  error: string;
  onSubmit: (values: HabitFormValues) => Promise<void>;
  onCancel: () => void;
};

export function HabitForm({
  initial,
  submitLabel,
  savingLabel,
  saving,
  error,
  onSubmit,
  onCancel,
}: HabitFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [scheduleType, setScheduleType] = useState<"daily" | "specific_days">(
    initial?.scheduleType ?? "daily",
  );
  const [allowedDays, setAllowedDays] = useState<number[]>(
    initial?.allowedDays ?? [1, 2, 3, 4, 5],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      scheduleType,
      allowedDays: scheduleType === "specific_days" ? allowedDays : undefined,
    });
  }

  function toggleDay(day: number) {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-medium text-muted">
          Title <span className="text-accent">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Morning run"
          required
          className="rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium text-muted">
          I want to become
        </label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional — shown on the habit card"
          className="rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted">Schedule</label>
        <div className="grid grid-cols-2 gap-2">
          {(["daily", "specific_days"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScheduleType(s)}
              className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                scheduleType === s
                  ? "border-accent bg-accent/20 text-foreground"
                  : "border-border bg-card text-muted hover:bg-card/60"
              }`}
            >
              {s === "daily" ? "Every day" : "Specific days"}
            </button>
          ))}
        </div>
        {scheduleType === "specific_days" && (
          <div className="mt-2 flex gap-2">
            {DAYS.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(i)}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  allowedDays.includes(i)
                    ? "border-accent bg-accent/20 text-foreground"
                    : "border-border bg-card text-muted"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-border py-3 text-sm font-semibold text-muted transition-colors hover:bg-card"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? savingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
