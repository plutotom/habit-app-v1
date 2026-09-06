import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ReminderTime } from "@/lib/habit-reminders";
import { colors } from "@/theme";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type HabitFormValues = {
  title: string;
  description?: string;
  scheduleType: "daily" | "specific_days";
  allowedDays?: number[];
  reminderTimes: ReminderTime[];
};
type Props = {
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
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [scheduleType, setScheduleType] = useState<"daily" | "specific_days">(
    initial?.scheduleType ?? "daily",
  );
  const [allowedDays, setAllowedDays] = useState<number[]>(
    initial?.allowedDays ?? [1, 2, 3, 4, 5],
  );
  const [reminderTimes, setReminderTimes] = useState<ReminderTime[]>(
    initial?.reminderTimes ?? [],
  );
  const [editingReminder, setEditingReminder] = useState<number | null>(null);
  const validSchedule = scheduleType === "daily" || allowedDays.length > 0;
  const reminderDate = (time: ReminderTime) => {
    const date = new Date();
    date.setHours(time.hour, time.minute, 0, 0);
    return date;
  };
  const formatTime = (time: ReminderTime) =>
    reminderDate(time).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  async function submit() {
    if (!title.trim() || !validSchedule || saving) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      scheduleType,
      allowedDays: scheduleType === "specific_days" ? allowedDays : undefined,
      reminderTimes,
    });
  }
  function toggleDay(day: number) {
    setAllowedDays((oldDays) =>
      oldDays.includes(day)
        ? oldDays.filter((value) => value !== day)
        : [...oldDays, day],
    );
  }
  function addReminder() {
    setReminderTimes((times) => [...times, { hour: 9, minute: 0 }]);
    setEditingReminder(reminderTimes.length);
  }
  function updateReminder(date: Date) {
    if (editingReminder !== null)
      setReminderTimes((times) =>
        times.map((time, index) =>
          index === editingReminder
            ? { hour: date.getHours(), minute: date.getMinutes() }
            : time,
        ),
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
          maxLength={120}
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
          maxLength={1000}
          onChangeText={setDescription}
          placeholder="Optional — shown on the habit card"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Schedule</Text>
        <View style={styles.row}>
          {(["daily", "specific_days"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setScheduleType(value)}
              style={[
                styles.choice,
                scheduleType === value && styles.choiceActive,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  scheduleType === value && styles.choiceTextActive,
                ]}
              >
                {value === "daily" ? "Every day" : "Specific days"}
              </Text>
            </Pressable>
          ))}
        </View>
        {scheduleType === "specific_days" ? (
          <View style={styles.days}>
            {DAYS.map((day, index) => (
              <Pressable
                key={day}
                onPress={() => toggleDay(index)}
                style={[
                  styles.day,
                  allowedDays.includes(index) && styles.choiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    allowedDays.includes(index) && styles.choiceTextActive,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.field}>
        <View style={styles.reminderHeader}>
          <View style={styles.reminderCopy}>
            <Text style={styles.label}>Reminders</Text>
            <Text style={styles.help}>
              Notifications are scheduled on this device only.
            </Text>
          </View>
          <Pressable onPress={addReminder} style={styles.addReminder}>
            <Text style={styles.addReminderText}>Add reminder</Text>
          </Pressable>
        </View>
        {reminderTimes.map((time, index) => (
          <View
            key={`${time.hour}-${time.minute}-${index}`}
            style={styles.reminderRow}
          >
            <Pressable
              onPress={() => setEditingReminder(index)}
              style={styles.timeButton}
            >
              <Text style={styles.timeText}>{formatTime(time)}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Remove ${formatTime(time)} reminder`}
              onPress={() =>
                setReminderTimes((times) =>
                  times.filter((_, itemIndex) => itemIndex !== index),
                )
              }
              style={styles.removeReminder}
            >
              <Text style={styles.removeReminderText}>Remove</Text>
            </Pressable>
          </View>
        ))}
        {editingReminder !== null ? (
          <View style={styles.timePicker}>
            <DateTimePicker
              value={reminderDate(reminderTimes[editingReminder])}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                if (date) updateReminder(date);
                if (Platform.OS !== "ios") setEditingReminder(null);
              }}
            />
            {Platform.OS === "ios" ? (
              <Pressable
                onPress={() => setEditingReminder(null)}
                style={styles.saveTime}
              >
                <Text style={styles.saveTimeText}>Save time</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {!validSchedule ? (
        <Text style={styles.error}>Select at least one weekday.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => void submit()}
          disabled={saving || !title.trim() || !validSchedule}
          style={[
            styles.submit,
            (saving || !title.trim() || !validSchedule) && styles.disabled,
          ]}
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
  help: { fontSize: 12, color: colors.muted, marginTop: 3 },
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
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  reminderCopy: { flex: 1 },
  addReminder: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addReminderText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  reminderRow: { flexDirection: "row", gap: 8 },
  timeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    padding: 12,
  },
  timeText: { fontSize: 16, color: colors.foreground },
  timePicker: { gap: 8 },
  saveTime: {
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  saveTimeText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  removeReminder: { justifyContent: "center", paddingHorizontal: 10 },
  removeReminderText: { fontSize: 13, fontWeight: "600", color: "#d14b4b" },
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
