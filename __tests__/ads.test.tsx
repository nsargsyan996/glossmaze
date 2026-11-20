/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createGestureController, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import App from '../App';
import { generateLevel } from '../src/game/generator';
import { Dir } from '../src/game/types';

jest.mock('../src/ads', () => ({
  initAds: jest.fn(async () => {}),
  onLevelFinished: jest.fn(() => false),
  privacyOptionsRequired: jest.fn(() => false),
  showPrivacyOptions: jest.fn(async () => {}),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ads = require('../src/ads') as { initAds: jest.Mock; onLevelFinished: jest.Mock };

const OFFSET: Record<Dir, [number, number]> = { up: [0, -40], down: [0, 40], left: [-40, 0], right: [40, 0] };

async function solve(level: number) {
  const pan = createGestureController(getByGestureTestId('board-pan'));
  let x = 0;
  let y = 0;
  await act(async () => {
    pan.begin({ translationX: 0, translationY: 0 });
    pan.activate({ translationX: 0, translationY: 0 });
    for (const d of generateLevel(level).solution) {
      for (let i = 0; i < 10; i++) {
        x += OFFSET[d][0] / 10;
        y += OFFSET[d][1] / 10;
        pan.update({ translationX: x, translationY: y });
      }
    }
    pan.end({ translationX: x, translationY: y, velocityX: 0, velocityY: 0 });
  });
  await waitFor(() => expect(screen.getByText('Painted!')).toBeTruthy(), { timeout: 8000 });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('ads start once when the app opens', async () => {
  await render(<App />);
  await screen.findByText('Play');
  expect(ads.initAds).toHaveBeenCalledTimes(1);
});

test('the ad check happens only when the player taps Next level, never mid-level', async () => {
  await render(<App />);
  await fireEvent.press(await screen.findByText('Play'));
  await solve(1);
  // Winning alone doesn't trigger an ad; the player is still looking at the win screen.
  expect(ads.onLevelFinished).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByLabelText('Next level'));
  expect(ads.onLevelFinished).toHaveBeenCalledTimes(1);
  expect(ads.onLevelFinished).toHaveBeenCalledWith(1);
  expect(await screen.findByText('Level 2')).toBeTruthy();
});

test('going Home from a level never triggers an ad', async () => {
  await render(<App />);
  await fireEvent.press(await screen.findByText('Play'));
  await fireEvent.press(screen.getByLabelText('Home'));
  expect(ads.onLevelFinished).not.toHaveBeenCalled();
});
