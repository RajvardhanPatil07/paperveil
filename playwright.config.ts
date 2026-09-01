import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3210", trace: "on-first-retry" },
  webServer: { command: "npm run dev -- --port 3210", url: "http://127.0.0.1:3210", reuseExistingServer: false },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"] } }
  ]
});
