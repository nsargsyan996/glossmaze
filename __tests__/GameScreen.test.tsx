/// <reference types="jest" />
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyMove, createState } from '../src/game/engine';
import { generateLevel } from '../src/game/generator';
import { Dir } from '../src/game/types';
import { GameScreen } from '../src/screens/GameScreen';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderGame(level = 1) {
  const onComplete = jest.fn();
  const onNext = jest.fn();
  const onHome = jest.fn();
  await render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={metrics}>
        <GameScreen levelNumber={level} onComplete={onComplete} onNext={onNext} onHome={onHome} />
      </SafeAreaProvider>
    </GestureHandlerRootView>,
  );
  return { onComplete, onNext, onHome };
}

const OFFSET: Record<Dir, [number, number]> = { up: [0, -40], down: [0, 40], left: [-40, 0], right: [40, 0] };

/**
 * A real pan gesture: begin, activate, a stream of updates along a path, end.
 * `pauseMs` lets the ball roll between turns, the way a person steers; 0 turns instantly.
 */
async function drag(...dirs: Dir[]) {
  return dragPaced(0, ...dirs);
}

async function dragPaced(pauseMs: number, ...dirs: Dir[]) {
  const pan = createGestureController(getByGestureTestId('board-pan'));
  let x = 0;
  let y = 0;
  await act(async () => {
    pan.begin({ translationX: 0, translationY: 0 });
    pan.activate({ translationX: 0, translationY: 0 });
  });
  for (const d of dirs) {
    const [dx, dy] = OFFSET[d];
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        x += dx / 10;
        y += dy / 10;
        pan.update({ translationX: x, translationY: y });
      }
      if (pauseMs) jest.advanceTimersByTime(pauseMs);
    });
  }
  await act(async () => {
    pan.end({ translationX: x, translationY: y, velocityX: 0, velocityY: 0 });
  });
}

/** Let the ball finish rolling (queued moves run as each roll ends). */
async function settle(ms = 3000) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('level 1 starts with no moves and full stars', async () => {
  await renderGame();
  expect(screen.getByText('Level 1')).toBeTruthy();
  expect(screen.getByText('0 moves')).toBeTruthy();
  expect(screen.getByText(`Finish in ${generateLevel(1).par} for 3 stars`)).toBeTruthy();
});

const LEVEL_1 = generateLevel(1);
const FIRST_MOVES = LEVEL_1.solution;
// A direction the ball can't move in at the start of level 1 (into a wall or the edge).
const BLOCKED = (['up', 'down', 'left', 'right'] as Dir[]).find((d) => !applyMove(LEVEL_1, createState(LEVEL_1), d))!;

test('a swipe moves the ball and counts a move', async () => {
  await renderGame();
  await drag(FIRST_MOVES[0]);
  await settle();
  expect(screen.getByText('1 move')).toBeTruthy();
});

test('a swipe into a wall does not count', async () => {
  await renderGame();
  await drag(BLOCKED);
  await settle();
  expect(screen.getByText('0 moves')).toBeTruthy();
});

test('undo takes back the last move, restart clears all', async () => {
  await renderGame();
  await drag(FIRST_MOVES[0]);
  await settle();
  await drag(FIRST_MOVES[1]);
  await settle();
  expect(screen.getByText('2 moves')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Undo move'));
  await settle(500);
  expect(screen.getByText('1 move')).toBeTruthy();

  await fireEvent.press(screen.getByLabelText('Restart level'));
  await settle(500);
  expect(screen.getByText('0 moves')).toBeTruthy();
});

test('solving the level in one continuous drag shows the win screen with 3 stars', async () => {
  const { onComplete, onNext } = await renderGame();
  const solution = generateLevel(1).solution;
  await dragPaced(400, ...solution);
  await settle();

  expect(screen.getByText('Painted!')).toBeTruthy();
  expect(screen.getByText(`Level 1 solved in ${solution.length} moves`)).toBeTruthy();
  expect(onComplete).toHaveBeenCalledWith(1, 3);

  await fireEvent.press(screen.getByLabelText('Next level'));
  expect(onNext).toHaveBeenCalled();
});

test('separate swipes made while the ball rolls are queued in order', async () => {
  const { onComplete } = await renderGame();
  // Several swipes arrive before the first roll ends; the buffer keeps up to 3 while the ball rolls.
  const solution = generateLevel(1).solution;
  for (const d of solution.slice(0, 4)) await drag(d);
  await settle();
  for (const d of solution.slice(4)) await drag(d);
  await settle();
  expect(onComplete).toHaveBeenCalledWith(1, 3);
});

test('the home button leaves the level', async () => {
  const { onHome } = await renderGame();
  await fireEvent.press(screen.getByLabelText('Home'));
  expect(onHome).toHaveBeenCalled();
});
