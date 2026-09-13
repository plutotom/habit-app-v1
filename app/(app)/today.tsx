import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DateStrip } from "@/components/habits/DateStrip";
import { HabitCard } from "@/components/habits/HabitCard";
import { PageLoading, Spinner } from "@/components/ui/Spinner";
import { useLocalDay } from "@/hooks/use-local-day";
import {
  formatDayHeading,
  getHabitCreatedLocalDay,
  getWeekDays,
  isHabitActiveOnDay,
  weekOffsetForDay,
} from "@/lib/dates";
import {
  useLocalCheckinsForDays,
  useLocalHabits,
  useLocalMutations,
  useLocalPreferences,
} from "@/local/hooks";
import type { HabitId } from "@/local/types";
import { colors } from "@/theme";
import { isLocalDay } from "../../shared/validation";

export default function TodayScreen() {
  const router = useRouter();
  const { day: dayParam } = useLocalSearchParams<{ day?: string }>();
  const preferences = useLocalPreferences();
  const habits = useLocalHabits();
  const { completeHabit, undoCheckin } = useLocalMutations();
  const timezone = preferences?.timezone ?? "UTC";
  const weekStart = preferences?.weekStart ?? "mon";
  const todayLocal = useLocalDay(timezone);
  const selectedDay =
    dayParam && isLocalDay(dayParam) && dayParam <= todayLocal
      ? dayParam
      : todayLocal;

  const derivedOffset = weekOffsetForDay(selectedDay, timezone, weekStart);
  const [weekOffset, setWeekOffset] = useState(derivedOffset);
  const [offsetDay, setOffsetDay] = useState(selectedDay);
  const displayOffset = offsetDay === selectedDay ? weekOffset : derivedOffset;
  const weekDays = useMemo(
    () => getWeekDays(timezone, displayOffset, weekStart, todayLocal),
    [timezone, displayOffset, weekStart, todayLocal],
  );
  const weekDayStrings = useMemo(
    () => weekDays.map((day) => day.localDay),
    [weekDays],
  );
  const queryDays = useMemo(
    () => [...new Set([...weekDayStrings, selectedDay])],
    [weekDayStrings, selectedDay],
  );
  const weekCheckins = useLocalCheckinsForDays(queryDays);
  const [completingId, setCompletingId] = useState<string | null>(null);

  function selectDay(localDay: string) {
    router.setParams(
      localDay === todayLocal ? { day: undefined } : { day: localDay },
    );
    setWeekOffset(weekOffsetForDay(localDay, timezone, weekStart));
    setOffsetDay(localDay);
  }

  if (!preferences || habits === undefined || weekCheckins === undefined) {
    return <PageLoading />;
  }

  const dayCheckins = weekCheckins.filter(
    (checkin) => checkin.localDay === selectedDay && !checkin.isSkip,
  );
  const checkinMap = new Map(
    dayCheckins.map((checkin) => [checkin.habitId, checkin]),
  );
  const dueHabits = habits.filter((habit) =>
    isHabitActiveOnDay(habit, selectedDay, timezone),
  );
  const isToday = selectedDay === todayLocal;
  const earliestHabitDay =
    habits.length > 0
      ? habits.reduce(
          (earliest, habit) => {
            const created = getHabitCreatedLocalDay(habit, timezone);
            return created < earliest ? created : earliest;
          },
          getHabitCreatedLocalDay(habits[0]!, timezone),
        )
      : null;
  const isBeforeAnyHabits =
    earliestHabitDay !== null && selectedDay < earliestHabitDay;
  const completedDays = new Set(
    weekCheckins
      .filter((checkin) => !checkin.isSkip)
      .map((checkin) => checkin.localDay),
  );
  const completedCount = dueHabits.filter((habit) =>
    checkinMap.has(habit.id),
  ).length;

  async function handleComplete(habitId: HabitId) {
    setCompletingId(habitId);
    try {
      await completeHabit(habitId, selectedDay);
    } finally {
      setCompletingId(null);
    }
  }

  async function handleUndo(habitId: HabitId) {
    await undoCheckin(habitId, selectedDay);
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>
              {formatDayHeading(selectedDay, timezone)}
            </Text>
            {dueHabits.length > 0 ? (
              <Text style={styles.muted}>
                {completedCount}/{dueHabits.length} completed
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => router.push("/habits/new")}
            style={styles.add}
          >
            <Text style={styles.addText}>+ Habits</Text>
          </Pressable>
        </View>
        <DateStrip
          days={weekDays}
          selectedDay={selectedDay}
          completedDays={completedDays}
          canGoNextWeek={displayOffset < 0}
          onSelectDay={selectDay}
          onPrevWeek={() => {
            setWeekOffset(displayOffset - 1);
            setOffsetDay(selectedDay);
          }}
          onNextWeek={() => {
            setWeekOffset(Math.min(displayOffset + 1, 0));
            setOffsetDay(selectedDay);
          }}
        />
        <View style={styles.rule} />
        {dueHabits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {isBeforeAnyHabits
                ? "No habits yet on this day"
                : isToday
                  ? "No habits for today"
                  : "No habits scheduled"}
            </Text>
            {isToday && !isBeforeAnyHabits ? (
              <Pressable
                onPress={() => router.push("/habits/new")}
                style={styles.add}
              >
                <Text style={styles.addText}>+ Create your first habit</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {dueHabits.map((habit) => (
              <HabitCard
                key={`${habit.id}:${selectedDay}`}
                habitId={habit.id}
                title={habit.title}
                description={habit.description}
                done={checkinMap.has(habit.id)}
                localDay={selectedDay}
                todayLocal={todayLocal}
                canComplete={selectedDay <= todayLocal}
                onComplete={() => handleComplete(habit.id)}
                onUndo={() => handleUndo(habit.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      {completingId ? (
        <View style={styles.overlay}>
          <Spinner />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { gap: 24, paddingBottom: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  heading: { fontSize: 18, fontWeight: "600", color: colors.foreground },
  muted: { fontSize: 12, color: colors.muted, marginTop: 2 },
  add: {
    backgroundColor: colors.foreground,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addText: { color: colors.white, fontWeight: "600", fontSize: 14 },
  rule: { height: 1, backgroundColor: colors.border },
  empty: { alignItems: "center", gap: 16, paddingVertical: 64 },
  emptyTitle: { fontSize: 20, color: colors.muted, fontFamily: "Georgia" },
  list: { gap: 40 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(245,244,239,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
