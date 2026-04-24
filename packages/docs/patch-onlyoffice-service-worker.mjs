/**
 * ONLYOFFICE bundles hardcode serviceWorkerPath = location.origin + '/v9.3.0.24-1/…',
 * which breaks when the app is mounted under a subpath (e.g. /office/).
 * Resolve the worker script relative to the HTML document instead.
 */
import fs from "node:fs";
import path from "node:path";

const NEEDLE = "location.origin + '/v9.3.0.24-1/' + serviceWorkerName";
const REPLACEMENT =
  "new URL('../../../../document_editor_service_worker.js', location.href).href";

function walkHtml(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      walkHtml(p);
    } else if (name.name.endsWith(".html")) {
      let s = fs.readFileSync(p, "utf8");
      if (!s.includes(NEEDLE)) {
        continue;
      }
      const next = s.split(NEEDLE).join(REPLACEMENT);
      fs.writeFileSync(p, next);
      console.log("patched ONLYOFFICE SW path:", p);
    }
  }
}

const outV9 = process.argv[2];
if (!outV9 || !fs.existsSync(outV9)) {
  console.error("Usage: node patch-onlyoffice-service-worker.mjs <path-to/out/v9.3.0.24-1>");
  process.exit(1);
}
walkHtml(outV9);
