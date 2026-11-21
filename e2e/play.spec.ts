import { expect, Page, test } from '@playwright/test';

const KEY = 'glossmaze.progress.v1';

import { generateLevel } from '../src/game/generator';

/** Level 1's layout is fixed by its seed; its known solution paints every tile. */
const LEVEL_1 = generateLevel(1).solution;
type Dir = 'up' | 'down' | 'left' | 'right';
const STEP: Record<Dir, [number, number]> = { up: [0, -40], down: [0, 40], left: [-40, 0], right: [40, 0] };

async function startLevel(page: Page, level = 1) {
  await page.goto('/');
  await page.evaluate(([k, l]) => localStorage.setItem(k as string, JSON.stringify({ level: l, stars: {}, coins: 0 })), [KEY, level]);
  await page.goto('/');
  await page.getByText('Play', { exact: true }).click();
  await expect(page.getByText(`Level ${level}`)).toBeVisible();
}

/** One mouse press, steering through every direction without releasing. */
async function continuousDrag(page: Page, dirs: readonly Dir[], pauseMs = 0) {
  const vp = page.viewportSize()!;
  let x = vp.width / 2;
  let y = vp.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (const d of dirs) {
    for (let i = 0; i < 8; i++) {
      x += STEP[d][0] / 8;
      y += STEP[d][1] / 8;
      await page.mouse.move(x, y);
    }
    if (pauseMs) await page.waitForTimeout(pauseMs);
  }
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => {
    throw e;
  });
});

test('home screen shows the title, demo and play button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/^Gloss\s+Maze$/)).toBeVisible();
  await expect(page.getByText('Swipe the ball. Paint every tile.')).toBeVisible();
  await expect(page.getByText('Play', { exact: true })).toBeVisible();
});

test('arrow keys solve level 1 and show the win screen', async ({ page }) => {
  await startLevel(page);
  for (const d of LEVEL_1) {
    await page.keyboard.press(`Arrow${d[0].toUpperCase()}${d.slice(1)}`);
    await page.waitForTimeout(400);
  }
  await expect(page.getByText('Painted!')).toBeVisible();
  await expect(page.getByText(`Level 1 solved in ${LEVEL_1.length} moves`)).toBeVisible();
});

test('one continuous drag solves level 1 (slow turns)', async ({ page }) => {
  await startLevel(page);
  await continuousDrag(page, LEVEL_1, 350);
  await expect(page.getByText('Painted!')).toBeVisible();
});

test('one continuous drag solves level 1 (turning while the ball still rolls)', async ({ page }) => {
  await startLevel(page);
  await continuousDrag(page, LEVEL_1, 0);
  await expect(page.getByText('Painted!')).toBeVisible();
});

test('undo and restart', async ({ page }) => {
  await startLevel(page);
  for (const d of LEVEL_1.slice(0, 2)) {
    await page.keyboard.press(`Arrow${d[0].toUpperCase()}${d.slice(1)}`);
    await page.waitForTimeout(400);
  }
  await expect(page.getByText('2 moves')).toBeVisible();
  await page.getByLabel('Undo move').click();
  await expect(page.getByText('1 move', { exact: true })).toBeVisible();
  await page.getByLabel('Restart level').click();
  await expect(page.getByText('0 moves')).toBeVisible();
});

test('progress is saved and survives a reload', async ({ page }) => {
  await startLevel(page);
  for (const d of LEVEL_1) {
    await page.keyboard.press(`Arrow${d[0].toUpperCase()}${d.slice(1)}`);
    await page.waitForTimeout(400);
  }
  await expect(page.getByText('Painted!')).toBeVisible();
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), KEY);
  expect(saved.level).toBe(2);
  expect(saved.stars['1']).toBe(3);

  await page.reload();
  await expect(page.getByText('Level 2')).toBeVisible();
});

test('next level loads a new board', async ({ page }) => {
  await startLevel(page);
  for (const d of LEVEL_1) {
    await page.keyboard.press(`Arrow${d[0].toUpperCase()}${d.slice(1)}`);
    await page.waitForTimeout(400);
  }
  await page.getByText('Next level').click();
  await expect(page.getByText('Level 2')).toBeVisible();
  await expect(page.getByText('0 moves')).toBeVisible();
});
