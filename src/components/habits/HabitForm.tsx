import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "@/theme";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type HabitFormValues = {
  title: string;
  description?: string;
  scheduleType: "daily" | "specific_days";
  allowedDays?: number[];
};

type HabitFormProps = {
  initial?: HabitFormValues;
  submitLabel: string;
  savingLabel: string;
  saving: boolean;
  error: string;
  onSubmit: (values: HabitFormValues) => Promise<void>;
  onCancel: () => void;
};

export function HabitForm({
  initial,
  submitLabel,
  savingLabel,
  saving,
  error,
  onSubmit,
  onCancel,
}: HabitFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [scheduleType, setScheduleType] = useState<"daily" | "specific_days">(
    initial?.scheduleType ?? "daily",
  );
  const [allowedDays, setAllowedDays] = useState<number[]>(
    initial?.allowedDays ?? [1, 2, 3, 4, 5],
  );

  async function handleSubmit() {
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      scheduleType,
      allowedDays: scheduleType === "specific_days" ? allowedDays : undefined,
    });
  }

  function toggleDay(day: number) {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.label}>
          Title <Text style={styles.req}>*</Text>
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Morning run"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>I want to become</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional — shown on the habit card"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Schedule</Text>
        <View style={styles.row}>
          {(["daily", "specific_days"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setScheduleType(s)}
              style={[styles.choice, scheduleType === s && styles.choiceActive]}
            >
              <Text
                style={[
                  styles.choiceText,
                  scheduleType === s && styles.choiceTextActive,
                ]}
              >
                {s === "daily" ? "Every day" : "Specific days"}
              </Text>
            </Pressable>
          ))}
        </View>
        {scheduleType === "specific_days" ? (
          <View style={styles.days}>
            {DAYS.map((day, i) => (
              <Pressable
                key={day}
                onPress={() => toggleDay(i)}
                style={[
                  styles.day,
                  allowedDays.includes(i) && styles.choiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    allowedDays.includes(i) && styles.choiceTextActive,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={saving || !title.trim()}
          style={[styles.submit, (saving || !title.trim()) && styles.disabled]}
        >
          <Text style={styles.submitText}>
            {saving ? savingLabel : submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "500", color: colors.muted },
  req: { color: colors.accent },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  row: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  choiceActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(26,26,26,0.08)",
  },
  choiceText: { fontSize: 14, color: colors.muted },
  choiceTextActive: { color: colors.foreground },
  days: { flexDirection: "row", gap: 6, marginTop: 8 },
  day: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  dayText: { fontSize: 11, fontWeight: "500", color: colors.muted },
  error: { fontSize: 14, color: "#f87171" },
  actions: { flexDirection: "row", gap: 12, paddingTop: 8 },
  cancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  submit: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitText: { fontSize: 14, fontWeight: "600", color: colors.white },
  disabled: { opacity: 0.5 },
});
