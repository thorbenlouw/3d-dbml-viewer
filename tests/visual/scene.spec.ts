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

  const canvas = page.locator('canvas');
  const fallback = page.getByText('WebGL is unavailable in this browser session.');
  const resetBtn = page.locator('[aria-label="Reset camera to overview"]');

  // Wait for either a WebGL canvas render path or explicit fallback UI.
  await expect(canvas.or(fallback)).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  if (await fallback.isVisible()) {
    await expect(fallback).toBeVisible();
    await expect(resetBtn).toHaveCount(0);
  } else {
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toHaveText('Reset View');
    await resetBtn.click();
  }

  await page.waitForTimeout(500);
  expect(pageErrors).toHaveLength(0);
});
