import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@backend/api";
import type { Id } from "@backend/dataModel";
import { DateStrip } from "@/components/habits/DateStrip";
import { HabitCard } from "@/components/habits/HabitCard";
import { PageLoading, Spinner } from "@/components/ui/Spinner";
import {
  formatDayHeading,
  getHabitCreatedLocalDay,
  getLocalDay,
  getWeekDays,
  isHabitActiveOnDay,
  weekOffsetForDay,
} from "@/lib/dates";
import { colors } from "@/theme";

export default function TodayScreen() {
  const router = useRouter();
  const { day: dayParam } = useLocalSearchParams<{ day?: string }>();

  const user = useQuery(api.users.current);
  const habits = useQuery(api.habits.list);
  const timezone = user?.timezone ?? "UTC";
  const weekStart = user?.weekStart ?? "mon";
  const todayLocal = getLocalDay(timezone);
  const selectedDay =
    dayParam && dayParam <= todayLocal ? dayParam : todayLocal;

  const derivedOffset = weekOffsetForDay(selectedDay, timezone, weekStart);
  const [weekOffset, setWeekOffset] = useState(derivedOffset);
  const [offsetDay, setOffsetDay] = useState(selectedDay);
  const displayOffset = offsetDay === selectedDay ? weekOffset : derivedOffset;

  const weekDays = useMemo(
    () => getWeekDays(timezone, displayOffset, weekStart),
    [timezone, displayOffset, weekStart],
  );
  const weekDayStrings = useMemo(
    () => weekDays.map((d) => d.localDay),
    [weekDays],
  );
  const weekCheckins = useQuery(api.checkins.forDayRange, {
    days: weekDayStrings,
  });
  const checkin = useMutation(api.checkins.checkin);
  const undoCheckin = useMutation(api.checkins.undoCheckin);
  const [completingId, setCompletingId] = useState<string | null>(null);

  function selectDay(localDay: string) {
    if (localDay === todayLocal) {
      router.setParams({ day: undefined });
    } else {
      router.setParams({ day: localDay });
    }
    setWeekOffset(weekOffsetForDay(localDay, timezone, weekStart));
    setOffsetDay(localDay);
  }

  if (
    user === undefined ||
    habits === undefined ||
    weekCheckins === undefined
  ) {
    return <PageLoading />;
  }

  const dayCheckins = weekCheckins.filter((c) => c.localDay === selectedDay);
  const checkinMap = new Map(dayCheckins.map((c) => [c.habitId, c]));
  const dueHabits = habits.filter((h) =>
    isHabitActiveOnDay(h, selectedDay, timezone),
  );
  const isToday = selectedDay === todayLocal;
  const earliestHabitDay =
    habits.length > 0
      ? habits.reduce(
          (earliest, h) => {
            const created = getHabitCreatedLocalDay(h, timezone);
            return created < earliest ? created : earliest;
          },
          getHabitCreatedLocalDay(habits[0]!, timezone),
        )
      : null;
  const isBeforeAnyHabits =
    earliestHabitDay !== null && selectedDay < earliestHabitDay;

  const completedDays = new Set<string>();
  for (const c of weekCheckins) {
    if (!c.isSkip) completedDays.add(c.localDay);
  }

  const completedCount = dueHabits.filter((h) => {
    const c = checkinMap.get(h._id);
    return c && !c.isSkip;
  }).length;

  async function handleComplete(habitId: Id<"habits">) {
    setCompletingId(habitId);
    try {
      await checkin({ habitId, localDay: selectedDay });
    } finally {
      setCompletingId(null);
    }
  }

  async function handleUndo(habitId: Id<"habits">) {
    await undoCheckin({ habitId, localDay: selectedDay });
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
        {!isToday ? (
          <Text style={styles.historyNote}>
            Viewing history — switch to today to complete habits
          </Text>
        ) : null}
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
            {dueHabits.map((habit) => {
              const c = checkinMap.get(habit._id);
              const done = !!c && !c.isSkip;
              return (
                <HabitCard
                  key={habit._id}
                  habitId={habit._id}
                  title={habit.title}
                  description={habit.description}
                  done={done}
                  localDay={selectedDay}
                  canComplete={isToday}
                  onComplete={() => handleComplete(habit._id)}
                  onUndo={() => handleUndo(habit._id)}
                />
              );
            })}
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
  historyNote: {
    backgroundColor: colors.pill,
    borderRadius: 16,
    padding: 12,
    textAlign: "center",
    fontSize: 14,
    color: colors.muted,
  },
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
