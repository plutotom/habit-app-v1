"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/api";
import { Id } from "@backend/dataModel";
import { HabitForm, type HabitFormValues } from "@/components/habits/HabitForm";
import { PageLoading } from "@/components/ui/Spinner";

export default function EditHabitPage() {
  const { habitId } = useParams<{ habitId: string }>();
  const router = useRouter();
  const habit = useQuery(api.habits.get, {
    habitId: habitId as Id<"habits">,
  });
  const update = useMutation(api.habits.update);
  const archive = useMutation(api.habits.archive);

  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");

  if (habit === undefined) {
    return <PageLoading />;
  }

  if (!habit) {
    return <div className="py-20 text-center text-muted">Habit not found.</div>;
  }

  async function handleSubmit(values: HabitFormValues) {
    setSaving(true);
    setError("");
    try {
      await update({
        habitId: habitId as Id<"habits">,
        ...values,
      });
      router.push(`/habits/${habitId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!confirm("Archive this habit? It will disappear from Today.")) return;
    setArchiving(true);
    setError("");
    try {
      await archive({ habitId: habitId as Id<"habits"> });
      router.push("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive");
      setArchiving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit Habit</h1>
      <HabitForm
        initial={{
          title: habit.title,
          description: habit.description,
          scheduleType: habit.scheduleType,
          allowedDays: habit.allowedDays,
        }}
        submitLabel="Save changes"
        savingLabel="Saving..."
        saving={saving}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
      <button
        type="button"
        onClick={handleArchive}
        disabled={archiving}
        className="rounded-full border border-border py-3 text-sm font-semibold text-muted transition-colors hover:bg-card hover:text-foreground disabled:opacity-50"
      >
        {archiving ? "Archiving..." : "Archive habit"}
      </button>
    </div>
  );
}
