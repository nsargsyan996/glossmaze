import { Dir } from './types';

/** Distance (px) a drag must travel in a new direction to count as a move. */
export const SWIPE_DISTANCE = 22;
/** Below this, a released flick is ignored (taps, jitter). */
export const FLICK_DISTANCE = 14;
/** Most swipes kept while the ball is still rolling. */
export const MAX_QUEUED_MOVES = 3;

export function dominantDir(dx: number, dy: number): Dir {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

/**
 * Steering for one continuous drag. Each time the finger travels SWIPE_DISTANCE
 * in a new direction (measured from where it last turned), that direction fires.
 * Continuing in the same direction does not fire again.
 */
export interface DragTracker {
  anchorX: number;
  anchorY: number;
  lastDir: Dir | null;
}

export function startDrag(): DragTracker {
  return { anchorX: 0, anchorY: 0, lastDir: null };
}

/** Feed the drag's total translation; returns the updated tracker and a move to make, if any. */
export function updateDrag(
  t: DragTracker,
  translationX: number,
  translationY: number,
  threshold = SWIPE_DISTANCE,
): { tracker: DragTracker; dir: Dir | null } {
  const dx = translationX - t.anchorX;
  const dy = translationY - t.anchorY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return { tracker: t, dir: null };
  const dir = dominantDir(dx, dy);
  // Re-anchor either way, so drift along the current direction doesn't count toward a turn.
  const tracker = { anchorX: translationX, anchorY: translationY, lastDir: dir };
  return { tracker, dir: dir === t.lastDir ? null : dir };
}

/** A short, quick flick released before reaching SWIPE_DISTANCE. */
export function flickDir(translationX: number, translationY: number, velocityX: number, velocityY: number): Dir | null {
  const ax = Math.abs(translationX) + Math.abs(velocityX) * 0.05;
  const ay = Math.abs(translationY) + Math.abs(velocityY) * 0.05;
  if (Math.max(ax, ay) < FLICK_DISTANCE) return null;
  return ax > ay ? (translationX > 0 ? 'right' : 'left') : translationY > 0 ? 'down' : 'up';
}

/** Keeps swipes made while the ball rolls, in order, up to a limit. */
export function enqueue(queue: Dir[], dir: Dir, max = MAX_QUEUED_MOVES): Dir[] {
  return queue.length < max ? [...queue, dir] : queue;
}
