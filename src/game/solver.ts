import { slide } from './engine';
import { DIRS, Dir, Level } from './types';

/**
 * Breadth-first search over (ball position, painted tiles) for the fewest moves.
 * Returns null if the search would exceed `maxStates` (big open levels), so callers
 * can fall back to the generator's own solution.
 */
export function solveOptimal(level: Level, maxStates = 15000): Dir[] | null {
  const floor: number[] = [];
  level.walls.forEach((w, i) => {
    if (!w) floor.push(i);
  });
  const bit = new Map(floor.map((c, i) => [c, 1n << BigInt(i)]));
  const full = (1n << BigInt(floor.length)) - 1n;

  const edges = new Map<number, { dir: Dir; end: number; mask: bigint }[]>();
  for (const c of floor) {
    const list = [];
    for (const dir of DIRS) {
      const r = slide(level, c, dir);
      if (r.path.length) list.push({ dir, end: r.end, mask: r.path.reduce((m, p) => m | bit.get(p)!, 0n) });
    }
    edges.set(c, list);
  }

  type Node = { pos: number; mask: bigint; prev: Node | null; dir: Dir | null };
  const startMask = bit.get(level.start)!;
  if (startMask === full) return [];
  let frontier: Node[] = [{ pos: level.start, mask: startMask, prev: null, dir: null }];
  const seen = new Set<string>([`${level.start}:${startMask}`]);

  while (frontier.length) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const e of edges.get(node.pos)!) {
        const mask = node.mask | e.mask;
        const child: Node = { pos: e.end, mask, prev: node, dir: e.dir };
        if (mask === full) {
          const path: Dir[] = [];
          for (let n: Node | null = child; n && n.dir; n = n.prev) path.push(n.dir);
          return path.reverse();
        }
        const key = `${e.end}:${mask}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(child);
        if (seen.size > maxStates) return null;
      }
    }
    frontier = next;
  }
  return null;
}
