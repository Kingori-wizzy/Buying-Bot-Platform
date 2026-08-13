/**
 * Playwright smoke foundation (M23).
 * Skips browser/home checks when WEB_BASE_URL is unset.
 * API health runs when API_BASE_URL is set; otherwise skips with warning.
 */
import { defineConfig } from '@playwright/test';

const webBase = process.env.WEB_BASE_URL;
const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: webBase || apiBase,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'smoke',
      testMatch: /.*\.spec\.ts/,
    },
  ],
});
