import { applyMove, createState, isComplete } from './engine';
import { solveOptimal } from './solver';
import { hashSeed, mulberry32, randInt } from './rng';
import { DELTA, DIRS, Dir, Level, OPPOSITE } from './types';

export interface Difficulty {
  width: number;
  height: number;
  targetMoves: number;
}

/** Difficulty curve: boards and move counts grow slowly, then plateau. */
export function difficultyFor(levelNumber: number): Difficulty {
  const n = Math.max(1, levelNumber) - 1;
  return {
    width: Math.min(5 + Math.floor(n / 10), 11),
    height: Math.min(7 + Math.floor(n / 6), 15),
    targetMoves: Math.min(4 + Math.floor(n * 0.5), 36),
  };
}

interface Candidate {
  dir: Dir;
  cells: number[];
  stopper: number; // cell that must stay a wall so the ball stops; -1 = board edge
  newCount: number;
  /** 2x2 fully-open squares this move would create (open rooms make dull levels). */
  blobs: number;
}

interface Carved {
  width: number;
  height: number;
  open: boolean[];
  start: number;
  solution: Dir[];
}

/**
 * Carves a maze by simulating the ball: starting from all walls, it picks a
 * direction and slide length, opens those cells, and locks the cell after the
 * end as a wall ("stopper") so that slide replays exactly the same way later.
 * Because every stopper stays a wall, the recorded moves are always a valid
 * solution that paints every floor cell.
 */
function carve(d: Difficulty, rng: () => number): Carved {
  const { width: w, height: h, targetMoves } = d;
  const open = new Array<boolean>(w * h).fill(false);
  const locked = new Array<boolean>(w * h).fill(false);
  const start = randInt(rng, 0, w * h - 1);
  open[start] = true;

  let pos = start;
  let last: Dir | null = null;
  const solution: Dir[] = [];
  let guard = 0;

  const isOpen = (x: number, y: number, extra: Set<number>) =>
    x >= 0 && y >= 0 && x < w && y < h && (open[y * w + x] || extra.has(y * w + x));
  const countBlobs = (cells: number[]) => {
    const extra = new Set(cells);
    const squares = new Set<number>();
    for (const c of cells) {
      if (open[c]) continue;
      const cx = c % w;
      const cy = Math.floor(c / w);
      for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
        const x = cx + ox;
        const y = cy + oy;
        if (isOpen(x, y, extra) && isOpen(x + 1, y, extra) && isOpen(x, y + 1, extra) && isOpen(x + 1, y + 1, extra)) {
          squares.add(y * w + x);
        }
      }
    }
    return squares.size;
  };

  while (solution.length < targetMoves && guard++ < targetMoves * 10) {
    const candidates: Candidate[] = [];
    for (const dir of DIRS) {
      if (last && dir === OPPOSITE[last] && rng() < 0.8) continue;
      const { dx, dy } = DELTA[dir];
      let x = pos % w;
      let y = Math.floor(pos / w);
      const cells: number[] = [];
      let newCount = 0;
      for (;;) {
        x += dx;
        y += dy;
        if (x < 0 || y < 0 || x >= w || y >= h) break;
        const idx = y * w + x;
        if (locked[idx]) break;
        cells.push(idx);
        if (!open[idx]) newCount++;
        const nx = x + dx;
        const ny = y + dy;
        const nextInBounds = nx >= 0 && ny >= 0 && nx < w && ny < h;
        const next = ny * w + nx;
        // The ball can only stop here if the next cell is (or can become) a wall.
        if (!nextInBounds || !open[next]) {
          const slice = cells.slice();
          candidates.push({ dir, cells: slice, stopper: nextInBounds ? next : -1, newCount, blobs: countBlobs(slice) });
        }
      }
    }

    const fresh = candidates.filter((c) => c.newCount > 0);
    const pool = fresh.length && rng() > 0.12 ? fresh : candidates;
    if (!pool.length) break;

    // Weighted pick: favour moves that open new cells, strongly avoid carving open rooms.
    const weights = pool.map((c) => (1 + c.newCount * (0.5 + rng())) * Math.pow(0.12, c.blobs));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    let pick = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pick = pool[i];
        break;
      }
    }

    for (const c of pick.cells) open[c] = true;
    if (pick.stopper >= 0) locked[pick.stopper] = true;
    pos = pick.cells[pick.cells.length - 1];
    last = pick.dir;
    solution.push(pick.dir);
  }

  return { width: w, height: h, open, start, solution };
}

/** Trim empty rows/columns around the maze so the board fills the screen. */
function crop(c: Carved): Carved {
  let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
  c.open.forEach((o, i) => {
    if (!o) return;
    const x = i % c.width;
    const y = Math.floor(i / c.width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const open = new Array<boolean>(w * h).fill(false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) open[y * w + x] = c.open[(y + minY) * c.width + (x + minX)];
  }
  const sx = (c.start % c.width) - minX;
  const sy = Math.floor(c.start / c.width) - minY;
  return { width: w, height: h, open, start: sy * w + sx, solution: c.solution };
}

function toLevel(levelNumber: number, c: Carved): Level {
  return {
    number: levelNumber,
    width: c.width,
    height: c.height,
    walls: c.open.map((o) => !o),
    start: c.start,
    solution: c.solution,
    par: c.solution.length,
  };
}

export function verifySolution(level: Level, moves: Dir[] = level.solution): boolean {
  let state = createState(level);
  for (const m of moves) {
    const res = applyMove(level, state, m);
    if (!res) return false;
    state = res.state;
  }
  return isComplete(state);
}

function score(level: Level, d: Difficulty): number {
  const floor = level.walls.filter((w) => !w).length;
  const fill = floor / (level.width * level.height);
  const sizeFit = (level.width * level.height) / (d.width * d.height);
  const moveFit = Math.min(1, level.par / d.targetMoves);
  // Prefer boards that use the available area, with walls inside (not just an open block).
  const interiorWalls = fill < 0.85 ? 1 : 0.3;
  let blobs = 0;
  for (let y = 0; y + 1 < level.height; y++) {
    for (let x = 0; x + 1 < level.width; x++) {
      const i = y * level.width + x;
      if (!level.walls[i] && !level.walls[i + 1] && !level.walls[i + level.width] && !level.walls[i + level.width + 1]) blobs++;
    }
  }
  const corridors = 1 - Math.min(1, (blobs * 4) / Math.max(1, floor));
  return moveFit * 2 + sizeFit + interiorWalls + corridors;
}

const cache = new Map<number, Level>();

/** Deterministic: the same level number always produces the same maze. */
export function generateLevel(levelNumber: number): Level {
  const cached = cache.get(levelNumber);
  if (cached) return cached;

  const d = difficultyFor(levelNumber);
  let best: Level | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 24; attempt++) {
    const rng = mulberry32(hashSeed(0x5eed, levelNumber, attempt));
    const level = toLevel(levelNumber, crop(carve(d, rng)));
    if (level.width < 3 || level.height < 3 || level.par < 2) continue;
    if (!verifySolution(level)) continue;
    const s = score(level, d);
    if (s > bestScore) {
      best = level;
      bestScore = s;
    }
    if (s >= 4.4) break;
  }

  if (!best) throw new Error(`Could not generate level ${levelNumber}`);
  // Tighten par to the true minimum when it's cheap to find; otherwise keep the carved route.
  const optimal = solveOptimal(best);
  if (optimal && optimal.length < best.par) best = { ...best, solution: optimal, par: optimal.length };
  cache.set(levelNumber, best);
  return best;
}
