/// <reference types="node" />
import { slide } from '../src/game/engine';
import { generateLevel } from '../src/game/generator';
import { DIRS, Level } from '../src/game/types';


function optimal(level: Level, cap = 400000): number | null {
  const floor: number[] = [];
  level.walls.forEach((w, i) => { if (!w) floor.push(i); });
  const bit = new Map(floor.map((c, i) => [c, 1n << BigInt(i)]));
  const full = (1n << BigInt(floor.length)) - 1n;
  const moves = new Map<number, { end: number; mask: bigint }[]>();
  for (const c of floor) moves.set(c, DIRS.map((d) => slide(level, c, d)).filter((r) => r.path.length).map((r) => ({ end: r.end, mask: r.path.reduce((m, p) => m | bit.get(p)!, 0n) })));
  let frontier = [{ pos: level.start, mask: bit.get(level.start)! }];
  const seen = new Set<string>([`${level.start}:${frontier[0].mask}`]);
  for (let depth = 1; frontier.length; depth++) {
    const next: typeof frontier = [];
    for (const s of frontier) for (const m of moves.get(s.pos)!) {
      const mask = s.mask | m.mask;
      if (mask === full) return depth;
      const k = `${m.end}:${mask}`;
      if (seen.has(k)) continue;
      seen.add(k); next.push({ pos: m.end, mask });
      if (seen.size > cap) return null;
    }
    frontier = next;
  }
  return null;
}

// How forgiving is a level? Count "dead" moves: moves after which the level can no longer be finished is hard to compute; use branching instead.
for (const n of [1, 2, 3, 5, 8, 12, 16, 20, 25, 30, 40, 50, 60, 80]) {
  const l = generateLevel(n);
  const floor = l.walls.filter((w) => !w).length;
  const opt = optimal(l);
  console.log(`L${n}\t${l.width}x${l.height}\tfloor ${floor}\tpar ${l.par}\toptimal ${opt ?? '>cap'}`);
}
