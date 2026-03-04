/**
 * Screenshot script for notes icons verification.
 * Takes 3 screenshots:
 * 1. notes-icons-visible.png — scene with note icons visible
 * 2. notes-panel-open.png — after clicking on a note icon (users.role)
 * 3. notes-panel-closed.png — after clicking the X close button at (875, 251)
 *
 * Run with:
 *   node scripts/notes-screenshot.mjs
 */
/* global console */

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.resolve(__dirname, '../test-evidence');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-gl=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
      '--no-sandbox',
      '--use-angle=swiftshader',
    ],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  console.log('Navigating to http://localhost:5173 …');
  await page.goto('http://localhost:5173');

  console.log('Waiting 3 seconds for 3D scene to render …');
  await page.waitForTimeout(3000);

  // Screenshot 1: scene with note icons visible
  const screenshot1 = path.join(evidenceDir, 'notes-icons-visible.png');
  console.log('Saving screenshot 1 to:', screenshot1);
  await page.screenshot({ path: screenshot1 });
  console.log('Screenshot 1 saved.');

  // Click on the users.role note icon — observed at approximately (707, 420)
  // from the previous screenshots. This opened the "users.role" notes panel.
  console.log('Clicking users.role note icon at (707, 420) …');
  await page.mouse.click(707, 420);
  await page.waitForTimeout(1000);

  // Screenshot 2: notes panel open showing users.role
  const screenshot2 = path.join(evidenceDir, 'notes-panel-open.png');
  console.log('Saving screenshot 2 to:', screenshot2);
  await page.screenshot({ path: screenshot2 });
  console.log('Screenshot 2 saved.');

  // The X close button was visible in the previous screenshot at approximately (875, 251)
  // inside the notes panel header area. Click it directly.
  console.log('Clicking X close button at (875, 251) …');
  await page.mouse.click(875, 251);
  await page.waitForTimeout(1000);

  // Screenshot 3: panel should now be closed
  const screenshot3 = path.join(evidenceDir, 'notes-panel-closed.png');
  console.log('Saving screenshot 3 to:', screenshot3);
  await page.screenshot({ path: screenshot3 });
  console.log('Screenshot 3 saved.');

  await browser.close();
  console.log('Done. All screenshots saved to test-evidence/.');
})();
