import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ConfettiBurst } from "@/components/ui/ConfettiBurst";
import { colors, fonts } from "@/theme";

const BADGE_SIZE = 96;
const BADGE_GOLD = "#f5c842";

export const CELEBRATION_TIMELINE = {
  kicker: 50,
  badge: 150,
  burst: 320,
  roll: 750,
  headline: 800,
  sub: 900,
  week: 1000,
  weekStagger: 50,
  stamp: 1500,
  actions: 1250,
} as const;

export function fadeUp(delay: number) {
  return FadeInDown.delay(delay).duration(450).easing(Easing.out(Easing.cubic));
}

export function useCelebrationHaptics(hasStamp: boolean) {
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
      }, CELEBRATION_TIMELINE.burst),
    ];
    if (hasStamp) {
      timers.push(
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(
            () => {},
          );
        }, CELEBRATION_TIMELINE.stamp),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [hasStamp]);
}

export function CelebrationBadge({ total }: { total: number }) {
  const reduceMotion = useReducedMotion();
  const badgeScale = useSharedValue(0);
  const roll = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    badgeScale.set(
      withSequence(
        withDelay(
          CELEBRATION_TIMELINE.badge,
          withSpring(1, { damping: 9, stiffness: 160 }),
        ),
        withDelay(250, withTiming(1.12, { duration: 120 })),
        withSpring(1, { damping: 10, stiffness: 200 }),
      ),
    );
    roll.set(
      withDelay(
        CELEBRATION_TIMELINE.roll,
        withSpring(1, { damping: 14, stiffness: 170 }),
      ),
    );
    halo.set(
      withDelay(
        CELEBRATION_TIMELINE.burst,
        withRepeat(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      ),
    );
  }, [badgeScale, roll, halo]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + halo.value * 0.14,
    transform: [{ scale: 1.35 + halo.value * 0.2 }],
  }));
  const previousStyle = useAnimatedStyle(() => ({
    opacity: 1 - roll.value,
    transform: [{ translateY: -roll.value * BADGE_SIZE * 0.6 }],
  }));
  const currentStyle = useAnimatedStyle(() => ({
    opacity: roll.value,
    transform: [{ translateY: (1 - roll.value) * BADGE_SIZE * 0.6 }],
  }));

  return (
    <View style={styles.badgeStage}>
      <Animated.View style={[styles.halo, haloStyle]} />
      <Ring delay={CELEBRATION_TIMELINE.burst} />
      <Ring delay={CELEBRATION_TIMELINE.burst + 180} />
      {reduceMotion ? null : (
        <ConfettiBurst delay={CELEBRATION_TIMELINE.burst} />
      )}
      <Animated.View style={[styles.badge, badgeStyle]}>
        <Animated.Text style={[styles.badgeNum, previousStyle]}>
          {total - 1}
        </Animated.Text>
        <Animated.Text style={[styles.badgeNum, currentStyle]}>
          {total}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

function Ring({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        delay,
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [progress, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.7 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 1.6 }],
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

type WeekDayStampProps = {
  label: string;
  index: number;
  completed: boolean;
  isSelected: boolean;
};

export function WeekDayStamp({
  label,
  index,
  completed,
  isSelected,
}: WeekDayStampProps) {
  const stamped = completed && isSelected;
  const stamp = useSharedValue(stamped ? 0 : 1);

  useEffect(() => {
    if (!stamped) return;
    stamp.set(
      withDelay(
        CELEBRATION_TIMELINE.stamp,
        withSpring(1, { damping: 8, stiffness: 220 }),
      ),
    );
  }, [stamp, stamped]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: Math.min(stamp.value * 2, 1),
    transform: [{ scale: stamp.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: stamp.value },
      { rotate: `${(1 - stamp.value) * -25}deg` },
    ],
  }));

  return (
    <Animated.View
      entering={fadeUp(
        CELEBRATION_TIMELINE.week + index * CELEBRATION_TIMELINE.weekStagger,
      )}
      style={styles.weekDay}
    >
      <View style={[styles.circle, isSelected && styles.circleSelected]}>
        {completed ? (
          <>
            <Animated.View style={[styles.circleFill, fillStyle]} />
            <Animated.Text style={[styles.check, checkStyle]}>✓</Animated.Text>
          </>
        ) : null}
      </View>
      <Text style={[styles.dow, isSelected && styles.dowSelected]}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badgeStage: {
    marginTop: 40,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: BADGE_GOLD,
  },
  ring: {
    position: "absolute",
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    borderColor: BADGE_GOLD,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: BADGE_GOLD,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeNum: {
    position: "absolute",
    fontFamily: fonts.serif,
    fontSize: 48,
    color: "#3d2a00",
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
  circleSelected: { borderColor: colors.white },
  circleFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  check: { color: colors.completedBg, fontWeight: "700" },
  dow: { fontSize: 10, color: "rgba(255,255,255,0.5)" },
  dowSelected: { color: colors.white },
});
