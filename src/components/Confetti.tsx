import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

interface Piece {
  angle: number;
  dist: number;
  spin: number;
  w: number;
  h: number;
  color: string;
  delay: number;
}

function Bit({ p }: { p: Piece }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(p.delay, withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }));
  }, [p.delay, t]);
  const style = useAnimatedStyle(() => {
    const x = Math.cos(p.angle) * p.dist * t.value;
    // Burst outward, then fall under "gravity".
    const y = Math.sin(p.angle) * p.dist * t.value + 260 * t.value * t.value;
    return {
      opacity: t.value < 0.75 ? 1 : (1 - t.value) * 4,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${p.spin * t.value}deg` }],
    };
  });
  return <Animated.View style={[styles.bit, { width: p.w, height: p.h, backgroundColor: p.color, borderRadius: p.h / 3 }, style]} />;
}

/** One-shot burst from the centre of its container. */
export function Confetti({ colors, count = 46 }: { colors: string[]; count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6,
        dist: 140 + Math.random() * 200,
        spin: (Math.random() - 0.5) * 900,
        w: 8 + Math.random() * 8,
        h: 6 + Math.random() * 6,
        color: colors[i % colors.length],
        delay: Math.random() * 120,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <View pointerEvents="none" style={styles.origin}>
      {pieces.map((p, i) => (
        <Bit key={i} p={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  bit: { position: 'absolute' },
});
