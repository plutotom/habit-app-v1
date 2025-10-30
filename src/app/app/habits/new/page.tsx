import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createHabit } from "@/lib/habits-service";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireCurrentAppUser } from "@/lib/users";
import { habitCreateSchema } from "@/lib/validators";

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

export default function NewHabitPage() {
  const createHabitAction = async (formData: FormData) => {
    "use server";

    const user = await requireCurrentAppUser();
    const payload = habitCreateSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      trackType: formData.get("trackType"),
      scheduleType: formData.get("scheduleType"),
      countTarget: formData.get("countTarget") ? Number(formData.get("countTarget")) : undefined,
      perPeriod: formData.get("perPeriod") || undefined,
      allowedDays: formData.getAll("allowedDays") as string[],
      dayBoundaryOffsetMinutes: formData.get("dayBoundaryOffsetMinutes")
        ? Number(formData.get("dayBoundaryOffsetMinutes"))
        : undefined,
      skipPolicy: formData.get("skipPolicy") || undefined,
      freezeEnabled: formData.get("freezeEnabled") === "on",
      color: formData.get("color") || undefined,
      icon: formData.get("icon") || undefined,
      category: formData.get("category") || undefined,
    });

    await assertRateLimit({
      userId: user.id,
      bucket: "habit:create",
      limit: 20,
      windowMs: 60_000,
    });

    const habit = await createHabit(user.id, payload);
    revalidatePath("/app/today");
    redirect(`/app/habits/${habit.id}`);
  };

  return (
    <form
      action={createHabitAction}
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl border border-border bg-card/70 p-8"
    >
      <h1 className="text-2xl font-semibold">Create habit</h1>
      <label className="flex flex-col gap-2 text-sm">
        Title
        <input
          required
          name="title"
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
          className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          Track type
          <select
            name="trackType"
            className="rounded-lg border border-border bg-surface px-3 py-2"
            defaultValue="binary"
          >
            {trackTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Schedule
          <select
            name="scheduleType"
            className="rounded-lg border border-border bg-surface px-3 py-2"
            defaultValue="daily"
          >
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
            defaultValue={1}
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
            defaultValue={0}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium">Allowed days</legend>
        <div className="flex flex-wrap gap-3">
          {dayOptions.map((day) => (
            <label
              key={day}
              className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs uppercase tracking-wide"
            >
              <input type="checkbox" name="allowedDays" value={day} /> {day}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">Leave unchecked to allow every day.</p>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="freezeEnabled" defaultChecked /> Enable freeze support
      </label>
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Create habit
        </button>
      </div>
    </form>
  );
}

