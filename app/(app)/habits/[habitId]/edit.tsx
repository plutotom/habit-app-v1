import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { HabitForm, type HabitFormValues } from "@/components/habits/HabitForm";
import { PageLoading } from "@/components/ui/Spinner";
import {
  cancelHabitReminders,
  getHabitReminderTimes,
  requestHabitReminderPermission,
  syncHabitReminders,
  type ReminderTime,
} from "@/lib/habit-reminders";
import { useLocalHabit, useLocalMutations } from "@/local/hooks";
import { colors } from "@/theme";

export default function EditHabitScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const router = useRouter();
  const id = habitId;
  const habit = useLocalHabit(id);
  const { updateHabit, archiveHabit } = useLocalMutations();
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const [reminderTimes, setReminderTimes] = useState<ReminderTime[] | null>(
    null,
  );

  useEffect(() => {
    void getHabitReminderTimes(id).then(setReminderTimes);
  }, [id]);
  if (habit === undefined || reminderTimes === null) return <PageLoading />;
  if (!habit) return <Text style={styles.missing}>Habit not found.</Text>;

  async function handleSubmit(values: HabitFormValues) {
    setSaving(true);
    setError("");
    try {
      const { reminderTimes: times, ...habitValues } = values;
      if (times.length) await requestHabitReminderPermission();
      await updateHabit(id, habitValues);
      try {
        await syncHabitReminders({
          habitId: id,
          title: values.title,
          scheduleType: values.scheduleType,
          allowedDays: values.allowedDays,
          times,
        });
      } catch {
        Alert.alert(
          "Changes saved",
          "The habit was updated on this phone, but its reminder couldn’t be scheduled. Please try saving again.",
        );
      }
      setSaving(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn’t save on this phone.",
      );
      setSaving(false);
    }
  }
  function handleArchive() {
    Alert.alert("Archive this habit?", "It will disappear from Today.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setArchiving(true);
            setError("");
            try {
              await archiveHabit(id);
              await cancelHabitReminders(id).catch(() => undefined);
              router.replace("/today");
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Couldn’t save on this phone.",
              );
              setArchiving(false);
            }
          })();
        },
      },
    ]);
  }
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>Edit Habit</Text>
      <HabitForm
        initial={{
          title: habit.title,
          description: habit.description,
          scheduleType: habit.scheduleType,
          allowedDays: habit.allowedDays,
          reminderTimes,
        }}
        submitLabel="Save changes"
        savingLabel="Saving..."
        saving={saving}
        error={error}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
      <Pressable
        onPress={handleArchive}
        disabled={archiving}
        style={styles.archive}
      >
        <Text style={styles.archiveText}>
          {archiving ? "Archiving..." : "Archive habit"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 24, paddingBottom: 24 },
  h1: { fontSize: 24, fontWeight: "600", color: colors.foreground },
  missing: { paddingVertical: 80, textAlign: "center", color: colors.muted },
  archive: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  archiveText: { fontSize: 14, fontWeight: "600", color: colors.muted },
});
