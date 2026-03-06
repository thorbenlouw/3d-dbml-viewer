import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

async function hoverUntilNavigationUpdates(
  page: import('@playwright/test').Page,
): Promise<boolean> {
  const canvas = page.locator('canvas');
  const target = page.getByTestId('navigation-target-value');
  const box = await canvas.boundingBox();
  if (!box) return false;

  const cols = 8;
  const rows = 5;
  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      const x = box.x + (col / (cols + 1)) * box.width;
      const y = box.y + (row / (rows + 1)) * box.height;
      await page.mouse.move(x, y);
      await page.waitForTimeout(80);
      const value = (await target.textContent())?.trim();
      if (value && value !== 'None') return true;
    }
  }
  return false;
}

async function doubleClickCanvasPoint(
  page: import('@playwright/test').Page,
  xRatio: number,
  yRatio: number,
): Promise<void> {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box unavailable');
  const x = box.x + box.width * xRatio;
  const y = box.y + box.height * yRatio;
  await page.mouse.dblclick(x, y);
  await page.waitForTimeout(250);
}

test('interactive layout — canvas loads and tables are visible', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    if (!err.message.includes('WebGL context')) {
      pageErrors.push(err.message);
    }
  });

  await page.goto('/');

  const canvas = page.locator('canvas');
  const fallback = page.getByText('WebGL is unavailable in this browser session.');
  const navPanel = page.getByTestId('navigation-panel');
  const navTarget = page.getByTestId('navigation-target-value');

  await expect(canvas.or(fallback)).toBeVisible({ timeout: 10000 });
  await expect(navPanel).toBeVisible();
  await expect(navTarget).toHaveText('None');
  await page.waitForTimeout(2000); // allow force simulation to settle

  if (await fallback.isVisible()) {
    // WebGL not available in this environment — skip visual checks
    expect(pageErrors).toHaveLength(0);
    return;
  }

  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);

  // Reset camera to ensure all tables are in view regardless of which default schema is loaded
  await page.getByLabel('Reset camera to overview').click();
  await page.waitForTimeout(800); // allow camera tween to complete

  const didHoverUpdate = await hoverUntilNavigationUpdates(page);
  expect(didHoverUpdate).toBe(true);

  // Save screenshot as evidence
  const evidenceDir = path.resolve('test-evidence');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'interactive-layout.png') });
  await page.screenshot({ path: path.join(evidenceDir, 'hover-navigation-panel.png') });

  expect(pageErrors).toHaveLength(0);
});

test('interactive layout — drag simulation runs without JS errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    if (!err.message.includes('WebGL context')) {
      pageErrors.push(err.message);
    }
  });

  await page.goto('/');

  const canvas = page.locator('canvas');
  const fallback = page.getByText('WebGL is unavailable in this browser session.');

  await expect(canvas.or(fallback)).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000);

  if (await fallback.isVisible()) {
    expect(pageErrors).toHaveLength(0);
    return;
  }

  // Simulate a mouse drag across the canvas centre to exercise drag code paths
  const canvasBox = await canvas.boundingBox();
  if (canvasBox) {
    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy + 40, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }

  // Note icons are passive; click inside the scene should not open any note panel controls.
  await page.mouse.click(canvasBox?.x ?? 20, canvasBox?.y ?? 20);
  await expect(page.getByRole('button', { name: /close note/i })).toHaveCount(0);

  expect(pageErrors).toHaveLength(0);
});

test('interactive layout — focus marker placement/removal works', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    if (!err.message.includes('WebGL context')) {
      pageErrors.push(err.message);
    }
  });

  await page.goto('/');

  const canvas = page.locator('canvas');
  const fallback = page.getByText('WebGL is unavailable in this browser session.');
  const sceneRoot = page.getByTestId('scene-root');

  await expect(canvas.or(fallback)).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000);

  if (await fallback.isVisible()) {
    expect(pageErrors).toHaveLength(0);
    return;
  }

  await expect(sceneRoot).toHaveAttribute('data-focus-mode', 'none');

  // Place marker by double-clicking empty space.
  await doubleClickCanvasPoint(page, 0.08, 0.1);
  await expect(sceneRoot).toHaveAttribute('data-focus-mode', 'marker');

  // Marker mode recenters pivot, so marker is near viewport center after placement.
  await doubleClickCanvasPoint(page, 0.5, 0.5);
  await expect(sceneRoot).toHaveAttribute('data-focus-mode', 'none');

  await doubleClickCanvasPoint(page, 0.08, 0.1);
  await expect(sceneRoot).toHaveAttribute('data-focus-mode', 'marker');

  const evidenceDir = path.resolve('test-evidence');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, 'focus-marker-mode.png') });

  expect(pageErrors).toHaveLength(0);
});
