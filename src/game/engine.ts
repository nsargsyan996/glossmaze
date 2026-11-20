import { DELTA, Dir, GameState, Level } from './types';

export function isFloor(level: Pick<Level, 'width' | 'height' | 'walls'>, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
  return !level.walls[y * level.width + x];
}

export interface SlideResult {
  /** Cells entered during the slide, in order (start cell excluded). */
  path: number[];
  /** Final cell index (equals start when the ball can't move). */
  end: number;
}

/** The ball keeps rolling in `dir` until the next cell is a wall or the board edge. */
export function slide(level: Pick<Level, 'width' | 'height' | 'walls'>, from: number, dir: Dir): SlideResult {
  const { dx, dy } = DELTA[dir];
  let x = from % level.width;
  let y = Math.floor(from / level.width);
  const path: number[] = [];
  while (isFloor(level, x + dx, y + dy)) {
    x += dx;
    y += dy;
    path.push(y * level.width + x);
  }
  return { path, end: path.length ? path[path.length - 1] : from };
}

export function createState(level: Level): GameState {
  const painted = level.walls.map(() => false);
  painted[level.start] = true;
  const floorCount = level.walls.filter((w) => !w).length;
  return { pos: level.start, painted, paintedCount: 1, floorCount, moves: 0 };
}

export interface MoveResult {
  state: GameState;
  path: number[];
  /** Cells that were painted for the first time by this move. */
  newlyPainted: number[];
}

/** Returns null when the ball can't move in that direction. */
export function applyMove(level: Level, state: GameState, dir: Dir): MoveResult | null {
  const { path, end } = slide(level, state.pos, dir);
  if (path.length === 0) return null;
  const painted = state.painted.slice();
  const newlyPainted: number[] = [];
  for (const c of path) {
    if (!painted[c]) {
      painted[c] = true;
      newlyPainted.push(c);
    }
  }
  return {
    state: {
      ...state,
      pos: end,
      painted,
      paintedCount: state.paintedCount + newlyPainted.length,
      moves: state.moves + 1,
    },
    path,
    newlyPainted,
  };
}

export function isComplete(state: GameState): boolean {
  return state.paintedCount >= state.floorCount;
}

export function starsFor(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.5)) return 2;
  return 1;
}
