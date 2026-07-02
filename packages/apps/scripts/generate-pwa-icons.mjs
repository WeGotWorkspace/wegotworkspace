#!/usr/bin/env node
/**
 * Regenerate PWA install icons from canonical UI artwork in public/app-icons/.
 * Requires ImageMagick (`magick`). UI icons are copied verbatim; only /pwa-icons/ is rasterized.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const uiDir = join(publicDir, "app-icons");
const pwaDir = join(publicDir, "pwa-icons");
const apps = ["admin", "contacts", "docs", "drive", "mail", "meet", "notes", "settings"];
const sizes = [180, 192, 512];

/** White glyph silhouette on transparent — used as CSS mask for switch trigger inversion. */
function generateGlyphMask(src, dest) {
  execFileSync(
    "magick",
    [src, "-colorspace", "Gray", "-threshold", "85%", "-transparent", "black", dest],
    { stdio: "inherit" },
  );
}

for (const app of apps) {
  const src = join(uiDir, `${app}.png`);
  if (!existsSync(src)) {
    console.error(`Missing UI icon: ${src}`);
    process.exitCode = 1;
    continue;
  }
  generateGlyphMask(src, join(uiDir, `${app}-glyph.png`));
  for (const size of sizes) {
    const dest = join(pwaDir, `${app}-${size}.png`);
    execFileSync("magick", [src, "-filter", "Lanczos", "-resize", `${size}x${size}!`, dest], {
      stdio: "inherit",
    });
  }
  console.log(`Generated PWA + glyph mask for ${app}`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
