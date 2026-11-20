/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AD_RULES, AdPacing, afterLevel, START_PACING } from './policy';

const MIN = 60 * 1000;

/** Play through levels, a fixed number of minutes each; returns the levels after which an ad showed. */
function session(fromLevel: number, count: number, minutesPerLevel: number, adReady = true): number[] {
  let pacing: AdPacing = START_PACING;
  let now = 1_000_000;
  const shown: number[] = [];
  for (let level = fromLevel; level < fromLevel + count; level++) {
    now += minutesPerLevel * MIN;
    const r = afterLevel(pacing, level, now, adReady);
    pacing = r.pacing;
    if (r.show) shown.push(level);
  }
  return shown;
}

test('no ads during the first levels', () => {
  assert.deepEqual(session(1, AD_RULES.FIRST_AD_AFTER_LEVEL - 1, 5), []);
});

test('at most one ad every 3 levels for a slow player', () => {
  // 2 minutes per level: the 3-level rule is what limits.
  const shown = session(10, 12, 2);
  assert.deepEqual(shown, [12, 15, 18, 21]);
});

test('fast players are limited by time, not levels', () => {
  // 20 seconds per level: 3 levels pass in 1 minute, but ads stay 3+ minutes apart.
  const shown = session(10, 30, 1 / 3);
  assert.ok(shown.length > 0);
  for (let i = 1; i < shown.length; i++) {
    const levelsApart = shown[i] - shown[i - 1];
    assert.ok(levelsApart * (1 / 3) * MIN >= AD_RULES.MIN_GAP_MS, `ads after ${shown[i - 1]} and ${shown[i]} too close`);
  }
});

test('a returning player gets a few levels before the first ad of the session', () => {
  const shown = session(40, 5, 3);
  assert.equal(shown[0], 42); // third level of the session
});

test('never waits for an ad that has not loaded', () => {
  assert.deepEqual(session(10, 20, 5, false), []);
});

test('a skipped (not loaded) ad does not reset the count', () => {
  let p: AdPacing = START_PACING;
  p = afterLevel(p, 10, 0, true).pacing;
  p = afterLevel(p, 11, 0, true).pacing;
  const notReady = afterLevel(p, 12, 0, false);
  assert.equal(notReady.show, false);
  // Next level, ad ready: shows right away instead of waiting another 3 levels.
  assert.equal(afterLevel(notReady.pacing, 13, 0, true).show, true);
});
