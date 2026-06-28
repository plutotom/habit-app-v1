"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/api";
import { Id } from "@backend/dataModel";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#8a66ff", "#00d1b2", "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff"];
const EMOJIS = ["🏃", "💪", "📚", "🧘", "💧", "🛌", "🍎", "✍️", "🎯", "🧹"];

export default function EditHabitPage() {
  const { habitId } = useParams<{ habitId: string }>();
  const router = useRouter();
  const habit = useQuery(api.routes.habits.queries.get, {
    habitId: habitId as Id<"habits">,
  });
  const update = useMutation(api.routes.habits.mutations.update);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [trackType, setTrackType] = useState<"binary" | "count" | "duration">("binary");
  const [scheduleType, setScheduleType] = useState<"daily" | "specific_days">("daily");
  const [countTarget, setCountTarget] = useState("");
  const [durationTarget, setDurationTarget] = useState("");
  const [allowedDays, setAllowedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!habit) return;
    setTitle(habit.title);
    setDescription(habit.description ?? "");
    setEmoji(habit.emoji ?? "");
    setColor(habit.color ?? COLORS[0]);
    setTrackType(habit.trackType);
    setScheduleType(habit.scheduleType);
    setCountTarget(habit.countTarget?.toString() ?? "");
    setDurationTarget(habit.durationTarget?.toString() ?? "");
    setAllowedDays(habit.allowedDays ?? [1, 2, 3, 4, 5]);
  }, [habit]);

  if (habit === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!habit) {
    return <div className="py-20 text-center text-muted">Habit not found.</div>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await update({
        habitId: habitId as Id<"habits">,
        title: title.trim(),
        description: description.trim() || undefined,
        emoji: emoji || undefined,
        color: color || undefined,
        trackType,
        scheduleType,
        countTarget: countTarget ? Number(countTarget) : undefined,
        durationTarget: durationTarget ? Number(durationTarget) : undefined,
        allowedDays: scheduleType === "specific_days" ? allowedDays : undefined,
      });
      router.push(`/habits/${habitId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  function toggleDay(day: number) {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit Habit</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted">Icon</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(emoji === e ? "" : e)}
                className={`rounded-xl border px-3 py-2 text-xl transition-colors ${
                  emoji === e
                    ? "border-accent bg-accent/20"
                    : "border-border bg-card hover:bg-card/60"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="title" className="text-sm font-medium text-muted">
            Title <span className="text-accent">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium text-muted">
            Description
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-8 w-8 rounded-full transition-transform ${
                  color === c ? "scale-125 ring-2 ring-white/40" : ""
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted">Track type</label>
          <div className="grid grid-cols-3 gap-2">
            {(["binary", "count", "duration"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrackType(t)}
                className={`rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${
                  trackType === t
                    ? "border-accent bg-accent/20 text-foreground"
                    : "border-border bg-card text-muted hover:bg-card/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {trackType === "count" && (
            <input
              type="number"
              value={countTarget}
              onChange={(e) => setCountTarget(e.target.value)}
              placeholder="Daily target"
              min="1"
              className="mt-2 rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
            />
          )}
          {trackType === "duration" && (
            <input
              type="number"
              value={durationTarget}
              onChange={(e) => setDurationTarget(e.target.value)}
              placeholder="Target minutes"
              min="1"
              className="mt-2 rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
            />
          )}
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
            onClick={() => router.back()}
            className="flex-1 rounded-full border border-border py-3 text-sm font-semibold text-muted hover:bg-card transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1 rounded-full bg-accent py-3 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
