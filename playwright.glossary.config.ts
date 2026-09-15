import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "glossary-browser.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4333",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: [
    {
      command: "node tests/fixtures/glossary-api.mjs",
      url: "http://127.0.0.1:4334/api/v2",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4333 --ignore-lock",
      env: {
        ASTRO_DEV_BACKGROUND: "1",
        PRISMIC_REPOSITORY_NAME: "http://127.0.0.1:4334/api/v2",
        PRISMIC_ACCESS_TOKEN: "",
        PRISMIC_CONTENT_MODE: "prismic",
        PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_test",
        PUBLIC_POSTHOG_HOST: "https://posthog.test",
      },
      url: "http://127.0.0.1:4333/preview/",
      reuseExistingServer: false,
    },
  ],
});
