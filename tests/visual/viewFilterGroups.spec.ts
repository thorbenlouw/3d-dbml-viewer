/**
 * Playwright E2E tests for Feature 17: TableGroup view filters and Reload.
 * Acceptance tests AT-1 through AT-10.
 *
 * Schema used: tests/fixtures/tablegroups.dbml
 *   TableGroup commerce: orders, customers (2 tables)
 *   TableGroup catalog:  products, categories (2 tables)
 *   Ungrouped:           audit_log (1 table)
 *   Refs: 4 total (orders->customers, orders->products, products->categories, categories->categories)
 */

import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fixturesDir = resolve(__dirname, '../fixtures');
const evidenceDir = resolve(__dirname, '../../test-evidence');

const groupedFixturePath = resolve(fixturesDir, 'tablegroups.dbml');
const basicFixturePath = resolve(fixturesDir, 'view-filters-basic.dbml');

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
    { timeout: 8000 },
  );
}

async function openViewFilters(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: /open view filters/i }).click();
  await expect(page.getByRole('dialog', { name: 'View Filters' })).toBeVisible();
}

// AT-1: Table Groups section is absent for ungrouped schemas; present for grouped schemas.
test('AT-1: no Table Groups section for ungrouped schema; section appears for grouped schema', async ({
  page,
}) => {
  await page.goto('/');
  await waitForScene(page);

  // Load ungrouped schema — Table Groups section must not exist
  await loadDbml(page, basicFixturePath, 3);
  await openViewFilters(page);
  await expect(
    page.getByRole('region', { name: /table groups/i }).or(page.getByText('Table Groups')),
  ).toHaveCount(0);
  await page.getByRole('button', { name: /close view filters/i }).click();

  // Load grouped schema — Table Groups section must appear
  await loadDbml(page, groupedFixturePath, 5);
  await openViewFilters(page);
  await expect(page.getByRole('heading', { name: /^table groups$/i })).toBeVisible();

  await page.screenshot({ path: resolve(evidenceDir, 'at1-groups-section-visible.png') });
});

// AT-2: Hide group → all its tables disappear from the scene.
test('AT-2: hiding a group removes all its tables from the scene', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  await loadDbml(page, groupedFixturePath, 5);
  await openViewFilters(page);

  const sceneRoot = page.getByTestId('scene-root');
  await expect(sceneRoot).toHaveAttribute('data-table-count', '5');

  // Uncheck the "commerce" group (orders + customers = 2 tables)
  // Accessible name includes "N tables" suffix so we use a substring match
  await page.getByRole('checkbox', { name: /commerce/i }).uncheck();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '3');

  await page.screenshot({ path: resolve(evidenceDir, 'at2-group-hidden.png') });
});

// AT-3: Refs to hidden-group tables disappear.
test('AT-3: refs to hidden-group tables disappear', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  await loadDbml(page, groupedFixturePath, 5);
  await openViewFilters(page);

  const sceneRoot = page.getByTestId('scene-root');
  await expect(sceneRoot).toHaveAttribute('data-ref-count', '4');

  // Uncheck catalog (products + categories); loses 3 refs involving these tables
  await page.getByRole('checkbox', { name: /catalog/i }).uncheck();
  // Remaining: orders->customers only (1 ref)
  await expect(sceneRoot).toHaveAttribute('data-ref-count', '1');

  await page.screenshot({ path: resolve(evidenceDir, 'at3-group-refs-removed.png') });
});

// AT-4: Ungrouped filter hides only ungrouped tables.
test('AT-4: Ungrouped filter hides only ungrouped tables', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  await loadDbml(page, groupedFixturePath, 5);
  await openViewFilters(page);

  const sceneRoot = page.getByTestId('scene-root');
  await expect(sceneRoot).toHaveAttribute('data-table-count', '5');

  // Uncheck Ungrouped row (audit_log — 1 table, no refs)
  await page.getByRole('checkbox', { name: /ungrouped/i }).uncheck();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '4');
  // Refs unchanged since audit_log has no refs
  await expect(sceneRoot).toHaveAttribute('data-ref-count', '4');

  await page.screenshot({ path: resolve(evidenceDir, 'at4-ungrouped-hidden.png') });
});

