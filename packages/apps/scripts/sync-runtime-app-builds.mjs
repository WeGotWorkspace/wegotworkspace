#!/usr/bin/env node

import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const clientAssetsDir = resolve(packageRoot, "dist", "client", "assets");
const clientFontsDir = resolve(packageRoot, "dist", "client", "fonts");
const clientIconsDir = resolve(packageRoot, "dist", "client", "icons");
const clientManifestsDir = resolve(packageRoot, "dist", "client", "manifests");
const runtimeAppsRoot = resolve(repoRoot, "apps", "wegotworkspace", "packages", "apps");

const modules = [
  { name: "shell", title: "WeGotWorkspace", assetDir: "assets" },
  { name: "admin", title: "Admin Console - WeGotWorkspace", assetDir: "assets" },
  { name: "drive", title: "Drive - WeGotWorkspace", assetDir: "assets" },
  { name: "install", title: "WeGotWorkspace Installer", assetDir: "assets" },
  { name: "mail", title: "Mail - WeGotWorkspace", assetDir: "assets" },
  { name: "notes", title: "Notes - WeGotWorkspace", assetDir: "assets" },
  { name: "settings", title: "Settings - WeGotWorkspace", assetDir: "assets" },
  { name: "voice", title: "Voice - WeGotWorkspace", assetDir: "assets" },
];

const files = readdirSync(clientAssetsDir);
const mainJs = pickLargestFile(files, /^index-.*\.js$/);
const mainCss = pickLargestFile(files, /^styles-.*\.css$/);

if (!mainJs || !mainCss) {
  throw new Error(
    `Could not determine main app entry files in ${clientAssetsDir}. Found index js=${String(mainJs)}, css=${String(mainCss)}`
  );
}

for (const module of modules) {
  const distRoot = resolve(runtimeAppsRoot, module.name, "dist");
  const targetAssetsDir = resolve(distRoot, module.assetDir);
  const targetMainJsPath = resolve(targetAssetsDir, mainJs);

  mkdirSync(distRoot, { recursive: true });
  rmSync(resolve(distRoot, "assets"), { recursive: true, force: true });
  rmSync(resolve(distRoot, "fonts"), { recursive: true, force: true });
  rmSync(resolve(distRoot, "icons"), { recursive: true, force: true });
  rmSync(resolve(distRoot, "manifests"), { recursive: true, force: true });
  rmSync(targetAssetsDir, { recursive: true, force: true });
  cpSync(clientAssetsDir, targetAssetsDir, { recursive: true });
  cpSync(clientFontsDir, resolve(distRoot, "fonts"), { recursive: true });
  cpSync(clientIconsDir, resolve(distRoot, "icons"), { recursive: true });
  cpSync(clientManifestsDir, resolve(distRoot, "manifests"), { recursive: true });

  // Static LAMP runtime serves plain index.html without SSR payload.
  // TanStack Start entry must run in pure client mode here.
  patchStaticRuntimeEntry(targetMainJsPath);

  const html = renderIndexHtml({
    title: module.title,
    scriptPath: `./${module.assetDir}/${mainJs}`,
    cssPath: `./${module.assetDir}/${mainCss}`,
  });
  writeFileSync(resolve(distRoot, "index.html"), html, "utf8");
}

console.log(
  `Synced frontend runtime app builds (${modules.map((m) => m.name).join(", ")}) using ${mainJs} and ${mainCss}.`
);

function pickLargestFile(allFiles, pattern) {
  const matches = allFiles.filter((file) => pattern.test(file));
  if (matches.length === 0) return null;
  return matches
    .map((file) => ({ file, size: statSync(resolve(clientAssetsDir, file)).size }))
    .sort((a, b) => b.size - a.size)[0]?.file;
}

function renderIndexHtml({ title, scriptPath, cssPath }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <script type="module" crossorigin src="${scriptPath}"></script>
    <link rel="stylesheet" crossorigin href="${cssPath}">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
}

function patchStaticRuntimeEntry(filePath) {
  const source = readFileSync(filePath, "utf8");
  const withoutHydrateSsr = source
    .replace(
      "if (!router.stores.matchesId.get().length) await hydrate(router);",
      "/* static lamp: skip SSR hydration */",
    )
    .replace(
      /\.stores\.matchesId\.get\(\)\.length\|\|await [A-Za-z$_][\w$]*\([^)]*\)/,
      ".stores.matchesId.get().length||void 0",
    );
  // Static runtime can be hosted under subpaths (for example /files/drive/).
  // Vite may emit absolute CSS hrefs in JS chunks; rewrite them to relative.
  const withRelativeAssetLinks = withoutHydrateSsr.replace(
    /(["'])\/assets\//g,
    "$1./assets/",
  );
  const clientRendered = withRelativeAssetLinks
    .replace(
      /clientExports\.hydrateRoot\(\s*document,\s*/,
      "clientExports.createRoot(document).render(",
    )
    .replace(/\.hydrateRoot\(\s*document,\s*/, ".createRoot(document).render(");
  if (clientRendered === source) {
    throw new Error(`Could not patch static runtime entry: ${filePath}`);
  }
  writeFileSync(filePath, clientRendered, "utf8");
}
