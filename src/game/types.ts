export type Dir = 'up' | 'down' | 'left' | 'right';

export const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export const DELTA: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/** A maze level. Cells are indexed row-major: index = y * width + x. */
export interface Level {
  number: number;
  width: number;
  height: number;
  /** true = wall, false = floor (must be painted). */
  walls: boolean[];
  /** Starting cell index of the ball. */
  start: number;
  /** A known solution (the moves used to carve the maze). */
  solution: Dir[];
  /** Number of moves in the known solution; used for star rating. */
  par: number;
}

export interface GameState {
  pos: number;
  painted: boolean[];
  paintedCount: number;
  floorCount: number;
  moves: number;
}
