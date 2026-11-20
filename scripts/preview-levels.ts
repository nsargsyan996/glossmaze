/// <reference types="node" />
// Prints generated levels as ASCII: npx tsx scripts/preview-levels.ts 1 5 20 (or: pnpm preview-levels 1 5 20)
import { generateLevel } from '../src/game/generator';

const nums = process.argv.slice(2).map(Number);
for (const n of nums.length ? nums : [1, 2, 3, 10, 30, 60]) {
  const l = generateLevel(n);
  console.log(`\nLevel ${n}  ${l.width}x${l.height}  par ${l.par}  solution: ${l.solution.join(' ')}`);
  for (let y = 0; y < l.height; y++) {
    let row = '';
    for (let x = 0; x < l.width; x++) {
      const i = y * l.width + x;
      row += i === l.start ? 'O ' : l.walls[i] ? '██' : '· ';
    }
    console.log(row);
  }
}
