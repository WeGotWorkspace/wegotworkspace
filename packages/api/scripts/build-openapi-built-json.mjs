import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const sourcePath = path.resolve(packageRoot, "openapi/openapi.json");
const outputPath = path.resolve(packageRoot, "openapi/generated/openapi.built.json");

/**
 * Resolve the OpenAPI document used for TypeScript typegen.
 *
 * Contract-only mode: the enriched `openapi.built.json` is committed. The legacy
 * PHP `OpenApiDocument::build()` path was removed with the runtime.
 *
 * When `openapi.json` changes, update `openapi.built.json` in the same PR (or add a
 * Node-based enrich step later). We do not overwrite an existing built file from the
 * slim source spec automatically — that would drop committed schema detail.
 */
export function buildOpenApiBuiltJson() {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  if (existsSync(outputPath)) {
    return outputPath;
  }

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing OpenAPI source: ${sourcePath}`);
  }

  copyFileSync(sourcePath, outputPath);
  return outputPath;
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  const filePath = buildOpenApiBuiltJson();
  process.stdout.write(`Using ${filePath}\n`);
}
