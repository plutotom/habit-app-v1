import { Pressable, StyleSheet, Text, View } from "react-native";

import type { WeekDay } from "@/lib/dates";
import { colors } from "@/theme";

type DateStripProps = {
  days: WeekDay[];
  selectedDay: string;
  completedDays: Set<string>;
  canGoNextWeek: boolean;
  onSelectDay: (localDay: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

export function DateStrip({
  days,
  selectedDay,
  completedDays,
  canGoNextWeek,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
}: DateStripProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.arrows}>
        <Pressable onPress={onPrevWeek} style={styles.arrow} hitSlop={8}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Pressable
          onPress={onNextWeek}
          disabled={!canGoNextWeek}
          style={styles.arrow}
          hitSlop={8}
        >
          <Text style={[styles.arrowText, !canGoNextWeek && styles.disabled]}>
            ›
          </Text>
        </Pressable>
      </View>
      <View style={styles.days}>
        {days.map((day) => {
          const isSelected = day.localDay === selectedDay;
          const hasCompletions = completedDays.has(day.localDay);
          return (
            <Pressable
              key={day.localDay}
              disabled={day.isFuture}
              onPress={() => onSelectDay(day.localDay)}
              style={[styles.day, day.isFuture && styles.disabled]}
            >
              <Text style={[styles.dow, isSelected && styles.dowSelected]}>
                {day.isToday ? "Today" : day.label}
              </Text>
              <View
                style={[
                  styles.date,
                  isSelected && styles.dateSelected,
                  !isSelected && hasCompletions && styles.dateDone,
                ]}
              >
                <Text
                  style={[
                    styles.dateText,
                    isSelected && styles.dateTextSelected,
                  ]}
                >
                  {day.date}
                </Text>
              </View>
              <View style={styles.marker}>
                {isSelected ? (
                  <View style={styles.selectedLine} />
                ) : hasCompletions ? (
                  <View style={styles.dot} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  arrows: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  arrow: {
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: { fontSize: 24, color: colors.muted },
  disabled: { opacity: 0.3 },
  days: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  day: { flex: 1, alignItems: "center", gap: 6 },
  dow: { fontSize: 11, fontWeight: "500", color: colors.muted },
  dowSelected: { color: colors.foreground },
  date: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateSelected: { backgroundColor: colors.foreground },
  dateDone: { backgroundColor: colors.pill },
  dateText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  dateTextSelected: { color: colors.white },
  marker: { height: 6, alignItems: "center", justifyContent: "center" },
  selectedLine: {
    height: 2,
    width: 28,
    borderRadius: 1,
    backgroundColor: colors.foreground,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.accentOrange,
  },
});
