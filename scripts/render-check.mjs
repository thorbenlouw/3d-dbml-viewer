/**
 * Standalone render-check script (plain ESM JS, no TypeScript needed).
 * Navigates to the dev server, waits 3 s for the 3D scene to render,
 * saves a screenshot to test-evidence/mcp-render-check.png.
 *
 * Run with:
 *   node scripts/render-check.mjs
 */
/* global console */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(
  __dirname,
  '../test-evidence/mcp-render-check.png',
);

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-gl=desktop',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  console.log('Navigating to http://localhost:5173 …');
  await page.goto('http://localhost:5173');

  console.log('Waiting 3 seconds for 3D scene to render …');
  await page.waitForTimeout(3000);

  console.log('Saving screenshot to:', outputPath);
  await page.screenshot({ path: outputPath });

  await browser.close();
  console.log('Done.');
})();
