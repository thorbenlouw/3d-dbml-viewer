import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const examplesDir = resolve(__dirname, '../../examples');
const fixturesDir = resolve(__dirname, '../fixtures');
const evidenceDir = resolve(__dirname, '../../test-evidence');

test.beforeAll(() => {
  mkdirSync(evidenceDir, { recursive: true });
});

test('load DBML from disk — all example files and error handling', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // 1. Wait for canvas to appear
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10_000 });

  // 2. No error banner on startup
  await expect(page.getByTestId('error-banner')).not.toBeVisible();

  // 3. Load each example file via the hidden file input
  const exampleFiles = ['blog', 'ecommerce', 'saas-platform', 'multi-schema-erp'];
  for (const name of exampleFiles) {
    const filePath = resolve(examplesDir, `${name}.dbml`);
    await page.locator('input[type="file"]').setInputFiles(filePath);
    await page.waitForTimeout(500);
    await expect(page.getByTestId('error-banner')).not.toBeVisible({
      timeout: 5_000,
    });
  }

  // 4. Load invalid DBML — error banner should appear
  await page.locator('input[type="file"]').setInputFiles(resolve(fixturesDir, 'bad.dbml'));
  await expect(page.getByTestId('error-banner')).toBeVisible({ timeout: 5_000 });
  const bannerText = await page.getByTestId('error-banner').textContent();
  expect(bannerText?.trim().length).toBeGreaterThan(0);

  // 5. Load valid file again — error banner disappears
  await page.locator('input[type="file"]').setInputFiles(resolve(examplesDir, 'blog.dbml'));
  await expect(page.getByTestId('error-banner')).not.toBeVisible({ timeout: 5_000 });

  // 6. Save screenshot
  await page.screenshot({ path: resolve(evidenceDir, 'load-dbml-from-disk.png') });
});