// AT-5: Show TableGroup Boundaries toggle affects boundary rendering.
// Verifiable via dialog state; actual boundary removal requires WebGL headed mode.
test('AT-5: Show TableGroup Boundaries toggle responds to user interaction', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  await loadDbml(page, groupedFixturePath, 5);
  await openViewFilters(page);

  const boundaryCheckbox = page.getByRole('checkbox', { name: /show tablegroup boundaries/i });
  await expect(boundaryCheckbox).toBeChecked(); // default true for grouped schema

  await boundaryCheckbox.uncheck();
  await expect(boundaryCheckbox).not.toBeChecked();

  await boundaryCheckbox.check();
  await expect(boundaryCheckbox).toBeChecked();

  await page.screenshot({ path: resolve(evidenceDir, 'at5-boundary-toggle.png') });
});

// AT-6: Per-table hidden table stays hidden after group is re-toggled.
test('AT-6: per-table hidden table stays hidden after group re-enable', async ({ page }) => {
  await page.goto('/');
  await waitForScene(page);

  await loadDbml(page, groupedFixturePath, 5);
  await openViewFilters(page);

  const sceneRoot = page.getByTestId('scene-root');

  // Hide one per-table entry (orders) via the Tables section
  // Accessible name includes "N fields" suffix; use substring match
  await page.getByRole('checkbox', { name: /orders/i }).uncheck();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '4');

  // Now hide the commerce group — drops orders and customers
  await page.getByRole('checkbox', { name: /commerce/i }).uncheck();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '3');

  // Re-enable the commerce group — orders should STILL be hidden (per-table hidden)
  await page.getByRole('checkbox', { name: /commerce/i }).check();
  // Orders is still in visibleTableIds=false, so only customers comes back
  await expect(sceneRoot).toHaveAttribute('data-table-count', '4');

  await page.screenshot({ path: resolve(evidenceDir, 'at6-per-table-sticky.png') });
});

// AT-7: Reload button is disabled for the default (auto-loaded) schema; enabled only after FSA file load.
test('AT-7: reload button is disabled for default schema; visible and disabled', async ({
  page,
}) => {
  await page.goto('/');
  await waitForScene(page);

  const reloadButton = page.getByRole('button', { name: /reload current file/i });
  await expect(reloadButton).toBeVisible();
  await expect(reloadButton).toBeDisabled();

  // Loading via input[type=file] (fallback path) also keeps it disabled
  await loadDbml(page, groupedFixturePath, 5);
  await expect(reloadButton).toBeDisabled();

  await page.screenshot({ path: resolve(evidenceDir, 'at7-reload-button-disabled.png') });
});

// AT-8: Reload reflects on-disk changes (mocked via window.showOpenFilePicker).
test('AT-8: reload picks up changed file content via mocked File System Access API', async ({
  page,
}) => {
  const initialContent = readFileSync(groupedFixturePath, 'utf-8');
  const reloadedContent = readFileSync(basicFixturePath, 'utf-8'); // 3-table schema

  await page.goto('/');
  await waitForScene(page);

  // Install a mock for showOpenFilePicker that returns a handle whose getFile() returns initialContent
  await page.evaluate(
    ({ initial, reloaded }) => {
      let callCount = 0;
      const makeFile = (content: string) =>
        new File([content], 'schema.dbml', { type: 'text/plain' });

      const mockHandle = {
        kind: 'file' as const,
        name: 'schema.dbml',
        getFile: async () => {
          callCount += 1;
          return callCount === 1 ? makeFile(initial) : makeFile(reloaded);
        },
        // Minimal FileSystemFileHandle shape
        isSameEntry: async () => false,
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        createWritable: async () => { throw new Error('not implemented'); },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).showOpenFilePicker = async () => [mockHandle];
    },
    { initial: initialContent, reloaded: reloadedContent },
  );

  // Click Load file… button — should invoke showOpenFilePicker
  await page.getByRole('button', { name: /load a dbml file from disk/i }).click();
  const sceneRoot = page.getByTestId('scene-root');
  await expect(sceneRoot).toHaveAttribute('data-table-count', '5', { timeout: 8000 });

  // Reload button should now be enabled
  const reloadButton = page.getByRole('button', { name: /reload current file/i });
  await expect(reloadButton).toBeEnabled();

  // Click Reload — should load the reloaded content (3 tables)
  await reloadButton.click();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '3', { timeout: 8000 });

  await page.screenshot({ path: resolve(evidenceDir, 'at8-reload-changed-content.png') });
});

