import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/visual',
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
        },
      },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
  },
});
