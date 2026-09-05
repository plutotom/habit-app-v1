"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@backend/api";
import { HabitForm, type HabitFormValues } from "@/components/habits/HabitForm";

export default function NewHabitPage() {
  const router = useRouter();
  const create = useMutation(api.habits.create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(values: HabitFormValues) {
    setSaving(true);
    setError("");
    try {
      await create(values);
      router.push("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create habit");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New Habit</h1>
      <HabitForm
        submitLabel="Create habit"
        savingLabel="Creating..."
        saving={saving}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </div>
  );
}
