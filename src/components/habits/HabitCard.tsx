import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";

import type { Id } from "@backend/dataModel";
import { useHabitStatistics } from "@/hooks/use-habit-statistics";
import { colors, fonts } from "@/theme";

const HOLD_DURATION_MS = 3000;

type HabitCardProps = {
  habitId: Id<"habits">;
  title: string;
  description?: string;
  done: boolean;
  localDay: string;
  todayLocal: string;
  canComplete: boolean;
  onComplete: () => Promise<void>;
  onUndo: () => Promise<void>;
};

export function HabitCard({
  habitId,
  title,
  description,
  done,
  localDay,
  todayLocal,
  canComplete,
  onComplete,
  onUndo,
}: HabitCardProps) {
  const router = useRouter();
  const streak = useHabitStatistics(habitId, todayLocal);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const completingRef = useRef(false);
  const mountedRef = useRef(true);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdStartRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") clearHold();
    });
    return () => {
      mountedRef.current = false;
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      subscription.remove();
    };
  }, [clearHold]);

  const startHold = useCallback(() => {
    if (done || completingRef.current || !canComplete) return;
    clearHold();
    holdStartRef.current = Date.now();
    setIsHolding(true);
    setHoldProgress(0);
    holdTimerRef.current = setInterval(() => {
      if (!holdStartRef.current) return;
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        setIsCompleting(true);
        completingRef.current = true;
        void onComplete()
          .then(() => {
            if (mountedRef.current)
              router.push({
                pathname: "/habits/[habitId]/completed",
                params: { habitId, day: localDay },
              });
          })
          .catch(() => {
            if (mountedRef.current)
              Alert.alert(
                "Couldn't save",
                "Please check your connection and try again.",
              );
          })
          .finally(() => {
            completingRef.current = false;
            if (mountedRef.current) {
              setIsCompleting(false);
              clearHold();
            }
          });
      }
    }, 16);
  }, [done, canComplete, habitId, localDay, onComplete, router, clearHold]);

  async function handleUndo(e: GestureResponderEvent) {
    e.stopPropagation();
    if (isUndoing) return;
    setIsUndoing(true);
    try {
      await onUndo();
    } catch {
      Alert.alert(
        "Couldn't undo",
        "Please check your connection and try again.",
      );
    } finally {
      setIsUndoing(false);
    }
  }

  const streakCount = streak?.current ?? "…";

  return (
    <View style={styles.wrap}>
      <View style={styles.streakBadge}>
        <Text style={styles.streakIcon}>⚡</Text>
        <Text style={styles.streakCount}>{streakCount}</Text>
      </View>
      <Pressable
        onPressIn={() => {
          if (canComplete && !done) startHold();
        }}
        onPressOut={() => {
          if (canComplete && !done && !isCompleting) clearHold();
        }}
        disabled={!canComplete || done}
        style={[styles.card, done && styles.cardDone]}
      >
        <View style={styles.actions}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/habits/[habitId]",
                params: { habitId },
              })
            }
            style={styles.pill}
          >
            <Text style={styles.pillText}>Details</Text>
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
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {description ? (
            <>
              <Text style={styles.want}>I want to become</Text>
              <Text style={styles.title}>{description}</Text>
            </>
          ) : null}
        </View>
        {done ? (
          <View style={styles.doneBlock}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Completed</Text>
            </View>
            {canComplete ? (
              <Pressable onPress={handleUndo} disabled={isUndoing}>
                <Text style={styles.undo}>
                  {isUndoing ? "Undoing…" : "Undo"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {!done && canComplete && !isHolding && !isCompleting ? (
          <Text style={styles.hint}>Press and hold to complete</Text>
        ) : null}
        {!done && !canComplete ? (
          <Text style={styles.hint}>Not completed</Text>
        ) : null}
        {isHolding && !done ? (
          <Text style={styles.holding}>
            Keep holding… {Math.round(holdProgress * 100)}%
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 8, position: "relative" },
  streakBadge: {
    position: "absolute",
    right: -4,
    top: 24,
    zIndex: 10,
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#f5c842",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  streakIcon: { fontSize: 12 },
  streakCount: { fontSize: 12, fontWeight: "700", color: colors.foreground },
  card: {
    overflow: "hidden",
    borderRadius: 32,
    backgroundColor: colors.surface,
    paddingHorizontal: 32,
    paddingVertical: 56,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  cardDone: { opacity: 0.7 },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 40,
  },
  pill: {
    borderRadius: 999,
    backgroundColor: colors.pill,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pillText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  body: { alignItems: "center", gap: 12 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
    color: colors.foreground,
  },
  want: { fontSize: 14, color: colors.muted },
  doneBlock: { marginTop: 32, alignItems: "center", gap: 12 },
  undo: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.muted,
    textDecorationLine: "underline",
  },
  hint: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 12,
    color: colors.muted,
  },
  holding: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: colors.accentOrange,
  },
});
