import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
} from "react-native";

import { useLocalHabitStatistics } from "@/local/hooks";
import {
  formatGoal,
  formatGoalNumber,
  formatGoalUnit,
} from "@/lib/habit-goals";
import type { HabitGoalUnit, HabitId } from "@/local/types";
import { colors, fonts } from "@/theme";

const HOLD_DURATION_MS = 2000;

type HabitCardProps = {
  habitId: HabitId;
  title: string;
  description?: string;
  dailyGoal: number;
  goalUnit: HabitGoalUnit;
  customUnit?: string;
  progress: number;
  done: boolean;
  localDay: string;
  todayLocal: string;
  canComplete: boolean;
  onAddProgress: (amount: number) => Promise<void>;
  onUndo: () => Promise<void>;
};

export function HabitCard({
  habitId,
  title,
  description,
  dailyGoal,
  goalUnit,
  customUnit,
  progress,
  done,
  localDay,
  todayLocal,
  canComplete,
  onAddProgress,
  onUndo,
}: HabitCardProps) {
  const router = useRouter();
  const streak = useLocalHabitStatistics(habitId, todayLocal);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [showProgressInput, setShowProgressInput] = useState(false);
  const [progressDraft, setProgressDraft] = useState("");
  const [progressError, setProgressError] = useState("");
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
      const holdFraction = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(holdFraction);
      if (holdFraction >= 1) {
        if (holdTimerRef.current) {
          clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        setIsCompleting(true);
        completingRef.current = true;
        void onAddProgress(1)
          .then(() => {
            if (mountedRef.current && progress + 1 >= dailyGoal)
              router.push({
                pathname: "/habits/[habitId]/completed",
                params: { habitId, day: localDay },
              });
          })
          .catch(() => {
            if (mountedRef.current)
              Alert.alert(
                "Couldn't save",
                "Couldn’t save on this phone. Please try again.",
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
  }, [
    done,
    canComplete,
    dailyGoal,
    habitId,
    localDay,
    onAddProgress,
    progress,
    router,
    clearHold,
  ]);

  function openProgressInput(e: GestureResponderEvent) {
    e.stopPropagation();
    setProgressError("");
    if (showProgressInput) {
      setShowProgressInput(false);
      setProgressDraft("");
      return;
    }
    setShowProgressInput(true);
  }

  function submitProgress(e: GestureResponderEvent) {
    e.stopPropagation();
    const amount = Number(progressDraft.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setProgressError("Enter an amount greater than 0.");
      return;
    }
    setIsAddingProgress(true);
    setProgressError("");
    void onAddProgress(amount)
      .then(() => {
        setProgressDraft("");
        setShowProgressInput(false);
        if (mountedRef.current && progress + amount >= dailyGoal) {
          router.push({
            pathname: "/habits/[habitId]/completed",
            params: { habitId, day: localDay },
          });
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          Alert.alert(
            "Couldn't save",
            "Couldn’t save on this phone. Please try again.",
          );
        }
      })
      .finally(() => {
        if (mountedRef.current) setIsAddingProgress(false);
      });
  }

  async function handleUndo(e: GestureResponderEvent) {
    e.stopPropagation();
    if (isUndoing) return;
    setIsUndoing(true);
    try {
      await onUndo();
    } catch {
      Alert.alert(
        "Couldn't undo",
        "Couldn’t save on this phone. Please try again.",
      );
    } finally {
      setIsUndoing(false);
    }
  }

  const streakCount = streak?.current ?? "…";
  const oneUnitLabel = formatGoalUnit(goalUnit, 1, customUnit);
  const progressPercent = Math.min(progress / dailyGoal, 1);

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
            <Text style={styles.progressSummary}>
              {formatGoal(progress, goalUnit, customUnit)} goal
            </Text>
            {canComplete ? (
              <Pressable onPress={handleUndo} disabled={isUndoing}>
                <Text style={styles.undo}>
                  {isUndoing ? "Undoing…" : "Undo"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {!done ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                {formatGoalNumber(progress)} / {formatGoalNumber(dailyGoal)}{" "}
                {formatGoalUnit(goalUnit, dailyGoal, customUnit)}
              </Text>
              <Text style={styles.progressPercent}>
                {Math.round(progressPercent * 100)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent * 100}%` },
                ]}
              />
            </View>
            {canComplete ? (
              <View style={styles.progressActions}>
                <Pressable
                  accessibilityLabel="Log a specific amount"
                  onPressIn={(e) => e.stopPropagation()}
                  onPress={openProgressInput}
                  disabled={isAddingProgress}
                  style={styles.logButton}
                >
                  <Text style={styles.logButtonText}>
                    {showProgressInput ? "Close" : "Log amount"}
                  </Text>
                </Pressable>
                <Text style={styles.hintInline}>
                  {isHolding
                    ? `Keep holding… ${Math.round(holdProgress * 100)}%`
                    : isCompleting
                      ? "Saving…"
                      : `Hold to add 1 ${oneUnitLabel}`}
                </Text>
              </View>
            ) : null}
            {showProgressInput && canComplete ? (
              <View style={styles.progressEntry}>
                <TextInput
                  value={progressDraft}
                  onChangeText={setProgressDraft}
                  keyboardType="decimal-pad"
                  placeholder={`e.g. ${formatGoalNumber(dailyGoal)}`}
                  placeholderTextColor={colors.muted}
                  style={styles.progressInput}
                />
                <Pressable
                  accessibilityLabel="Add progress"
                  onPressIn={(e) => e.stopPropagation()}
                  onPress={submitProgress}
                  disabled={isAddingProgress}
                  style={[
                    styles.addProgress,
                    isAddingProgress && styles.disabled,
                  ]}
                >
                  <Text style={styles.addProgressText}>
                    {isAddingProgress ? "Adding…" : "Add"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {progressError ? (
              <Text style={styles.progressError}>{progressError}</Text>
            ) : null}
          </View>
        ) : null}
        {!done && !canComplete ? (
          <Text style={styles.hint}>Not completed</Text>
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
  progressSummary: { fontSize: 13, color: colors.muted },
  progressBlock: { marginTop: 36, gap: 10 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  progressText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  progressPercent: { fontSize: 12, color: colors.muted },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: colors.pill,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.accentOrange,
  },
  progressActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  logButton: {
    borderRadius: 999,
    backgroundColor: colors.foreground,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logButtonText: { fontSize: 12, fontWeight: "600", color: colors.white },
  hintInline: { flex: 1, fontSize: 11, color: colors.muted },
  progressEntry: { flexDirection: "row", gap: 8, marginTop: 2 },
  progressInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.foreground,
  },
  addProgress: {
    borderRadius: 12,
    backgroundColor: colors.accentOrange,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  addProgressText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  progressError: { fontSize: 12, color: "#a33a2b" },
  disabled: { opacity: 0.5 },
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
