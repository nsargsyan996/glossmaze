/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyMove, createState, isComplete, slide } from './engine';
import { generateLevel, verifySolution } from './generator';
import { Level } from './types';

function fromAscii(rows: string[]): Level {
  const height = rows.length;
  const width = rows[0].length;
  const walls: boolean[] = [];
  let start = 0;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      walls.push(ch === '#');
      if (ch === 'S') start = y * width + x;
    }),
  );
  return { number: 0, width, height, walls, start, solution: [], par: 1 };
}

test('ball slides until it hits a wall', () => {
  const level = fromAscii(['S...#', '##.##', '##...']);
  const r = slide(level, level.start, 'right');
  assert.equal(r.end, 3);
  assert.deepEqual(r.path, [1, 2, 3]);
});

test('ball stops at the board edge', () => {
  const level = fromAscii(['S....']);
  assert.equal(slide(level, 0, 'right').end, 4);
});

test('a blocked move returns null and does not count', () => {
  const level = fromAscii(['S..']);
  assert.equal(applyMove(level, createState(level), 'up'), null);
});

test('painting a hand-made level to completion', () => {
  const level = fromAscii(['S..', '#.#', '...']);
  let s = createState(level);
  for (const d of ['right', 'left'] as const) s = applyMove(level, s, d)!.state;
  assert.equal(isComplete(s), false);
  // From (0,0) the ball can't reach the middle column; restart via a different route
  s = createState(level);
  assert.equal(applyMove(level, s, 'down'), null);
  s = applyMove(level, s, 'right')!.state; // (2,0)
  assert.equal(s.paintedCount, 3);
  assert.equal(s.moves, 1);
});

test('generated levels 1..200 are solvable and generate quickly', () => {
  const t0 = Date.now();
  for (let n = 1; n <= 200; n++) {
    const a = generateLevel(n);
    assert.ok(verifySolution(a), `level ${n} not solvable`);
    assert.ok(a.width >= 3 && a.height >= 3, `level ${n} too small`);
  }
  const perLevel = (Date.now() - t0) / 200;
  assert.ok(perLevel < 120, `generation too slow: ${perLevel}ms/level`);
});

test('levels get long quickly after the tutorial', () => {
  const avgPar = (from: number, to: number) => {
    let sum = 0;
    for (let n = from; n <= to; n++) sum += generateLevel(n).par;
    return sum / (to - from + 1);
  };
  assert.ok(avgPar(1, 3) <= 8, 'tutorial levels should stay short');
  assert.ok(avgPar(10, 20) >= 13, `levels 10-20 too short: ${avgPar(10, 20)}`);
  assert.ok(avgPar(30, 50) >= 22, `levels 30-50 too short: ${avgPar(30, 50)}`);
});

test('levels need some planning: casual swiping fails often after the tutorial', async () => {
  const { casualSolveRate } = await import('./generator');
  let sum = 0;
  for (let n = 15; n <= 40; n++) sum += casualSolveRate(generateLevel(n));
  const avg = sum / 26;
  assert.ok(avg < 0.6, `levels 15-40 solve themselves too often: ${(avg * 100).toFixed(0)}%`);
});

test('levels 10000+ also generate', () => {
  for (const n of [1000, 5000, 18435]) assert.ok(verifySolution(generateLevel(n)));
});

test('par is never above the stored solution, and the solver finds valid routes', async () => {
  const { solveOptimal } = await import('./solver');
  for (let n = 1; n <= 40; n++) {
    const l = generateLevel(n);
    assert.equal(l.par, l.solution.length);
    assert.ok(verifySolution(l), `level ${n} solution invalid`);
    const opt = solveOptimal(l);
    if (opt) assert.ok(opt.length <= l.par && verifySolution(l, opt));
  }
});

test('generated levels avoid big open rooms', () => {
  for (let n = 30; n <= 80; n += 10) {
    const l = generateLevel(n);
    let squares = 0;
    for (let y = 0; y + 1 < l.height; y++)
      for (let x = 0; x + 1 < l.width; x++) {
        const i = y * l.width + x;
        if (![i, i + 1, i + l.width, i + l.width + 1].some((c) => l.walls[c])) squares++;
      }
    const floor = l.walls.filter((w) => !w).length;
    assert.ok(squares / floor < 0.15, `level ${n} too open: ${squares} open 2x2 squares`);
  }
});
