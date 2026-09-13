import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";

import { HabitForm, type HabitFormValues } from "@/components/habits/HabitForm";
import {
  requestHabitReminderPermission,
  syncHabitReminders,
} from "@/lib/habit-reminders";
import { useLocalMutations } from "@/local/hooks";
import { colors } from "@/theme";

export default function NewHabitScreen() {
  const router = useRouter();
  const { createHabit } = useLocalMutations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(values: HabitFormValues) {
    setSaving(true);
    setError("");
    try {
      const { reminderTimes, ...habitValues } = values;
      if (reminderTimes.length) await requestHabitReminderPermission();
      const habitId = await createHabit(habitValues);
      try {
        await syncHabitReminders({
          habitId,
          title: values.title,
          scheduleType: values.scheduleType,
          allowedDays: values.allowedDays,
          times: reminderTimes,
        });
      } catch {
        Alert.alert(
          "Habit saved",
          "The habit is on this phone, but its reminder couldn’t be scheduled. You can retry from Edit.",
        );
      }
      router.replace("/today");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn’t save on this phone.",
      );
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
