import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdirSync } from "node:fs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const autoloadPath = path.resolve(packageRoot, "vendor/autoload.php");
const outputPath = path.resolve(packageRoot, "openapi/generated/openapi.built.json");

/**
 * Build the runtime OpenAPI document (with schema enrichment) to disk.
 */
export function buildOpenApiBuiltJson() {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  const phpSnippet = [
    "require getenv('WGW_AUTOLOAD');",
    "$doc = App\\Api\\OpenApiDocument::build('');",
    "$json = json_encode($doc, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);",
    "if (!is_string($json)) {",
    "  throw new RuntimeException('Could not encode OpenAPI document to JSON.');",
    "}",
    "file_put_contents(getenv('WGW_OUT'), $json . PHP_EOL);",
  ].join(" ");

  execFileSync("php", ["-r", phpSnippet], {
    cwd: packageRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      WGW_AUTOLOAD: autoloadPath,
      WGW_OUT: outputPath,
    },
  });

  return outputPath;
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  const filePath = buildOpenApiBuiltJson();
  process.stdout.write(`Wrote ${filePath}\n`);
}
