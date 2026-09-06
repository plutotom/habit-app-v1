import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { api } from "@backend/api";
import type { Id } from "@backend/dataModel";
import { HabitForm, type HabitFormValues } from "@/components/habits/HabitForm";
import { PageLoading } from "@/components/ui/Spinner";
import { colors } from "@/theme";

export default function EditHabitScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const router = useRouter();
  const id = habitId as Id<"habits">;
  const habit = useQuery(api.habits.get, { habitId: id });
  const update = useMutation(api.habits.update);
  const archive = useMutation(api.habits.archive);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");

  if (habit === undefined) return <PageLoading />;
  if (!habit) {
    return <Text style={styles.missing}>Habit not found.</Text>;
  }

  async function handleSubmit(values: HabitFormValues) {
    setSaving(true);
    setError("");
    try {
      await update({ habitId: id, ...values });
      router.replace({ pathname: "/habits/[habitId]", params: { habitId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
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
              await archive({ habitId: id });
              router.replace("/today");
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Failed to archive",
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
