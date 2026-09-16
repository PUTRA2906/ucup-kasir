import { defineConfig, devices } from '@playwright/test'

/**
 * Konfigurasi Playwright untuk e2e testing Ucup Kasir
 * Dokumentasi: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Timeout maksimal per test */
  timeout: 30 * 1000,

  /* Konfigurasi expect */
  expect: {
    timeout: 5000
  },

  /* Run tests paralel di CI */
  fullyParallel: true,

  /* Fail build on CI jika ada test yang di-skip */
  forbidOnly: !!process.env.CI,

  /* Retry di CI */
  retries: process.env.CI ? 2 : 0,

  /* Parallel workers */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: 'html',

  /* Shared settings untuk semua projects */
  use: {
    /* Base URL untuk test */
    baseURL: 'http://localhost:5173',

    /* Collect trace saat retry */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects untuk browser yang berbeda */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Web Server - start dev server sebelum test */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
