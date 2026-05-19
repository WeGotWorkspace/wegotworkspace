#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const runtimeApiRoot = resolve(repoRoot, "apps", "wegotworkspace", "packages", "api");

const baseFiles = ["composer.json", "composer.lock", "package.json", "README.md", "phpunit.xml", "artisan"];
const baseDirs = ["app", "bootstrap", "config", "openapi", "public", "routes", "scripts", "docs", "storage", "tests"];

export function syncRuntimeApiPackage() {
  mkdirSync(runtimeApiRoot, { recursive: true });

  for (const file of baseFiles) {
    const from = resolve(packageRoot, file);
    const to = resolve(runtimeApiRoot, file);
    if (!existsSync(from)) continue;
    cpSync(from, to);
  }

  for (const dir of baseDirs) {
    const from = resolve(packageRoot, dir);
    const to = resolve(runtimeApiRoot, dir);
    if (!existsSync(from)) continue;
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
  }

  console.log(`[sync-runtime-api-package] Synced OpenAPI contract to ${runtimeApiRoot}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncRuntimeApiPackage();
}
