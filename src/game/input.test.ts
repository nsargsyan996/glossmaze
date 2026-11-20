/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enqueue, flickDir, MAX_QUEUED_MOVES, startDrag, SWIPE_DISTANCE, updateDrag } from './input';
import { Dir } from './types';

/** Feed a drag path (list of total-translation points) and collect the moves it fires. */
function steer(points: [number, number][]): Dir[] {
  let t = startDrag();
  const out: Dir[] = [];
  for (const [x, y] of points) {
    const r = updateDrag(t, x, y);
    t = r.tracker;
    if (r.dir) out.push(r.dir);
  }
  return out;
}

/** Points along a polyline, every 4px, like a real pointer stream. */
function path(...corners: [number, number][]): [number, number][] {
  const pts: [number, number][] = [];
  let [x, y] = [0, 0];
  for (const [cx, cy] of corners) {
    const steps = Math.max(1, Math.round(Math.hypot(cx - x, cy - y) / 4));
    const [sx, sy] = [(cx - x) / steps, (cy - y) / steps];
    for (let i = 0; i < steps; i++) {
      x += sx;
      y += sy;
      pts.push([x, y]);
    }
  }
  return pts;
}

test('a drag below the threshold does nothing', () => {
  assert.deepEqual(steer(path([SWIPE_DISTANCE - 2, 0])), []);
});

test('a single swipe fires once, even if the finger keeps going', () => {
  assert.deepEqual(steer(path([0, -200])), ['up']);
});

test('one continuous drag can turn: up then left (the reported bug)', () => {
  assert.deepEqual(steer(path([0, -40], [-40, -40])), ['up', 'left']);
});

test('a full level-1 route in one drag: up, left, up, right', () => {
  assert.deepEqual(steer(path([0, -40], [-40, -40], [-40, -80], [0, -80])), ['up', 'left', 'up', 'right']);
});

test('reversing direction mid-drag fires the reverse', () => {
  assert.deepEqual(steer(path([60, 0], [0, 0])), ['right', 'left']);
});

test('sideways wobble while swiping does not trigger a turn', () => {
  // Mostly down, drifting a few pixels left/right.
  const wobble: [number, number][] = Array.from({ length: 40 }, (_, i) => [Math.sin(i) * 6, i * 5]);
  assert.deepEqual(steer(wobble), ['down']);
});

test('diagonal drags pick the dominant axis', () => {
  assert.deepEqual(steer(path([30, 10])), ['right']);
  assert.deepEqual(steer(path([-8, -30])), ['up']);
});

test('quick flicks count when released early; taps do not', () => {
  assert.equal(flickDir(10, 0, 900, 0), 'right');
  assert.equal(flickDir(0, -6, 0, -600), 'up');
  assert.equal(flickDir(3, 2, 10, 5), null);
});

test('queue keeps swipes in order and caps them', () => {
  let q: Dir[] = [];
  for (const d of ['up', 'left', 'down', 'right', 'up'] as Dir[]) q = enqueue(q, d);
  assert.equal(q.length, MAX_QUEUED_MOVES);
  assert.deepEqual(q, ['up', 'left', 'down']);
});
