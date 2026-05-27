#!/usr/bin/env node

import { createHash, createSign } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const appRoot = resolve(repoRoot, "apps/wegotworkspace");
const outputRoot = resolve(repoRoot, "dist/releases");
const stagingRoot = resolve(outputRoot, "wgw-plugin-onlyoffice");

const pluginId = "onlyoffice";
const pluginName = "ONLYOFFICE";
const version = resolveVersion();

const runtimeOfficeBuild = resolve(appRoot, "packages/apps/office/build");
const pluginRuntimeRoot = resolve(stagingRoot, `wgw-plugins/${pluginId}`);
const pluginAssetsRoot = resolve(pluginRuntimeRoot, "assets");
const pluginManifestPath = resolve(pluginRuntimeRoot, "plugin.json");

const packageName = `wgw-plugin-${pluginId}-${version}.zip`;
const packagePath = resolve(outputRoot, packageName);
const manifestPath = resolve(outputRoot, `wgw-plugin-${pluginId}-manifest.json`);
const signaturePath = resolve(outputRoot, `wgw-plugin-${pluginId}-manifest.sig`);

if (process.env.WGW_PLUGIN_SKIP_BUILD !== "1") {
  execFileSync("pnpm", ["--filter", "@wgw/onlyoffice-web", "build"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

if (!existsSync(runtimeOfficeBuild)) {
  throw new Error(`Missing ONLYOFFICE runtime build: ${relative(repoRoot, runtimeOfficeBuild)}`);
}

ensureDir(outputRoot);
rmSafe(stagingRoot);
ensureDir(pluginAssetsRoot);
cpSync(runtimeOfficeBuild, pluginAssetsRoot, { recursive: true });

const pluginManifest = {
  id: pluginId,
  name: pluginName,
  active: true,
  source: "runtime",
  appTile: {
    id: "office",
    label: "Office",
    route: "/office",
    icon: "file-text",
  },
  drive: {
    openFileExtensions: ["docx", "xlsx", "pptx"],
    openFileRoute: "/office/editor",
    openFileQueryParam: "file",
    newFileTemplates: [
      { id: "onlyoffice-docx", label: "New document", kind: "doc", queryValue: "docx" },
      { id: "onlyoffice-xlsx", label: "New spreadsheet", kind: "sheet", queryValue: "xlsx" },
      { id: "onlyoffice-pptx", label: "New presentation", kind: "slides", queryValue: "pptx" },
    ],
  },
  office: {
    saveTransport: "webdav+api",
    saveApiPath: "/api/v1/office/documents",
  },
};

writeFileSync(pluginManifestPath, `${JSON.stringify(pluginManifest, null, 2)}\n`, "utf8");

zipDirectory(stagingRoot, packagePath);
const checksum = sha256File(packagePath);

let checksumSignature = "";
const privateKey = process.env.WGW_RELEASE_SIGNING_PRIVATE_KEY?.trim() ?? "";
if (privateKey !== "") {
  const checksumSigner = createSign("RSA-SHA256");
  checksumSigner.update(checksum);
  checksumSigner.end();
  checksumSignature = checksumSigner.sign(privateKey).toString("base64");
}

const releaseManifest = {
  name: `wgw-plugin-${pluginId}`,
  plugin_id: pluginId,
  version,
  package_name: packageName,
  package_url: "",
  checksum_sha256: checksum,
  checksum_signature: checksumSignature,
  released_at: new Date().toISOString(),
  source_repo: "https://github.com/woutervroege/onlyoffice-web",
};
const releaseManifestContent = `${JSON.stringify(releaseManifest, null, 2)}\n`;
writeFileSync(manifestPath, releaseManifestContent, "utf8");

if (privateKey !== "") {
  const signer = createSign("RSA-SHA256");
  signer.update(releaseManifestContent);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64");
  writeFileSync(signaturePath, `${signature}\n`, "utf8");
}

rmSafe(stagingRoot);
console.log(`ONLYOFFICE plugin assets written to ${relative(repoRoot, outputRoot)}`);

function resolveVersion() {
  const fromEnv = process.env.WGW_RELEASE_VERSION?.trim();
  if (fromEnv) return normalizeVersion(fromEnv);
  const versionFile = resolve(appRoot, "VERSION");
  if (!existsSync(versionFile)) {
    throw new Error("apps/wegotworkspace/VERSION is missing");
  }
  const fromFile = readFileSync(versionFile, "utf8").trim();
  if (!fromFile) {
    throw new Error("apps/wegotworkspace/VERSION is empty");
  }
  return normalizeVersion(fromFile);
}

function normalizeVersion(version) {
  const trimmed = version.trim();
  return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function rmSafe(path) {
  try {
    execFileSync("rm", ["-rf", path], { stdio: "ignore" });
  } catch {
    // no-op
  }
}

function zipDirectory(sourceDir, outputZip) {
  rmSafe(outputZip);
  execFileSync("zip", ["-rq", outputZip, "."], {
    cwd: sourceDir,
    stdio: "inherit",
  });
}

function sha256File(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

