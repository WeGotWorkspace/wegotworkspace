#!/usr/bin/env node

import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const clientAssetsDir = resolve(packageRoot, "dist", "client", "assets");
const runtimeModulesRoot = resolve(repoRoot, "apps", "wegotworkspace", "wgw-modules");

const modules = [
  { name: "admin", title: "Admin Console - WeGotWorkspace", assetDir: "assets" },
  { name: "drive", title: "Drive - WeGotWorkspace", assetDir: "assets" },
  { name: "install", title: "WeGotWorkspace Installer", assetDir: "assets" },
  { name: "mail", title: "Mail - WeGotWorkspace", assetDir: "assets" },
  { name: "notes", title: "Notes - WeGotWorkspace", assetDir: "assets" },
  { name: "settings", title: "Settings - WeGotWorkspace", assetDir: "assets" },
  { name: "voice", title: "Voice - WeGotWorkspace", assetDir: "assets" },
  { name: "home", title: "Home - WeGotWorkspace", assetDir: "home-assets" },
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
  const distRoot = resolve(runtimeModulesRoot, module.name, "dist");
  const targetAssetsDir = resolve(distRoot, module.assetDir);

  mkdirSync(distRoot, { recursive: true });
  rmSync(targetAssetsDir, { recursive: true, force: true });
  cpSync(clientAssetsDir, targetAssetsDir, { recursive: true });

  const html = renderIndexHtml({
    title: module.title,
    scriptPath: `./${module.assetDir}/${mainJs}`,
    cssPath: `./${module.assetDir}/${mainCss}`,
  });
  writeFileSync(resolve(distRoot, "index.html"), html, "utf8");
}

console.log(
  `Synced frontend runtime modules (${modules.map((m) => m.name).join(", ")}) using ${mainJs} and ${mainCss}.`
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
