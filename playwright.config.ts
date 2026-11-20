import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Single worker to avoid database concurrency conflicts
  reporter: [["html", { open: "never", outputFolder: "playwright-report" }], ["list"]],
  outputDir: "test-results/",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // 1. Setup Project: Authenticate Owner Once
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // 2. Desktop Chrome (1280x800)
    {
      name: "Desktop Chrome (1280x800)",
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: "playwright/.auth/owner.json",
      },
      dependencies: ["setup"],
    },

    // 3. Mobile Chrome (375x812)
    {
      name: "Mobile Chrome (375x812)",
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
        storageState: "playwright/.auth/owner.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "node ./node_modules/next/dist/bin/next start -p 3000",
    url: "http://localhost:3000/api/health",
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
