import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const sourcePath = path.resolve(packageRoot, "openapi/openapi.json");
const schemasDir = path.resolve(packageRoot, "openapi/schemas");
const outputPath = path.resolve(packageRoot, "openapi/generated/openapi.built.json");

function collectSchemaJsonFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSchemaJsonFiles(entryPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function loadModularSchemas() {
  const merged = {};

  for (const filePath of collectSchemaJsonFiles(schemasDir)) {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Modular schema file must be a JSON object: ${filePath}`);
    }

    for (const [name, schema] of Object.entries(parsed)) {
      if (Object.prototype.hasOwnProperty.call(merged, name)) {
        throw new Error(`Duplicate schema name "${name}" in ${filePath}`);
      }
      merged[name] = schema;
    }
  }

  return merged;
}

/**
 * Resolve the OpenAPI document used for TypeScript typegen.
 *
 * Contract-only mode: the enriched `openapi.built.json` is committed. The legacy
 * PHP `OpenApiDocument::build()` path was removed with the runtime.
 *
 * Modular schema fragments under `openapi/schemas/` are merged into
 * `components.schemas` on each build so domain types stay maintainable without
 * editing the monolithic built file by hand.
 */
export function buildOpenApiBuiltJson() {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  let baseDoc;
  if (existsSync(outputPath)) {
    baseDoc = JSON.parse(readFileSync(outputPath, "utf8"));
  } else if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, outputPath);
    baseDoc = JSON.parse(readFileSync(outputPath, "utf8"));
  } else {
    throw new Error(`Missing OpenAPI source: ${sourcePath}`);
  }

  const modularSchemas = loadModularSchemas();
  if (Object.keys(modularSchemas).length === 0) {
    return outputPath;
  }

  baseDoc.components ??= {};
  baseDoc.components.schemas ??= {};
  baseDoc.components.schemas = {
    ...baseDoc.components.schemas,
    ...modularSchemas,
  };

  writeFileSync(outputPath, `${JSON.stringify(baseDoc, null, 4)}\n`, "utf8");
  return outputPath;
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  const filePath = buildOpenApiBuiltJson();
  process.stdout.write(`Using ${filePath}\n`);
}
