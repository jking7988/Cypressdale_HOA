import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/member-hub', timeout: 90000, workers: 1, fullyParallel: false,
  use: { baseURL: 'http://localhost:3001', browserName: 'chromium', trace: 'off', actionTimeout: 15000 },
  reporter: 'list',
});
