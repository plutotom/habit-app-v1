import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

const PIECE_COUNT = 28;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PALETTE = ["#f5c842", "#f5a623", "#ffffff", "#ff7a59", "#8fd3b6"];

type Piece = {
  angle: number;
  distance: number;
  spin: number;
  width: number;
  height: number;
  color: string;
};

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const PIECES: Piece[] = Array.from({ length: PIECE_COUNT }, (_, index) => {
  const jitter = pseudoRandom(index + 1);
  const isStrip = index % 3 !== 0;
  return {
    angle: index * GOLDEN_ANGLE,
    distance: 90 + jitter * 110,
    spin: (pseudoRandom(index + 7) - 0.5) * 900,
    width: isStrip ? 6 : 8,
    height: isStrip ? 12 : 8,
    color: PALETTE[index % PALETTE.length]!,
  };
});

type ConfettiBurstProps = {
  delay?: number;
  duration?: number;
  gravity?: number;
};

export function ConfettiBurst({
  delay = 0,
  duration = 1600,
  gravity = 140,
}: ConfettiBurstProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(delay, withTiming(1, { duration, easing: Easing.linear })),
    );
  }, [progress, delay, duration]);

  return (
    <View pointerEvents="none" style={styles.origin}>
      {PIECES.map((piece, index) => (
        <ConfettiPiece
          key={index}
          piece={piece}
          progress={progress}
          gravity={gravity}
        />
      ))}
    </View>
  );
}

function ConfettiPiece({
  piece,
  progress,
  gravity,
}: {
  piece: Piece;
  progress: SharedValue<number>;
  gravity: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const burst = 1 - Math.pow(1 - t, 3);
    return {
      opacity: t === 0 ? 0 : 1 - Math.pow(t, 2.5),
      transform: [
        { translateX: Math.cos(piece.angle) * piece.distance * burst },
        {
          translateY:
            Math.sin(piece.angle) * piece.distance * burst + gravity * t * t,
        },
        { rotate: `${piece.spin * t}deg` },
        { scale: 1 - t * 0.4 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.width,
          height: piece.height,
          marginLeft: -piece.width / 2,
          marginTop: -piece.height / 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  origin: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 0,
    height: 0,
  },
  piece: { position: "absolute", borderRadius: 2 },
});
