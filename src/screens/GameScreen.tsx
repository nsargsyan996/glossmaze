import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ball, Board, boardSize, MS_PER_CELL } from '../components/Board';
import { Confetti } from '../components/Confetti';
import { Backdrop, CandyButton, ChunkyText } from '../components/ui';
import { applyMove, createState, isComplete, starsFor } from '../game/engine';
import { generateLevel } from '../game/generator';
import { enqueue, flickDir, startDrag, updateDrag } from '../game/input';
import { Dir, GameState } from '../game/types';
import { bump, success } from '../haptics';
import { darken, FONTS, Theme, themeForLevel } from '../theme';

interface Props {
  levelNumber: number;
  onComplete: (level: number, stars: number) => void;
  onNext: () => void;
  onHome: () => void;
}

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};

export function GameScreen({ levelNumber, onComplete, onNext, onHome }: Props) {
  const level = useMemo(() => generateLevel(levelNumber), [levelNumber]);
  const theme = themeForLevel(levelNumber);
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const [state, setState] = useState<GameState>(() => createState(level));
  const [delays, setDelays] = useState<number[]>(() => level.walls.map(() => 0));
  const [duration, setDuration] = useState(0);
  const [won, setWon] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const history = useRef<GameState[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const wonRef = useRef(false);
  // Input buffering: a swipe made while the ball is still rolling runs when it stops.
  const busyUntil = useRef(0);
  const queue = useRef<Dir[]>([]);
  const draining = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Warm up the next level in the background so "Next level" opens instantly.
  useEffect(() => {
    const t = setTimeout(() => generateLevel(levelNumber + 1), 800);
    return () => clearTimeout(t);
  }, [levelNumber]);

  const reset = useCallback(() => {
    queue.current = [];
    busyUntil.current = 0;
    history.current = [];
    setCanUndo(false);
    setDelays(level.walls.map(() => 0));
    setDuration(0);
    const s = createState(level);
    stateRef.current = s;
    setState(s);
  }, [level]);

  useEffect(() => {
    reset();
    setWon(false);
    wonRef.current = false;
  }, [reset]);

  // Run queued moves one at a time, each as soon as the previous roll ends.
  const scheduleDrain = () => {
    if (draining.current) return;
    draining.current = true;
    later(() => {
      draining.current = false;
      while (queue.current.length) {
        const next = queue.current.shift()!;
        if (moveRef.current(next, true)) break; // rolling again: wait for it
      }
      if (queue.current.length) scheduleDrain();
    }, Math.max(0, busyUntil.current - Date.now()));
  };

  /** Returns true if the ball started rolling. */
  const move = useCallback(
    (dir: Dir, fromQueue = false): boolean => {
      if (wonRef.current) return false;
      if (!fromQueue && (busyUntil.current > Date.now() || queue.current.length)) {
        // Ball still rolling: keep the swipe (in order, up to 3) for when it stops.
        queue.current = enqueue(queue.current, dir);
        scheduleDrain();
        return false;
      }
      const res = applyMove(level, stateRef.current, dir);
      if (!res) return false;
      history.current.push(stateRef.current);
      setCanUndo(true);
      const d = Math.max(110, res.path.length * MS_PER_CELL);
      busyUntil.current = Date.now() + d;
      setDelays((prev) => {
        const next = prev.slice();
        res.path.forEach((c, i) => (next[c] = (i + 1) * MS_PER_CELL));
        return next;
      });
      setDuration(d);
      setState(res.state);
      stateRef.current = res.state;

      if (isComplete(res.state)) {
        wonRef.current = true;
        const stars = starsFor(res.state.moves, level.par);
        later(() => {
          success();
          setWon(true);
          onComplete(levelNumber, stars);
        }, d + 300);
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, levelNumber, onComplete],
  );
  const moveRef = useRef(move);
  moveRef.current = move;

  const undo = () => {
    if (wonRef.current) return;
    const prev = history.current.pop();
    if (!prev) return;
    queue.current = [];
    busyUntil.current = 0;
    setCanUndo(history.current.length > 0);
    setDelays(level.walls.map(() => 0));
    setDuration(140);
    stateRef.current = prev;
    setState(prev);
  };

  const restart = () => {
    if (!wonRef.current) reset();
  };

  const replay = () => {
    wonRef.current = false;
    setWon(false);
    reset();
  };

  // One drag can steer several moves without lifting the finger (see game/input.ts).
  const drag = useRef(startDrag());
  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 8,
    testID: 'board-pan',
    onBegin: () => {
      drag.current = startDrag();
    },
    onUpdate: (e) => {
      const { tracker, dir } = updateDrag(drag.current, e.translationX, e.translationY);
      drag.current = tracker;
      if (dir) move(dir);
    },
    onDeactivate: (e) => {
      if (drag.current.lastDir) return;
      const dir = flickDir(e.translationX, e.translationY, e.velocityX, e.velocityY);
      if (dir) move(dir);
    },
  });

  // Keyboard controls for web / simulator testing.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      } else if (e.key === 'r') restart();
      else if (e.key === 'z') undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Fit the board (with its wall ring and block height) into the space between header and footer.
  const chrome = 250;
  const availW = screenW - 32;
  const availH = screenH - insets.top - insets.bottom - chrome;
  const unit = boardSize(level, 1);
  const cellSize = Math.floor(Math.min(availW / unit.width, availH / (unit.height), 58));
  const progress = state.paintedCount / state.floorCount;
  const liveStars = starsFor(state.moves, level.par);
  const btn = { face: theme.wallTop, base: theme.wallSide, ink: theme.ink };

  return (
    <GestureDetector gesture={pan}>
      <Backdrop theme={theme} style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14, paddingHorizontal: 18 }}>
        <View style={styles.header}>
          <CandyButton icon="home" accessibilityLabel="Home" onPress={onHome} {...btn} />
          <View style={{ alignItems: 'center' }}>
            <ChunkyText size={34} color={theme.ink} shadow={theme.wallTop}>
              Level {levelNumber}
            </ChunkyText>
            <StarMeter stars={liveStars} theme={theme} />
          </View>
          <CandyButton icon="refresh" accessibilityLabel="Restart level" onPress={restart} {...btn} />
        </View>

        <PaintTube progress={progress} theme={theme} />

        <View style={styles.boardArea}>
          <Board level={level} painted={state.painted} delays={delays} cellSize={cellSize} theme={theme}>
            <Ball pos={state.pos} width={level.width} size={cellSize} duration={duration} theme={theme} onStop={bump} />
          </Board>
        </View>

        <View style={styles.footer}>
          <CandyButton icon="arrow-undo" accessibilityLabel="Undo move" onPress={undo} disabled={!canUndo} {...btn} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.moves, { color: theme.ink }]}>
              {state.moves} {state.moves === 1 ? 'move' : 'moves'}
            </Text>
            <Text style={[styles.par, { color: theme.ink }]}>Finish in {level.par} for 3 stars</Text>
          </View>
          <View style={{ width: 52 }} />
        </View>

        {won && (
          <WinOverlay
            theme={theme}
            levelNumber={levelNumber}
            moves={state.moves}
            stars={starsFor(state.moves, level.par)}
            onNext={onNext}
            onReplay={replay}
          />
        )}
      </Backdrop>
    </GestureDetector>
  );
}

