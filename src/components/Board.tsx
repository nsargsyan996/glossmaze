import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Level } from '../game/types';
import { mix, Theme } from '../theme';

export const MS_PER_CELL = 34;

/** Proportions, as fractions of one tile. */
const CHANNEL_WALL = 0.26; // visible inner wall of the carved channel
const TRAY_MARGIN = 0.45; // solid rim around the maze
const TRAY_THICKNESS = 0.2; // the tray's front edge

const px = (c: number, f: number) => Math.max(2, Math.round(c * f));

/** Board footprint (tray rim and front edge included), for layout calculations. */
export function boardSize(level: Pick<Level, 'width' | 'height'>, cell: number) {
  const m = cell * TRAY_MARGIN;
  return {
    width: level.width * cell + 2 * m,
    height: level.height * cell + 2 * m + cell * TRAY_THICKNESS,
  };
}

interface Edges {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  /** Diagonal neighbours above, used to round the channel wall where a wall corner ends. */
  upLeft: boolean;
  upRight: boolean;
}

/**
 * One tile of the channel carved into the tray. Where a wall sits above, the
 * channel's inner wall shows as a shaded strip; side walls cast soft shading;
 * channel ends are rounded.
 */
const FloorCell = memo(function FloorCell({
  left, top, size, painted, delay, theme, walls,
}: { left: number; top: number; size: number; painted: boolean; delay: number; theme: Theme; walls: Edges }) {
  const p = useSharedValue(painted ? 1 : 0);

  useEffect(() => {
    if (painted) {
      p.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.back(2)) }));
    } else {
      p.value = withTiming(0, { duration: 140 });
    }
  }, [painted, delay, p]);

  const paintStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 2),
    transform: [{ scale: 0.3 + 0.7 * p.value }],
    borderRadius: size * 0.5 * (1 - Math.min(1, p.value)),
  }));

  const r = size * 0.3;
  const wallH = px(size, CHANNEL_WALL);
  const ao = px(size, 0.08);
  const dot = px(size, 0.15);
  return (
    <View
      style={{
        position: 'absolute', left, top, width: size, height: size,
        backgroundColor: theme.floor, overflow: 'hidden',
        borderTopLeftRadius: walls.up && walls.left ? r : 0,
        borderTopRightRadius: walls.up && walls.right ? r : 0,
        borderBottomLeftRadius: walls.down && walls.left ? r : 0,
        borderBottomRightRadius: walls.down && walls.right ? r : 0,
      }}
    >
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: walls.up ? wallH : 0 }]}>
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: theme.floorDot }} />
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.paint }, paintStyle]} />
      {/* Side walls darken the channel edges slightly */}
      {walls.left && <View style={[styles.aoV, { left: 0, width: ao, backgroundColor: theme.ink }]} />}
      {walls.right && <View style={[styles.aoV, { right: 0, width: ao, backgroundColor: theme.ink }]} />}
      {walls.up && (
        <>
          {/* Inner wall of the channel, lit from above, with its shadow on the floor */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: wallH, height: ao * 1.4, backgroundColor: theme.ink, opacity: 0.16 }} />
          <View
            style={{
              position: 'absolute', left: 0, right: 0, top: 0, height: wallH, backgroundColor: theme.wallSide, overflow: 'hidden',
              borderTopLeftRadius: !walls.left && !walls.upLeft ? r : 0,
              borderTopRightRadius: !walls.right && !walls.upRight ? r : 0,
            }}
          >
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: wallH * 0.35, backgroundColor: theme.ink, opacity: 0.12 }} />
          </View>
        </>
      )}
      {walls.down && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: theme.ink, opacity: 0.12 }} />}
    </View>
  );
});

interface BoardProps {
  level: Level;
  painted: boolean[];
  delays: number[];
  cellSize: number;
  theme: Theme;
  children?: React.ReactNode;
}

/**
 * Draws the level as a solid toy tray with the maze carved into it as a channel.
 * Walls are simply the tray's surface, so only floor tiles need views.
 */
