import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  // The specs share one seeded database and the same demo accounts (one sign-in email per
  // person at a time), and placement needs the content import first: one at a time, in order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // A dev server compiles each page on first visit: waits of 5 s fail at random on a busy machine.
  expect: { timeout: 12_000 },
  use: { baseURL, trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Starts the app unless E2E_BASE_URL points at a deployed site (Phase 9 smoke on production).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${port}`,
        url: `${baseURL}/en`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
