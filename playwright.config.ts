import { defineConfig } from '@playwright/test';
export default defineConfig({
  globalSetup: './tests/member-hub/global-setup.mjs',
  testDir: './tests/member-hub', timeout: 90000, workers: 1, fullyParallel: false,
  use: { baseURL: 'http://localhost:3002', browserName: 'chromium', trace: 'off', actionTimeout: 15000 },
  reporter: 'list',
});