// AT-9: Reload resets filter state to defaults.
test('AT-9: reload resets filters to defaults', async ({ page }) => {
  const content = readFileSync(groupedFixturePath, 'utf-8');

  await page.goto('/');
  await waitForScene(page);

  await page.evaluate(
    ({ fileContent }) => {
      const makeFile = (c: string) => new File([c], 'schema.dbml', { type: 'text/plain' });
      const mockHandle = {
        kind: 'file' as const,
        name: 'schema.dbml',
        getFile: async () => makeFile(fileContent),
        isSameEntry: async () => false,
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        createWritable: async () => { throw new Error('not implemented'); },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).showOpenFilePicker = async () => [mockHandle];
    },
    { fileContent: content },
  );

  await page.getByRole('button', { name: /load a dbml file from disk/i }).click();
  const sceneRoot = page.getByTestId('scene-root');
  await expect(sceneRoot).toHaveAttribute('data-table-count', '5', { timeout: 8000 });

  // Apply a filter (hide orders table)
  await openViewFilters(page);
  await page.getByRole('checkbox', { name: /orders/i }).uncheck();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '4');
  await page.getByRole('button', { name: /close view filters/i }).click();

  // Reload — filters should reset, all 5 tables back
  const reloadButton = page.getByRole('button', { name: /reload current file/i });
  await expect(reloadButton).toBeEnabled();
  await reloadButton.click();
  await expect(sceneRoot).toHaveAttribute('data-table-count', '5', { timeout: 8000 });

  await page.screenshot({ path: resolve(evidenceDir, 'at9-reload-resets-filters.png') });
});

// AT-10: Reload failure shows error banner and preserves prior scene.
test('AT-10: reload failure shows error banner and preserves prior scene', async ({ page }) => {
  const content = readFileSync(groupedFixturePath, 'utf-8');

  await page.goto('/');
  await waitForScene(page);

  let getFileShouldFail = false;

  await page.evaluate(
    ({ fileContent }) => {
      const makeFile = (c: string) => new File([c], 'schema.dbml', { type: 'text/plain' });
      const mockHandle = {
        kind: 'file' as const,
        name: 'schema.dbml',
        getFile: async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).__reloadShouldFail) throw new Error('Simulated IO error');
          return makeFile(fileContent);
        },
        isSameEntry: async () => false,
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        createWritable: async () => { throw new Error('not implemented'); },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).showOpenFilePicker = async () => [mockHandle];
    },
    { fileContent: content },
  );

  await page.getByRole('button', { name: /load a dbml file from disk/i }).click();
  const sceneRoot = page.getByTestId('scene-root');
  await expect(sceneRoot).toHaveAttribute('data-table-count', '5', { timeout: 8000 });

  // Make getFile() throw on next call
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__reloadShouldFail = true;
  });
  void getFileShouldFail; // suppress unused warning

  const reloadButton = page.getByRole('button', { name: /reload current file/i });
  await expect(reloadButton).toBeEnabled();
  await reloadButton.click();

  // Error banner should appear
  await expect(page.getByTestId('error-banner')).toBeVisible({ timeout: 5000 });

  // Prior scene (5 tables) preserved
  await expect(sceneRoot).toHaveAttribute('data-table-count', '5');

  await page.screenshot({ path: resolve(evidenceDir, 'at10-reload-error-banner.png') });
});
