import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@backend/api";
import type { Id } from "@backend/dataModel";
import { PageLoading } from "@/components/ui/Spinner";
import {
  formatCompletedAt,
  formatCreatedDate,
  formatShortDate,
  getHabitCreatedLocalDay,
  getLocalDay,
  isHabitActiveOnDay,
  shiftLocalDay,
} from "@/lib/dates";
import { colors, fonts } from "@/theme";

type DayStatus =
  "done" | "skip" | "missed" | "future" | "before_creation" | "not_scheduled";

const statusColor: Record<DayStatus, string> = {
  done: colors.accentOrange,
  skip: colors.pill,
  missed: "rgba(235,235,230,0.5)",
  future: "transparent",
  before_creation: "transparent",
  not_scheduled: "rgba(235,235,230,0.3)",
};

export default function HabitDetailScreen() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const router = useRouter();
  const id = habitId as Id<"habits">;

  const user = useQuery(api.users.current);
  const habit = useQuery(api.habits.get, { habitId: id });
  const checkins = useQuery(api.checkins.forHabit, { habitId: id, limit: 120 });
  const streak = useQuery(api.checkins.streak, { habitId: id });
  const timezone = user?.timezone ?? "UTC";
  const localDay = getLocalDay(timezone);

  if (
    habit === undefined ||
    checkins === undefined ||
    streak === undefined ||
    user === undefined
  ) {
    return <PageLoading />;
  }

  if (!habit) {
    return (
      <View style={styles.missing}>
        <Text style={styles.muted}>Habit not found.</Text>
        <Pressable onPress={() => router.replace("/today")}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const createdDay = getHabitCreatedLocalDay(habit, timezone);
  const completed = checkins.filter((c) => !c.isSkip);
  const checkinMap = new Map(checkins.map((c) => [c.localDay, c]));
  const heatmapDays: { day: string; status: DayStatus }[] = [];
  for (let i = 34; i >= 0; i--) {
    const day = shiftLocalDay(localDay, -i);
    const c = checkinMap.get(day);
    if (day > localDay) heatmapDays.push({ day, status: "future" });
    else if (day < createdDay)
      heatmapDays.push({ day, status: "before_creation" });
    else if (c) heatmapDays.push({ day, status: c.isSkip ? "skip" : "done" });
    else if (!isHabitActiveOnDay(habit, day, timezone))
      heatmapDays.push({ day, status: "not_scheduled" });
    else heatmapDays.push({ day, status: "missed" });
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/habits/[habitId]/edit",
              params: { habitId },
            })
          }
          style={styles.pill}
        >
          <Text style={styles.pillText}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.hero}>
        <Text style={styles.title}>{habit.title}</Text>
        {habit.description ? (
          <>
            <Text style={styles.muted}>I want to become</Text>
            <Text style={styles.title}>{habit.description}</Text>
          </>
        ) : null}
        <Text style={styles.muted}>
          Started {formatCreatedDate(habit, timezone)}
        </Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.accentOrange }]}>
            {streak.current}
          </Text>
          <Text style={styles.statLabel}>Current streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{streak.longest}</Text>
          <Text style={styles.statLabel}>Best streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{completed.length}</Text>
          <Text style={styles.statLabel}>Total reps</Text>
        </View>
      </View>
      <Text style={styles.h2}>Last 35 days</Text>
      <View style={styles.heat}>
        {heatmapDays.map(({ day, status }) => {
          const clickable = status !== "before_creation" && status !== "future";
          return (
            <Pressable
              key={day}
              disabled={!clickable}
              onPress={() =>
                router.push({ pathname: "/today", params: { day } })
              }
              style={[
                styles.cell,
                {
                  backgroundColor: statusColor[status],
                  borderWidth: status === "future" ? 1 : 0,
                  borderColor: colors.border,
                },
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.h2}>Completion history</Text>
      {completed.length === 0 ? (
        <Text style={styles.empty}>No completions yet</Text>
      ) : (
        completed.slice(0, 30).map((c) => (
          <Pressable
            key={c._id}
            onPress={() =>
              router.push({ pathname: "/today", params: { day: c.localDay } })
            }
            style={styles.historyRow}
          >
            <Text style={styles.historyDay}>{formatShortDate(c.localDay)}</Text>
            <Text style={styles.muted}>
              {formatCompletedAt(c.completedAt, timezone)}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 20, paddingBottom: 24 },
  missing: { paddingVertical: 80, alignItems: "center", gap: 12 },
  top: { flexDirection: "row", justifyContent: "space-between" },
  back: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 18, color: colors.muted },
  pill: {
    borderRadius: 999,
    backgroundColor: colors.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: { fontSize: 14, fontWeight: "500", color: colors.muted },
  hero: { alignItems: "center", gap: 8 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 24,
    textAlign: "center",
    color: colors.foreground,
  },
  muted: { fontSize: 14, color: colors.muted },
  stats: { flexDirection: "row", gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statNum: { fontSize: 24, fontWeight: "700", color: colors.foreground },
  statLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "500",
    color: colors.muted,
  },
  h2: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  heat: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: "12%", aspectRatio: 1, borderRadius: 8 },
  empty: {
    backgroundColor: colors.pill,
    borderRadius: 16,
    padding: 24,
    textAlign: "center",
    color: colors.muted,
  },
  historyRow: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyDay: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  link: { color: colors.foreground, textDecorationLine: "underline" },
});
