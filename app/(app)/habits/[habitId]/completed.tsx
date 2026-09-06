import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@backend/api";
import type { Id } from "@backend/dataModel";
import { Spinner } from "@/components/ui/Spinner";
import { getWeekDays, ordinal } from "@/lib/dates";
import { colors, fonts } from "@/theme";
import { useLocalDay } from "@/hooks/use-local-day";
import { useHabitStatistics } from "@/hooks/use-habit-statistics";

export default function HabitCompletedScreen() {
  const { habitId, day } = useLocalSearchParams<{
    habitId: string;
    day?: string;
  }>();
  const router = useRouter();
  const id = habitId as Id<"habits">;
  const user = useQuery(api.users.current);
  const habit = useQuery(api.habits.get, { habitId: id });
  const checkins = useQuery(api.checkins.forHabit, { habitId: id, limit: 365 });
  const timezone = user?.timezone ?? "UTC";
  const weekStart = user?.weekStart ?? "mon";
  const todayLocal = useLocalDay(timezone);
  const localDay = day ?? todayLocal;
  const statistics = useHabitStatistics(id, todayLocal, !!habit);

  if (habit === undefined || checkins === undefined || user === undefined) {
    return (
      <View style={styles.loading}>
        <Spinner light />
      </View>
    );
  }

  if (!habit) {
    return (
      <View style={styles.loading}>
        <Text style={styles.white}>Habit not found.</Text>
        <Pressable onPress={() => router.replace("/today")}>
          <Text style={styles.link}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  const completedCheckins = checkins.filter((c) => !c.isSkip);
  if (!statistics)
    return (
      <View style={styles.loading}>
        <Spinner light />
      </View>
    );
  const totalReps = statistics.total;
  const checkinDays = new Set(completedCheckins.map((c) => c.localDay));
  const weekDays = getWeekDays(timezone, 0, weekStart);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.kicker}>Habit completed!</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeNum}>{totalReps}</Text>
        </View>
        <Text style={styles.headline}>
          {totalReps === 1
            ? "1st Step to Greatness!"
            : `${ordinal(totalReps)} Step to Greatness!`}
        </Text>
        <Text style={styles.sub}>
          Congrats! You have earned {totalReps} Rep Milestone
        </Text>
        <View style={styles.week}>
          {weekDays.map((d) => {
            const completed = checkinDays.has(d.localDay);
            const isSelected = d.localDay === localDay;
            return (
              <View key={d.localDay} style={styles.weekDay}>
                <View style={[styles.circle, completed && styles.circleDone]}>
                  <Text style={[styles.check, completed && styles.checkDone]}>
                    {completed ? "✓" : ""}
                  </Text>
                </View>
                <Text style={[styles.dow, isSelected && styles.white]}>
                  {d.label}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              router.replace({
                pathname: "/habits/[habitId]",
                params: { habitId },
              })
            }
            style={styles.primary}
          >
            <Text style={styles.primaryText}>View habit details</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/today")}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.completedBg },
  safe: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.completedBg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  kicker: { color: colors.white, fontSize: 18, fontWeight: "600" },
  badge: {
    marginTop: 40,
    height: 96,
    width: 96,
    borderRadius: 48,
    backgroundColor: "#f5c842",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeNum: {
    fontFamily: fonts.serif,
    fontSize: 48,
    color: "#3d2a00",
  },
  headline: {
    marginTop: 32,
    fontFamily: fonts.serif,
    fontSize: 28,
    textAlign: "center",
    color: colors.white,
  },
  sub: { marginTop: 12, color: "rgba(255,255,255,0.7)", textAlign: "center" },
  week: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 360,
  },
  weekDay: { alignItems: "center", gap: 8 },
  circle: {
    height: 36,
    width: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: { backgroundColor: colors.white, borderWidth: 0 },
  check: { color: colors.white },
  checkDone: { color: colors.completedBg, fontWeight: "700" },
  dow: { fontSize: 10, color: "rgba(255,255,255,0.5)" },
  white: { color: colors.white },
  link: { color: colors.white, textDecorationLine: "underline" },
  actions: { marginTop: "auto", width: "100%", maxWidth: 360, gap: 12 },
  primary: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: { fontWeight: "600", color: colors.completedBg },
  secondary: {
    backgroundColor: "#2a2a2a",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryText: { fontWeight: "600", color: colors.white },
});
