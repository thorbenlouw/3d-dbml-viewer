import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesDir = resolve(__dirname, '../fixtures');
const evidenceDir = resolve(__dirname, '../../test-evidence');

const basicFixturePath = resolve(fixturesDir, 'view-filters-basic.dbml');
const largeFixturePath = resolve(fixturesDir, 'view-filters-large.dbml');

test.beforeAll(() => {
  mkdirSync(evidenceDir, { recursive: true });
});

async function waitForScene(page: import('@playwright/test').Page): Promise<void> {
  const sceneRoot = page.getByTestId('scene-root');
  const fallback = page.getByText('WebGL is unavailable in this browser session.');
  await expect(sceneRoot.or(fallback)).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('navigation-panel')).toBeVisible();
}

async function loadDbml(
  page: import('@playwright/test').Page,
  filePath: string,
  expectedTableCount: number,
): Promise<void> {
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.getByTestId('scene-root')).toHaveAttribute(
    'data-table-count',
    String(expectedTableCount),
  );
}

async function openViewFilters(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: /open view filters/i }).click();
  await expect(page.getByRole('dialog', { name: 'View Filters' })).toBeVisible();
}

test('view filters defaults for small and large schemas', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  await loadDbml(page, basicFixturePath, 3);
  await openViewFilters(page);
  await expect(page.getByLabel('Full Table')).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /users/i })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /posts/i })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /comments/i })).toBeChecked();
  await page.getByRole('button', { name: /close view filters/i }).click();

  await loadDbml(page, largeFixturePath, 31);
  await openViewFilters(page);
  await expect(page.getByLabel('Table Only')).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /table_01/i })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /table_31/i })).toBeChecked();
});

test('view filters mode changes, hide/show actions, and indicator work', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  await loadDbml(page, basicFixturePath, 3);
  await openViewFilters(page);

  const sceneRoot = page.getByTestId('scene-root');
  await expect(sceneRoot).toHaveAttribute('data-field-detail-mode', 'full');
  await expect(sceneRoot).toHaveAttribute('data-ref-count', '3');

  await page.screenshot({ path: resolve(evidenceDir, 'view-filters-full-table.png') });

  await page.getByLabel('Table Only').check();
  await expect(sceneRoot).toHaveAttribute('data-field-detail-mode', 'table-only');
  await expect(sceneRoot).toHaveAttribute('data-ref-count', '3');
  await page.screenshot({ path: resolve(evidenceDir, 'view-filters-table-only.png') });

  await page.getByLabel('Ref Fields Only').check();
  await expect(sceneRoot).toHaveAttribute('data-field-detail-mode', 'ref-fields-only');
  await page.screenshot({ path: resolve(evidenceDir, 'view-filters-ref-fields-only.png') });

  await page.getByRole('checkbox', { name: /posts/i }).uncheck();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '2');
  await expect(sceneRoot).toHaveAttribute('data-ref-count', '1');
  await page.screenshot({ path: resolve(evidenceDir, 'view-filters-hidden-table.png') });

  await page.getByRole('button', { name: /close view filters/i }).click();
  await expect(page.getByTestId('view-filters-active-indicator')).toBeVisible();

  await openViewFilters(page);
  await page.getByRole('button', { name: 'Unselect All' }).click();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '0');
  await expect(sceneRoot).toHaveAttribute('data-ref-count', '0');

  await page.getByRole('button', { name: 'Select All' }).click();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '3');
  await expect(sceneRoot).toHaveAttribute('data-ref-count', '3');
});

test('view filters dialog closes on Escape', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  await loadDbml(page, basicFixturePath, 3);
  await openViewFilters(page);
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog', { name: 'View Filters' })).toHaveCount(0);
});
