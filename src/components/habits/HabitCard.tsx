import * as Haptics from "expo-haptics";
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
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useLocalHabitStatistics } from "@/local/hooks";
import {
  formatGoal,
  formatGoalNumber,
  formatGoalUnit,
} from "@/lib/habit-goals";
import type { HabitGoalUnit, HabitId } from "@/local/types";
import { colors, fonts } from "@/theme";

const HOLD_DURATION_MS = 2000;
const HOLD_TICKS: { at: number; style: Haptics.ImpactFeedbackStyle }[] = [
  { at: 0.25, style: Haptics.ImpactFeedbackStyle.Soft },
  { at: 0.5, style: Haptics.ImpactFeedbackStyle.Light },
  { at: 0.75, style: Haptics.ImpactFeedbackStyle.Medium },
];
const RIPPLE_HOLD_OPACITY = 0.2;
const RIPPLE_FLASH_OPACITY = 0.45;

function impact(style: Haptics.ImpactFeedbackStyle) {
  Haptics.impactAsync(style).catch(() => {});
}

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
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [showProgressInput, setShowProgressInput] = useState(false);
  const [progressDraft, setProgressDraft] = useState("");
  const [progressError, setProgressError] = useState("");
  const [isUndoing, setIsUndoing] = useState(false);
  const [rippleSize, setRippleSize] = useState(0);
  const cardRef = useRef<View>(null);
  const holdTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const completingRef = useRef(false);
  const mountedRef = useRef(true);

  const progressPercent = Math.min(progress / dailyGoal, 1);
  const holdStep = Math.max(0, Math.min(1 / dailyGoal, 1 - progressPercent));

  const hold = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const rippleX = useSharedValue(0);
  const rippleY = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const fill = useSharedValue(progressPercent);

  useEffect(() => {
    fill.set(
      withTiming(progressPercent, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [fill, progressPercent]);

  const clearTimers = useCallback(() => {
    holdTimersRef.current.forEach(clearTimeout);
    holdTimersRef.current = [];
  }, []);

  const clearHold = useCallback(() => {
    clearTimers();
    setIsHolding(false);
    cancelAnimation(hold);
    hold.set(withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) }));
    rippleOpacity.set(withTiming(0, { duration: 280 }));
    cardScale.set(withSpring(1, { damping: 14, stiffness: 220 }));
  }, [clearTimers, hold, rippleOpacity, cardScale]);

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") clearHold();
    });
    return () => {
      mountedRef.current = false;
      clearTimers();
      subscription.remove();
    };
  }, [clearHold, clearTimers]);

  const playCompletionBurst = useCallback(() => {
    impact(Haptics.ImpactFeedbackStyle.Heavy);
    rippleOpacity.set(
      withSequence(
        withTiming(RIPPLE_FLASH_OPACITY, { duration: 140 }),
        withTiming(0, { duration: 650, easing: Easing.out(Easing.quad) }),
      ),
    );
    hold.set(withDelay(650, withTiming(0, { duration: 300 })));
    cardScale.set(
      withSequence(
        withTiming(1.035, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 10, stiffness: 180 }),
      ),
    );
  }, [rippleOpacity, hold, cardScale]);

  const completeHold = useCallback(() => {
    clearTimers();
    setIsHolding(false);
    setIsCompleting(true);
    completingRef.current = true;
    playCompletionBurst();
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
        if (mountedRef.current) setIsCompleting(false);
      });
  }, [
    clearTimers,
    playCompletionBurst,
    onAddProgress,
    progress,
    dailyGoal,
    router,
    habitId,
    localDay,
  ]);

  const startHold = useCallback(
    (event?: GestureResponderEvent) => {
      if (done || completingRef.current || !canComplete) return;
      clearTimers();
      setIsHolding(true);

      const pageX = event?.nativeEvent.pageX;
      const pageY = event?.nativeEvent.pageY;
      if (pageX !== undefined && pageY !== undefined) {
        cardRef.current?.measureInWindow((x, y) => {
          rippleX.set(pageX - x);
          rippleY.set(pageY - y);
        });
      }

      impact(Haptics.ImpactFeedbackStyle.Light);
      cancelAnimation(hold);
      hold.set(0);
      hold.set(
        withTiming(1, { duration: HOLD_DURATION_MS, easing: Easing.linear }),
      );
      rippleOpacity.set(withTiming(RIPPLE_HOLD_OPACITY, { duration: 120 }));
      cardScale.set(withSpring(0.975, { damping: 18, stiffness: 240 }));

      holdTimersRef.current = [
        ...HOLD_TICKS.map(({ at, style }) =>
          setTimeout(() => impact(style), HOLD_DURATION_MS * at),
        ),
        setTimeout(completeHold, HOLD_DURATION_MS),
      ];
    },
    [
      done,
      canComplete,
      clearTimers,
      hold,
      rippleOpacity,
      rippleX,
      rippleY,
      cardScale,
      completeHold,
    ],
  );

  function handleCardLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setRippleSize(Math.ceil(Math.hypot(width, height) * 2));
  }

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [
      { translateX: rippleX.value - rippleSize / 2 },
      { translateY: rippleY.value - rippleSize / 2 },
      { scale: hold.value },
    ],
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  const previewAnimatedStyle = useAnimatedStyle(() => ({
    width: `${Math.min(fill.value + hold.value * holdStep, 1) * 100}%`,
  }));

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

  return (
    <View style={styles.wrap}>
      <View style={styles.streakBadge}>
        <Text style={styles.streakIcon}>⚡</Text>
        <Text style={styles.streakCount}>{streakCount}</Text>
      </View>
      <Animated.View style={cardAnimatedStyle}>
        <Pressable
          ref={cardRef}
          onLayout={handleCardLayout}
          onPressIn={(event) => {
            if (canComplete && !done) startHold(event);
          }}
          onPressOut={() => {
            if (canComplete && !done && !completingRef.current) clearHold();
          }}
          disabled={!canComplete || done}
          style={[styles.card, done && styles.cardDone]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ripple,
              {
                width: rippleSize,
                height: rippleSize,
                borderRadius: rippleSize / 2,
              },
              rippleAnimatedStyle,
            ]}
          />
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
            <Animated.View
              entering={FadeIn.duration(350)}
              style={styles.doneBlock}
            >
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
            </Animated.View>
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
                <Animated.View
                  style={[styles.progressPreview, previewAnimatedStyle]}
                />
                <Animated.View
                  style={[styles.progressFill, fillAnimatedStyle]}
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
                  <Text
                    style={[
                      styles.hintInline,
                      (isHolding || isCompleting) && styles.hintActive,
                    ]}
                  >
                    {isCompleting
                      ? "Nice!"
                      : isHolding
                        ? "Keep holding…"
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
      </Animated.View>
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
  ripple: {
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: colors.accentOrange,
  },
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
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: colors.accentOrange,
  },
  progressPreview: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: colors.accentOrange,
    opacity: 0.35,
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
  hintActive: { fontWeight: "600", color: colors.foreground },
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
});
