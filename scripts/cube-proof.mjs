/* global document, console */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: false,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const metrics = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'no canvas' };

  const w = canvas.width;
  const h = canvas.height;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return { error: 'no 2d context' };

  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.drawImage(canvas, 0, 0);

  const data = ctx.getImageData(0, 0, w, h).data;
  let nonBg = 0;
  let blueish = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) continue;

    const isBg = Math.abs(r - 11) <= 2 && Math.abs(g - 16) <= 2 && Math.abs(b - 32) <= 2;
    if (!isBg) nonBg++;
    if (b > r + 20 && b > g + 10) blueish++;
  }

  return { width: w, height: h, nonBgPixels: nonBg, blueishPixels: blueish };
});

await page.screenshot({ path: 'test-evidence/cube-proof.png', fullPage: true });
console.log(JSON.stringify(metrics));

await browser.close();
