import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.WGW_APPS_E2E_BASE_URL ?? "http://127.0.0.1:6006";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
  },
  webServer: process.env.WGW_APPS_E2E_NO_SERVER
    ? undefined
    : {
        command: "pnpm run storybook",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        cwd: packageRoot,
      },
});
