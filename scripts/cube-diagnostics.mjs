/* global document, getComputedStyle, console */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: false, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
const logs = [];
page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const btn = document.querySelector('[aria-label="Reset camera to overview"]');
  const appText = document.body?.innerText ?? '';

  if (!canvas) {
    return {
      hasCanvas: false,
      hasButton: Boolean(btn),
      appText: appText.slice(0, 300),
    };
  }

  const webgl = canvas.getContext('webgl');
  const webgl2 = canvas.getContext('webgl2');
  const style = getComputedStyle(canvas);
  const bodyStyle = getComputedStyle(document.body);

  return {
    hasCanvas: true,
    hasButton: Boolean(btn),
    appText: appText.slice(0, 300),
    canvasClient: { w: canvas.clientWidth, h: canvas.clientHeight },
    canvasBuffer: { w: canvas.width, h: canvas.height },
    canvasStyle: { width: style.width, height: style.height, bg: style.backgroundColor },
    bodyBg: bodyStyle.backgroundColor,
    webgl: Boolean(webgl),
    webgl2: Boolean(webgl2),
  };
});

await page.screenshot({ path: 'test-evidence/cube-diagnostics.png', fullPage: true });
console.log(JSON.stringify({ info, logs }, null, 2));

await browser.close();
