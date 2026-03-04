import { test, expect } from '@playwright/test';

test('3D scene renders with canvas, Reset View button, and no errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    // Filter out known headless-only WebGL infrastructure errors
    if (!err.message.includes('WebGL context')) {
      pageErrors.push(err.message);
    }
  });

  await page.goto('/');

  // Wait for canvas to appear
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });

  // Assert canvas has non-zero dimensions
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);

  // Assert Reset View button is present
  const resetBtn = page.locator('[aria-label="Reset camera to overview"]');
  await expect(resetBtn).toBeVisible();

  // Click Reset View and assert no errors
  await resetBtn.click();

  // Wait a moment for any async errors
  await page.waitForTimeout(500);

  expect(pageErrors).toHaveLength(0);
});
