import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CELEBRATION_TIMELINE,
  CelebrationBadge,
  WeekDayStamp,
  fadeUp,
  useCelebrationHaptics,
} from "@/components/habits/CompletionCelebration";
import { Spinner } from "@/components/ui/Spinner";
import { getWeekDays, ordinal, weekOffsetForDay } from "@/lib/dates";
import { colors, fonts } from "@/theme";
import { useLocalDay } from "@/hooks/use-local-day";
import {
  useLocalHabit,
  useLocalHabitCheckins,
  useLocalHabitStatistics,
  useLocalPreferences,
} from "@/local/hooks";

export default function HabitCompletedScreen() {
  const { habitId, day } = useLocalSearchParams<{
    habitId: string;
    day?: string;
  }>();
  const router = useRouter();
  const id = habitId;
  const preferences = useLocalPreferences();
  const habit = useLocalHabit(id);
  const checkins = useLocalHabitCheckins(id, 365);
  const timezone = preferences?.timezone ?? "UTC";
  const weekStart = preferences?.weekStart ?? "mon";
  const todayLocal = useLocalDay(timezone);
  const localDay = day ?? todayLocal;
  const statistics = useLocalHabitStatistics(id, todayLocal, !!habit);

  if (
    habit === undefined ||
    checkins === undefined ||
    preferences === undefined
  ) {
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

  if (!statistics)
    return (
      <View style={styles.loading}>
        <Spinner light />
      </View>
    );

  const checkinDays = new Set(
    checkins.filter((c) => !c.isSkip).map((c) => c.localDay),
  );
  const weekDays = getWeekDays(
    timezone,
    weekOffsetForDay(localDay, timezone, weekStart),
    weekStart,
    todayLocal,
  );

  return (
    <Celebration
      totalReps={statistics.total}
      weekDays={weekDays.map((d) => ({
        localDay: d.localDay,
        label: d.label,
        completed: checkinDays.has(d.localDay),
        isSelected: d.localDay === localDay,
      }))}
      stampsSelectedDay={checkinDays.has(localDay)}
      onViewDetails={() =>
        router.replace({
          pathname: "/habits/[habitId]",
          params: { habitId },
        })
      }
      onBackHome={() =>
        router.replace(
          localDay === todayLocal
            ? "/today"
            : { pathname: "/today", params: { day: localDay } },
        )
      }
    />
  );
}

type CelebrationProps = {
  totalReps: number;
  weekDays: {
    localDay: string;
    label: string;
    completed: boolean;
    isSelected: boolean;
  }[];
  stampsSelectedDay: boolean;
  onViewDetails: () => void;
  onBackHome: () => void;
};

function Celebration({
  totalReps,
  weekDays,
  stampsSelectedDay,
  onViewDetails,
  onBackHome,
}: CelebrationProps) {
  useCelebrationHaptics(stampsSelectedDay);

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <Animated.Text
          entering={fadeUp(CELEBRATION_TIMELINE.kicker)}
          style={styles.kicker}
        >
          Habit completed!
        </Animated.Text>
        <CelebrationBadge total={totalReps} />
        <Animated.Text
          entering={fadeUp(CELEBRATION_TIMELINE.headline)}
          style={styles.headline}
        >
          {totalReps === 1
            ? "1st Step to Greatness!"
            : `${ordinal(totalReps)} Step to Greatness!`}
        </Animated.Text>
        <Animated.Text
          entering={fadeUp(CELEBRATION_TIMELINE.sub)}
          style={styles.sub}
        >
          Congrats! You have earned {totalReps} Rep Milestone
        </Animated.Text>
        <View style={styles.week}>
          {weekDays.map((d, index) => (
            <WeekDayStamp
              key={d.localDay}
              label={d.label}
              index={index}
              completed={d.completed}
              isSelected={d.isSelected}
            />
          ))}
        </View>
        <Animated.View
          entering={fadeUp(CELEBRATION_TIMELINE.actions)}
          style={styles.actions}
        >
          <Pressable onPress={onViewDetails} style={styles.primary}>
            <Text style={styles.primaryText}>View habit details</Text>
          </Pressable>
          <Pressable onPress={onBackHome} style={styles.secondary}>
            <Text style={styles.secondaryText}>Back to Home</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
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
