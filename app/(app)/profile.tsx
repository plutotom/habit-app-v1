import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PageLoading } from "@/components/ui/Spinner";
import {
  useLocalHabits,
  useLocalMutations,
  useLocalPreferences,
} from "@/local/hooks";
import { colors } from "@/theme";

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

export default function ProfileScreen() {
  const preferences = useLocalPreferences();
  const habits = useLocalHabits();
  const { updatePreferences } = useLocalMutations();
  const [timezone, setTimezone] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<"mon" | "sun" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!preferences || habits === undefined) return <PageLoading />;

  const currentTimezone = timezone ?? preferences.timezone;
  const currentWeekStart = weekStart ?? preferences.weekStart;
  const zones = TIMEZONES.includes(currentTimezone)
    ? TIMEZONES
    : [currentTimezone, ...TIMEZONES];

  async function handleSave() {
    setSaving(true);
    try {
      await updatePreferences({
        timezone: currentTimezone,
        weekStart: currentWeekStart,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert(
        "Couldn’t save settings",
        "Couldn’t save on this phone. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.h1}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.email}>Using without an account</Text>
        <Text style={styles.muted}>Your data is stored on this phone.</Text>
        <Text style={styles.muted}>
          {habits.length} active habit{habits.length === 1 ? "" : "s"}
        </Text>
      </View>
      <Text style={styles.h2}>Settings</Text>
      <Text style={styles.label}>Timezone</Text>
      <ScrollView horizontal style={styles.zoneRow}>
        {zones.map((zone) => (
          <Pressable
            key={zone}
            onPress={() => setTimezone(zone)}
            style={[styles.chip, currentTimezone === zone && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                currentTimezone === zone && styles.chipTextActive,
              ]}
            >
              {zone}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.label}>Week starts on</Text>
      <View style={styles.row}>
        {(["mon", "sun"] as const).map((day) => (
          <Pressable
            key={day}
            onPress={() => setWeekStart(day)}
            style={[
              styles.choice,
              currentWeekStart === day && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                currentWeekStart === day && styles.chipTextActive,
              ]}
            >
              {day === "mon" ? "Monday" : "Sunday"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => void handleSave()}
        disabled={saving}
        style={styles.save}
      >
        <Text style={styles.saveText}>
          {saved ? "Saved!" : saving ? "Saving..." : "Save settings"}
        </Text>
      </Pressable>
      <Pressable disabled style={styles.connect}>
        <Text style={styles.connectText}>
          Connect account — coming in the sync update
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 16, paddingBottom: 24 },
  h1: { fontSize: 24, fontWeight: "600", color: colors.foreground },
  h2: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  muted: { fontSize: 14, color: colors.muted },
  email: { fontSize: 16, fontWeight: "500", color: colors.foreground },
  label: { fontSize: 14, fontWeight: "500", color: colors.muted },
  zoneRow: { flexGrow: 0 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: colors.card,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(26,26,26,0.08)",
  },
  chipText: { fontSize: 12, color: colors.muted },
  chipTextActive: { color: colors.foreground },
  row: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  save: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveText: { color: colors.white, fontWeight: "600" },
  connect: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    opacity: 0.55,
  },
  connectText: { color: colors.muted, fontWeight: "600" },
});
