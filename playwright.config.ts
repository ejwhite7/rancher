import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: process.env.RUN_DATABASE_TESTS === "1" ? 1 : undefined,
  use: {
    baseURL: "http://127.0.0.1:4322",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4322 --ignore-lock",
    env: {
      ASTRO_DEV_BACKGROUND: "1",
      BOOKING_URL: "https://cal.com/growthcast/discovery",
    },
    url: "http://127.0.0.1:4322",
    reuseExistingServer: false,
  },
});