export function Board({ level, painted, delays, cellSize: c, theme, children }: BoardProps) {
  const m = c * TRAY_MARGIN;
  const thick = c * TRAY_THICKNESS;
  const { width, height } = boardSize(level, c);

  const edges = useMemo(() => {
    const wall = (x: number, y: number) =>
      x < 0 || y < 0 || x >= level.width || y >= level.height || level.walls[y * level.width + x];
    return level.walls.map((w, i) => {
      if (w) return null;
      const x = i % level.width;
      const y = Math.floor(i / level.width);
      return {
        up: wall(x, y - 1), down: wall(x, y + 1), left: wall(x - 1, y), right: wall(x + 1, y),
        upLeft: wall(x - 1, y - 1), upRight: wall(x + 1, y - 1),
      };
    });
  }, [level]);

  const floors: React.ReactNode[] = [];
  edges.forEach((e, i) => {
    if (!e) return;
    floors.push(
      <FloorCell
        key={i}
        left={m + (i % level.width) * c}
        top={m + Math.floor(i / level.width) * c}
        size={c}
        painted={painted[i]}
        delay={delays[i] ?? 0}
        theme={theme}
        walls={e}
      />,
    );
  });

  // Round the convex corners of wall islands: floor fills the corner, tray surface curves over it.
  const surfaceH = height - thick;
  const fillets = useMemo(() => {
    const floor = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < level.width && y < level.height && !level.walls[y * level.width + x];
    const r = Math.round(c * 0.3);
    const out: React.ReactNode[] = [];
    level.walls.forEach((w, i) => {
      if (!w) return;
      const x = i % level.width;
      const y = Math.floor(i / level.width);
      const X = m + x * c;
      const Y = m + y * c;
      // Each corner: position, circle offset, and the three floor tiles that surround it.
      const corners: [number, number, number, number, [number, number][]][] = [
        [X, Y, 0, 0, [[x - 1, y], [x, y - 1], [x - 1, y - 1]]],
        [X + c - r, Y, -r, 0, [[x + 1, y], [x, y - 1], [x + 1, y - 1]]],
        [X, Y + c - r, 0, -r, [[x - 1, y], [x, y + 1], [x - 1, y + 1]]],
        [X + c - r, Y + c - r, -r, -r, [[x + 1, y], [x, y + 1], [x + 1, y + 1]]],
      ];
      corners.forEach(([left, top, cx, cy, around], k) => {
        if (!around.every(([ax, ay]) => floor(ax, ay))) return;
        const wet = around.every(([ax, ay]) => painted[ay * level.width + ax]);
        // Match the tray's vertical gradient at this height.
        const t = Math.min(1, Math.max(0, (top / surfaceH - 0.35) / 0.65)) * 0.3;
        out.push(
          <View key={`${i}-${k}`} style={{ position: 'absolute', left, top, width: r, height: r, overflow: 'hidden', backgroundColor: wet ? theme.paint : theme.floor }}>
            <View style={{ position: 'absolute', left: cx, top: cy, width: 2 * r, height: 2 * r, borderRadius: r, backgroundColor: mix(theme.wallTop, theme.wallSide, t) }} />
          </View>,
        );
      });
    });
    return out;
  }, [level, c, m, surfaceH, theme, painted]);

  const radius = c * 0.55;
  return (
    <View style={{ width, height }}>
      {/* Tray front edge and drop shadow */}
      <View style={[styles.trayEdge, { top: thick, borderRadius: radius, backgroundColor: theme.wallSide, shadowColor: theme.ink }]}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: thick, borderBottomLeftRadius: radius, borderBottomRightRadius: radius, backgroundColor: theme.ink, opacity: 0.1 }} />
      </View>
      {/* Tray surface */}
      <View style={{ position: 'absolute', left: 0, top: 0, width, height: height - thick, borderRadius: radius, overflow: 'hidden' }}>
        <LinearGradient colors={[theme.wallTop, mix(theme.wallTop, theme.wallSide, 0.3)]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: radius * 0.6, right: radius * 0.6, top: 2, height: 2, borderRadius: 1, backgroundColor: '#ffffff', opacity: 0.8 }} />
        {floors}
        {fillets}
        <View pointerEvents="none" style={{ position: 'absolute', left: m, top: m }}>
          {children}
        </View>
      </View>
    </View>
  );
}

interface BallProps {
  pos: number;
  width: number;
  size: number;
  duration: number;
  theme: Theme;
  onStop?: () => void;
}

export function Ball({ pos, width, size, duration, theme, onStop }: BallProps) {
  const tx = (pos % width) * size;
  const ty = Math.floor(pos / width) * size;
  const x = useSharedValue(tx);
  const y = useSharedValue(ty);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);

  useEffect(() => {
    if (!duration) {
      x.value = tx;
      y.value = ty;
      return;
    }
    const horizontal = tx !== x.value;
    const cfg = { duration, easing: Easing.bezier(0.45, 0, 0.85, 1) };
    x.value = withTiming(tx, cfg);
    y.value = withTiming(ty, cfg);
    // Stretch along the direction of travel, then squash on impact.
    const [a, b] = horizontal ? [sx, sy] : [sy, sx];
    a.value = withSequence(withTiming(1.12, { duration: 80 }), withDelay(Math.max(0, duration - 80), withSequence(withTiming(0.78, { duration: 70 }), withTiming(1, { duration: 140 }))));
    b.value = withSequence(withTiming(0.92, { duration: 80 }), withDelay(Math.max(0, duration - 80), withSequence(withTiming(1.14, { duration: 70 }), withTiming(1, { duration: 140 }))));
    const t = setTimeout(() => onStop?.(), duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, ty, duration]);

  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }] }));
  const squash = useAnimatedStyle(() => ({ transform: [{ scaleX: sx.value }, { scaleY: sy.value }] }));

  const dia = Math.round(size * 0.74);
  const ring = Math.max(2, Math.round(size * 0.06));
  return (
    <Animated.View style={[styles.ballCell, { width: size, height: size }, move]}>
      {/* contact shadow on the floor */}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.1,
          width: dia * 0.72,
          height: dia * 0.2,
          borderRadius: dia,
          backgroundColor: theme.ink,
          opacity: 0.16,
        }}
      />
      <Animated.View style={[{ width: dia, height: dia, marginTop: -size * 0.06 }, squash]}>
        <View style={{ flex: 1, borderRadius: dia / 2, borderWidth: ring, borderColor: theme.wallTop, overflow: 'hidden' }}>
          <LinearGradient colors={[theme.paintHi, theme.paint]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
          <View
            style={{
              position: 'absolute',
              top: dia * 0.12,
              left: dia * 0.18,
              width: dia * 0.32,
              height: dia * 0.2,
              borderRadius: dia,
              backgroundColor: '#ffffff',
              opacity: 0.75,
              transform: [{ rotate: '-25deg' }],
            }}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  aoV: { position: 'absolute', top: 0, bottom: 0, opacity: 0.08 },
  trayEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  ballCell: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
});
