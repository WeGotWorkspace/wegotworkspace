import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(packageRoot, ".auth");
const authFile = path.join(authDir, "admin.json");

const username = process.env.WGW_E2E_USERNAME ?? "admin";
const password = process.env.WGW_E2E_PASSWORD ?? "storybook-dev";
const apiBase = process.env.WGW_E2E_API_URL ?? "http://127.0.0.1:9080";
const appOrigin = process.env.WGW_APPS_E2E_BASE_URL ?? "http://127.0.0.1:5173";

export default async function globalSetup() {
  try {
    execSync("php artisan cache:clear", {
      cwd: path.join(packageRoot, "..", "api"),
      stdio: "ignore",
    });
  } catch {
    // Best-effort when API package is unavailable; auth may still succeed.
  }

  const response = await fetch(`${apiBase}/api/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `E2E auth setup failed (${response.status}): ${body}\n` +
        "Ensure API is running, run `pnpm setup:storybook-live-api`, and set WGW_DISABLE_LOGIN_THROTTLE=1 for e2e.",
    );
  }

  const tokens = await response.json();
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("E2E auth setup response missing tokens.");
  }

  await mkdir(authDir, { recursive: true });
  await writeFile(
    authFile,
    JSON.stringify(
      {
        cookies: [],
        origins: [
          {
            origin: appOrigin,
            localStorage: [
              { name: "wgw.api.access_token", value: tokens.access_token },
              { name: "wgw.api.refresh_token", value: tokens.refresh_token },
            ],
          },
        ],
      },
      null,
      2,
    ),
  );
}

export { authFile };
