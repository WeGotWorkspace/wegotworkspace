#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const runtimeApiRoot = resolve(repoRoot, "apps", "wegotworkspace", "packages", "api");

const baseFiles = ["composer.json", "composer.lock", "package.json", "phpunit.xml"];
const baseDirs = ["src", "openapi", "scripts", "docs", "tests"];

function hasWithVendorFlag(argv) {
  return argv.includes("--with-vendor");
}

export function syncRuntimeApiPackage(options = {}) {
  const includeVendor = Boolean(options.includeVendor);

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

  if (includeVendor) {
    const fromVendor = resolve(packageRoot, "vendor");
    const toVendor = resolve(runtimeApiRoot, "vendor");
    if (existsSync(fromVendor)) {
      rmSync(toVendor, { recursive: true, force: true });
      cpSync(fromVendor, toVendor, { recursive: true });
    }
  }

  console.log(
    `[sync-runtime-api-package] Synced @wgw/api to ${runtimeApiRoot}${includeVendor ? " (including vendor)" : ""}.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  syncRuntimeApiPackage({ includeVendor: hasWithVendorFlag(process.argv.slice(2)) });
}
