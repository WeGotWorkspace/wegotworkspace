#!/usr/bin/env node

import { existsSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultSwaggerRoot = join(packageRoot, "vendor/swagger-api/swagger-ui");

/** Assets served by ApiDocsController — sanity check after prune. */
const requiredDistAssets = [
  "swagger-ui.css",
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
  "favicon-32x32.png",
  "favicon-16x16.png",
];

export function pruneSwaggerUiVendor(options = {}) {
  const swaggerRoot = options.swaggerRoot ?? defaultSwaggerRoot;
  if (!existsSync(swaggerRoot)) {
    console.warn("[prune-swagger-ui-vendor] swagger-ui vendor path missing; skipping.");
    return { removed: 0 };
  }

  const distPath = join(swaggerRoot, "dist");
  if (!existsSync(distPath)) {
    throw new Error(
      "[prune-swagger-ui-vendor] vendor/swagger-api/swagger-ui/dist is missing; cannot prune.",
    );
  }

  for (const asset of requiredDistAssets) {
    const assetPath = join(distPath, asset);
    if (!existsSync(assetPath)) {
      throw new Error(
        `[prune-swagger-ui-vendor] required dist asset missing: ${asset}`,
      );
    }
  }

  let removed = 0;
  for (const entry of readdirSync(swaggerRoot)) {
    if (entry === "dist") {
      continue;
    }
    rmSync(join(swaggerRoot, entry), { recursive: true, force: true });
    removed += 1;
  }

  console.log(
    `[prune-swagger-ui-vendor] Kept swagger-ui/dist only (removed ${removed} top-level entries).`,
  );
  return { removed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  pruneSwaggerUiVendor();
}
