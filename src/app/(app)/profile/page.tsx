"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/api";
import { useState } from "react";
import { PageLoading } from "@/components/ui/Spinner";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

export default function ProfilePage() {
  const user = useQuery(api.users.current);
  const habits = useQuery(api.habits.list);
  const updateProfile = useMutation(api.users.updateProfile);

  const [timezone, setTimezone] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<"mon" | "sun" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (user === undefined) {
    return <PageLoading />;
  }

  const currentTimezone = timezone ?? user?.timezone ?? "UTC";
  const currentWeekStart = weekStart ?? user?.weekStart ?? "mon";

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({
        timezone: currentTimezone,
        weekStart: currentWeekStart,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm text-muted">Email</div>
        <div className="mt-1 font-medium">{user?.email ?? "—"}</div>
        {habits !== undefined && (
          <div className="mt-3 text-sm text-muted">
            {habits.length} active habit{habits.length === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Settings</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted">Timezone</label>
          <select
            value={currentTimezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-3 text-foreground focus:border-accent focus:outline-none"
          >
            {!TIMEZONES.includes(currentTimezone) && (
              <option value={currentTimezone}>{currentTimezone}</option>
            )}
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted">Week starts on</label>
          <div className="grid grid-cols-2 gap-2">
            {(["mon", "sun"] as const).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setWeekStart(day)}
                className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                  currentWeekStart === day
                    ? "border-accent bg-accent/20 text-foreground"
                    : "border-border bg-card text-muted hover:bg-card/60"
                }`}
              >
                {day === "mon" ? "Monday" : "Sunday"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-accent py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saved ? "Saved!" : saving ? "Saving..." : "Save settings"}
        </button>
      </div>

      <a
        href="/sign-out"
        className="rounded-full border border-border py-3 text-center text-sm font-semibold text-muted transition-colors hover:bg-card hover:text-foreground"
      >
        Sign out
      </a>
    </div>
  );
}