function StarMeter({ stars, theme }: { stars: number; theme: Theme }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginTop: 2 }} accessibilityLabel={`${stars} stars if you finish now`}>
      {[0, 1, 2].map((i) => (
        <Ionicons key={i} name="star" size={16} color={i < stars ? theme.paint : theme.wallSide} />
      ))}
    </View>
  );
}

function PaintTube({ progress, theme }: { progress: number; theme: Theme }) {
  const p = useSharedValue(progress);
  useEffect(() => {
    p.value = withSpring(progress, { damping: 18, stiffness: 140 });
  }, [progress, p]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0.06, p.value) * 100}%` }));
  return (
    <View style={[styles.tube, { backgroundColor: theme.wallSide, borderColor: theme.wallTop }]}>
      <Animated.View style={[styles.tubeFill, { backgroundColor: theme.paint }, fill]}>
        <View style={[styles.tubeShine, { backgroundColor: theme.paintHi }]} />
      </Animated.View>
    </View>
  );
}

function WinOverlay({
  theme, levelNumber, moves, stars, onNext, onReplay,
}: { theme: Theme; levelNumber: number; moves: number; stars: number; onNext: () => void; onReplay: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.overlay, { backgroundColor: theme.bgTop + 'ee' }]}>
      <Confetti colors={[theme.paint, theme.paintHi, theme.wallSide, theme.ink]} />
      <Animated.View entering={ZoomIn.springify().damping(11)} style={{ alignItems: 'center' }}>
        <ChunkyText size={58} color={theme.paint} shadow={darken(theme.paint, 0.35)}>
          Painted!
        </ChunkyText>
        <Text style={[styles.winSub, { color: theme.ink }]}>
          Level {levelNumber} solved in {moves} moves
        </Text>
      </Animated.View>

      <View style={styles.bigStars}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            entering={ZoomIn.delay(350 + i * 180).springify().damping(9)}
            style={{ transform: [{ translateY: i === 1 ? -14 : 0 }] }}
          >
            <Ionicons name="star" size={i === 1 ? 72 : 58} color={i < stars ? theme.paint : theme.wallSide} />
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeIn.delay(900)} style={styles.winButtons}>
        <CandyButton icon="refresh" accessibilityLabel="Replay level" onPress={onReplay} face={theme.wallTop} base={theme.wallSide} ink={theme.ink} />
        <CandyButton label="Next level" size="lg" onPress={onNext} face={theme.paint} base={darken(theme.paint, 0.35)} ink="#ffffff" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tube: { height: 18, borderRadius: 9, borderWidth: 3, overflow: 'hidden', marginTop: 14, marginHorizontal: 8 },
  tubeFill: { height: '100%', borderRadius: 9 },
  tubeShine: { position: 'absolute', top: 2, left: 6, right: 6, height: 3, borderRadius: 2, opacity: 0.8 },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moves: { fontFamily: FONTS.uiBold, fontSize: 20 },
  par: { fontFamily: FONTS.ui, fontSize: 13, opacity: 0.65 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24 },
  winSub: { fontFamily: FONTS.ui, fontSize: 17, opacity: 0.75, marginTop: 4 },
  bigStars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 28, marginBottom: 40 },
  winButtons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
