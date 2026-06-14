import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const sourcePath = path.resolve(packageRoot, "openapi/openapi.json");
const outputPath = path.resolve(packageRoot, "openapi/generated/openapi.built.json");

/**
 * Sync authoritative contract paths from openapi.json into openapi.built.json
 * while preserving enriched components.schemas used by TypeScript typegen.
 */
export function buildOpenApiBuiltJson() {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing OpenAPI source: ${sourcePath}`);
  }

  const source = JSON.parse(readFileSync(sourcePath, "utf8"));
  const existingBuilt = existsSync(outputPath)
    ? JSON.parse(readFileSync(outputPath, "utf8"))
    : null;

  const merged = {
    ...source,
    components: {
      ...(source.components ?? {}),
      securitySchemes:
        source.components?.securitySchemes ??
        existingBuilt?.components?.securitySchemes ??
        {},
      schemas: {
        ...(existingBuilt?.components?.schemas ?? {}),
        ...(source.components?.schemas ?? {}),
      },
    },
  };

  writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return outputPath;
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  const filePath = buildOpenApiBuiltJson();
  process.stdout.write(`Wrote ${filePath}\n`);
}
