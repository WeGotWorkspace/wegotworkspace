#!/usr/bin/env node
/**
 * Publish vector app icons for UI and rasterize PWA install icons.
 *
 * Canonical source: `src/assets/app-icons/{app}.svg` — real vector SVG only.
 * Rejects SVG files that embed raster data (`<image`, `data:image`, `base64`).
 *
 * Output:
 *   - `public/app-icons/{app}.svg` — copied verbatim for UI
 *   - `public/app-icons/{app}-glyph.svg` — white glyph paths for switch-trigger CSS mask
 *   - `public/pwa-icons/{app}-{size}.png` — rasterized from vector SVG (manifest/favicon only)
 *
 * Optional: provide `{app}-glyph.svg` in source to override auto-extracted glyph paths.
 *
 * Requires ImageMagick (`magick`).
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageDir = join(__dirname, "..");
const publicDir = join(packageDir, "public");
const sourceDir = join(packageDir, "src", "assets", "app-icons");
const uiDir = join(publicDir, "app-icons");
const pwaDir = join(publicDir, "pwa-icons");

const WORKSPACE_APPS = ["admin", "contacts", "docs", "drive", "mail", "meet", "notes", "settings"];
const FUTURE_APPS = ["calendar", "reminders", "tasks"];
const ALL_APPS = [...WORKSPACE_APPS, ...FUTURE_APPS];
const PWA_SIZES = [180, 192, 512];

const RASTER_EMBED_RE =
  /<image\b|data:image|xlink:href\s*=\s*["']data:|href\s*=\s*["']data:image|base64/i;
const WHITE_FILL_RE = /fill\s*=\s*["'](#fff(?:fff)?|white)["']/i;

mkdirSync(sourceDir, { recursive: true });
mkdirSync(uiDir, { recursive: true });
mkdirSync(pwaDir, { recursive: true });

function assertVectorSvg(app, svgPath) {
  const markup = readFileSync(svgPath, "utf8");
  if (!/<svg[\s>]/i.test(markup)) {
    throw new Error(`${app}: not valid SVG markup (${svgPath})`);
  }
  if (RASTER_EMBED_RE.test(markup)) {
    throw new Error(`${app}: SVG embeds raster data — use vector paths only (${svgPath})`);
  }
  return markup;
}

/** Pull white-filled vector shapes from the full icon for CSS mask inversion. */
function extractWhiteGlyphSvg(fullMarkup) {
  const openTag = fullMarkup.match(/<svg[^>]*>/i)?.[0];
  if (!openTag) return null;

  const viewBox = openTag.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1] ?? "0 0 150 150";
  const inner = fullMarkup.replace(/^[\s\S]*?<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
  const whiteNodes = [];

  for (const tag of ["path", "circle", "rect", "ellipse", "polygon", "polyline", "g"]) {
    const re = new RegExp(`<${tag}\\b[^>]*>`, "gi");
    let match;
    while ((match = re.exec(inner)) !== null) {
      if (WHITE_FILL_RE.test(match[0])) whiteNodes.push(match[0]);
    }
  }

  if (whiteNodes.length === 0) return null;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">\n${whiteNodes.join("\n")}\n</svg>\n`;
}

let failed = false;

for (const app of ALL_APPS) {
  const srcSvg = join(sourceDir, `${app}.svg`);
  if (!existsSync(srcSvg)) {
    console.error(`Missing vector source: ${srcSvg}`);
    failed = true;
    continue;
  }

  let markup;
  try {
    markup = assertVectorSvg(app, srcSvg);
  } catch (err) {
    console.error(err.message);
    failed = true;
    continue;
  }

  const destSvg = join(uiDir, `${app}.svg`);
  copyFileSync(srcSvg, destSvg);

  const srcGlyph = join(sourceDir, `${app}-glyph.svg`);
  const destGlyph = join(uiDir, `${app}-glyph.svg`);
  if (existsSync(srcGlyph)) {
    assertVectorSvg(`${app}-glyph`, srcGlyph);
    copyFileSync(srcGlyph, destGlyph);
  } else {
    const extracted = extractWhiteGlyphSvg(markup);
    if (!extracted) {
      console.error(
        `${app}: no white vector paths found — add src/assets/app-icons/${app}-glyph.svg`,
      );
      failed = true;
      continue;
    }
    writeFileSync(destGlyph, extracted);
  }

  if (WORKSPACE_APPS.includes(app)) {
    for (const size of PWA_SIZES) {
      const dest = join(pwaDir, `${app}-${size}.png`);
      execFileSync("magick", [destSvg, "-filter", "Lanczos", "-resize", `${size}x${size}!`, dest], {
        stdio: "inherit",
      });
    }
  }

  for (const legacy of [`${app}.png`, `${app}-glyph.png`]) {
    rmSync(join(uiDir, legacy), { force: true });
  }

  console.log(`Published vector icon${WORKSPACE_APPS.includes(app) ? " + PWA" : ""} for ${app}`);
}

if (failed) {
  process.exit(1);
}
