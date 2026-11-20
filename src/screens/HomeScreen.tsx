import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ball, Board, boardSize, MS_PER_CELL } from '../components/Board';
import { Backdrop, CandyButton, ChunkyText } from '../components/ui';
import { applyMove, createState } from '../game/engine';
import { generateLevel } from '../game/generator';
import { GameState } from '../game/types';
import { privacyOptionsRequired, showPrivacyOptions } from '../ads';
import { Progress } from '../storage';
import { darken, FONTS, Theme, themeForLevel } from '../theme';

interface Props {
  progress: Progress;
  onPlay: (level: number) => void;
}

export function HomeScreen({ progress, onPlay }: Props) {
  const theme = themeForLevel(progress.level);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const [area, setArea] = useState({ w: 0, h: 0 });
  const recent = Array.from({ length: Math.min(progress.level - 1, 4) }, (_, i) => progress.level - 1 - i).reverse();

  return (
    <Backdrop theme={theme} style={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24, alignItems: 'center' }}>
      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
        <ChunkyText size={compact ? 54 : 72} color={theme.ink} shadow={theme.wallTop} style={{ textAlign: 'center' }}>
          Gloss{'\n'}Maze
        </ChunkyText>
        <Text style={[styles.tagline, { color: theme.ink }]}>Swipe the ball. Paint every tile.</Text>
      </Animated.View>

      <View style={styles.demo} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {area.h > 0 && <DemoBoard theme={theme} maxW={area.w * 0.8} maxH={area.h - 24} />}
      </View>

      <Animated.View entering={FadeIn.delay(250)} style={{ alignItems: 'center', gap: compact ? 14 : 22 }}>
        <CandyButton
          label="Play"
          sublabel={`Level ${progress.level}`}
          size="lg"
          onPress={() => onPlay(progress.level)}
          face={theme.paint}
          base={darken(theme.paint, 0.35)}
          ink="#ffffff"
        />
        {recent.length > 0 && (
          <View style={styles.recentRow}>
            {recent.map((n) => (
              <Pressable
                key={n}
                onPress={() => onPlay(n)}
                accessibilityLabel={`Replay level ${n}`}
                style={({ pressed }) => [styles.chip, { backgroundColor: theme.wallTop, borderColor: theme.wallSide, transform: [{ translateY: pressed ? 2 : 0 }] }]}
              >
                <Text style={[styles.chipNum, { color: theme.ink }]}>{n}</Text>
                <View style={{ flexDirection: 'row' }}>
                  {[0, 1, 2].map((i) => (
                    <Ionicons key={i} name="star" size={10} color={i < (progress.stars[n] ?? 0) ? theme.paint : theme.wallSide} />
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {privacyOptionsRequired() && (
          <Pressable onPress={showPrivacyOptions} accessibilityRole="button" hitSlop={10}>
            <Text style={[styles.privacy, { color: theme.ink }]}>Privacy settings</Text>
          </Pressable>
        )}
      </Animated.View>
    </Backdrop>
  );
}

/** A small level that solves itself on a loop, so the rules explain themselves. */
function DemoBoard({ theme, maxW, maxH }: { theme: Theme; maxW: number; maxH: number }) {
  const level = useMemo(() => generateLevel(2), []);
  const [state, setState] = useState<GameState>(() => createState(level));
  const [delays, setDelays] = useState<number[]>(() => level.walls.map(() => 0));
  const [duration, setDuration] = useState(0);
  const step = useRef(0);

  useEffect(() => {
    let current = createState(level);
    const tick = () => {
      if (step.current >= level.solution.length) {
        step.current = 0;
        current = createState(level);
        setDelays(level.walls.map(() => 0));
        setDuration(0);
        setState(current);
        return;
      }
      const res = applyMove(level, current, level.solution[step.current++]);
      if (!res) return;
      current = res.state;
      setDelays((prev) => {
        const next = prev.slice();
        res.path.forEach((c, i) => (next[c] = (i + 1) * MS_PER_CELL * 1.6));
        return next;
      });
      setDuration(res.path.length * MS_PER_CELL * 1.6);
      setState(current);
    };
    const id = setInterval(tick, 750);
    return () => clearInterval(id);
  }, [level]);

  const unit = boardSize(level, 1);
  const cell = Math.floor(Math.min(maxW / unit.width, maxH / (unit.height), 40));
  if (cell < 12) return null;
  return (
    <Board level={level} painted={state.painted} delays={delays} cellSize={cell} theme={theme}>
      <Ball pos={state.pos} width={level.width} size={cell} duration={duration} theme={theme} />
    </Board>
  );
}

const styles = StyleSheet.create({
  tagline: { fontFamily: FONTS.ui, fontSize: 17, opacity: 0.7, marginTop: 6 },
  demo: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  recentRow: { flexDirection: 'row', gap: 10 },
  chip: { width: 56, height: 56, borderRadius: 16, borderWidth: 3, borderBottomWidth: 6, alignItems: 'center', justifyContent: 'center' },
  privacy: { fontFamily: FONTS.ui, fontSize: 13, opacity: 0.55, textDecorationLine: 'underline' },
  chipNum: { fontFamily: FONTS.display, fontSize: 18 },
});
