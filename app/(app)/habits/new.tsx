import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { api } from "@backend/api";
import { HabitForm, type HabitFormValues } from "@/components/habits/HabitForm";
import {
  requestHabitReminderPermission,
  syncHabitReminders,
} from "@/lib/habit-reminders";
import { colors } from "@/theme";

export default function NewHabitScreen() {
  const router = useRouter();
  const create = useMutation(api.habits.create);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(values: HabitFormValues) {
    setSaving(true);
    setError("");
    try {
      const { reminderTimes, ...habitValues } = values;
      if (reminderTimes.length) await requestHabitReminderPermission();
      const habitId = await create(habitValues);
      await syncHabitReminders({
        habitId,
        title: values.title,
        scheduleType: values.scheduleType,
        allowedDays: values.allowedDays,
        times: reminderTimes,
      });
      router.replace("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create habit");
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>New Habit</Text>
      <HabitForm
        submitLabel="Create habit"
        savingLabel="Creating..."
        saving={saving}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 24, paddingBottom: 24 },
  h1: { fontSize: 24, fontWeight: "600", color: colors.foreground },
});
