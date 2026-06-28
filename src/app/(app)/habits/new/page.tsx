"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@backend/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#8a66ff", "#00d1b2", "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff"];
const EMOJIS = ["🏃", "💪", "📚", "🧘", "💧", "🛌", "🍎", "✍️", "🎯", "🧹"];

export default function NewHabitPage() {
  const router = useRouter();
  const create = useMutation(api.routes.habits.mutations.create);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await create({
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
      router.push("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create habit");
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
      <h1 className="text-2xl font-semibold">New Habit</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Emoji picker */}
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

        {/* Title */}
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

        {/* Description */}
        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium text-muted">
            Description
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note"
            className="rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Color */}
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

        {/* Track type */}
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
              placeholder="Daily target (e.g. 10)"
              min="1"
              className="mt-2 rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
            />
          )}
          {trackType === "duration" && (
            <input
              type="number"
              value={durationTarget}
              onChange={(e) => setDurationTarget(e.target.value)}
              placeholder="Target minutes (e.g. 30)"
              min="1"
              className="mt-2 rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder-muted focus:border-accent focus:outline-none"
            />
          )}
        </div>

        {/* Schedule */}
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
            {saving ? "Creating..." : "Create habit"}
          </button>
        </div>
      </form>
    </div>
  );
}
