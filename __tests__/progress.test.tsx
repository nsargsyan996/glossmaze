/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createGestureController, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import App from '../App';
import { generateLevel } from '../src/game/generator';
import { Dir } from '../src/game/types';
import { DEFAULT_PROGRESS, loadProgress, saveProgress } from '../src/storage';

const KEY = 'glossmaze.progress.v1';
const OFFSET: Record<Dir, [number, number]> = { up: [0, -40], down: [0, 40], left: [-40, 0], right: [40, 0] };

async function drag(dirs: Dir[]) {
  const pan = createGestureController(getByGestureTestId('board-pan'));
  let x = 0;
  let y = 0;
  await act(async () => {
    pan.begin({ translationX: 0, translationY: 0 });
    pan.activate({ translationX: 0, translationY: 0 });
    for (const d of dirs) {
      for (let i = 0; i < 10; i++) {
        x += OFFSET[d][0] / 10;
        y += OFFSET[d][1] / 10;
        pan.update({ translationX: x, translationY: y });
      }
    }
    pan.end({ translationX: x, translationY: y, velocityX: 0, velocityY: 0 });
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('progress round-trips through storage', async () => {
  await saveProgress({ level: 7, stars: { 6: 3 }, coins: 30 });
  expect(await loadProgress()).toEqual({ level: 7, stars: { 6: 3 }, coins: 30 });
});

test('missing or corrupt saves fall back to a fresh start', async () => {
  expect(await loadProgress()).toEqual(DEFAULT_PROGRESS);
  await AsyncStorage.setItem(KEY, '{not json');
  expect(await loadProgress()).toEqual(DEFAULT_PROGRESS);
});

test('finishing level 1 in the app saves progress and unlocks level 2', async () => {
  // Real timers: the app's home-screen demo and animations run as they would on a device.
  await render(<App />);
  await fireEvent.press(await screen.findByText('Play'));
  await drag(generateLevel(1).solution);
  await waitFor(() => expect(screen.getByText('Painted!')).toBeTruthy(), { timeout: 5000 });

  const saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}');
  expect(saved.level).toBe(2);
  expect(saved.stars['1']).toBe(3);

  // Back on the home screen, Play now offers level 2.
  await fireEvent.press(screen.getByLabelText('Next level'));
  await fireEvent.press(screen.getByLabelText('Home'));
  expect(await screen.findByText('Level 2')).toBeTruthy();
});

test('a returning player continues from their saved level', async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify({ level: 12, stars: { 11: 2 }, coins: 0 }));
  await render(<App />);
  expect(await screen.findByText('Level 12')).toBeTruthy();
});
