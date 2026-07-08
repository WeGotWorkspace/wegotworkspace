#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputRoot = resolve(repoRoot, "dist/releases");

const version = resolveVersion();
const setupSource = resolve(repoRoot, "tools/setup-docker-install.sh");
const composeTemplate = resolve(repoRoot, "docker/install/docker-compose.release.yml");
const envExampleSource = resolve(repoRoot, "docker/install/.env.example");

const bundleDir = resolve(outputRoot, "docker-install-bundle");
const tarPath = resolve(outputRoot, `wgw-docker-install-${version}.tar.gz`);

ensureExists(setupSource, "setup script");
ensureExists(composeTemplate, "release compose template");
ensureExists(envExampleSource, "docker/install/.env.example");

mkdirSync(bundleDir, { recursive: true });
mkdirSync(outputRoot, { recursive: true });

const composeContent = readFileSync(composeTemplate, "utf8").replaceAll("__WGW_VERSION__", version);
writeFileSync(resolve(bundleDir, "docker-compose.yml"), composeContent);

const envExample = readFileSync(envExampleSource, "utf8");
const envWithImage = envExample.includes("WGW_IMAGE=")
  ? envExample.replace(
      /^# WGW_IMAGE=.*/m,
      `WGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:${version}`,
    )
  : `${envExample}\nWGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:${version}\n`;
writeFileSync(resolve(bundleDir, ".env.example"), envWithImage);

const setupContent = readFileSync(setupSource, "utf8");
writeFileSync(resolve(bundleDir, "setup.sh"), setupContent);
writeFileSync(resolve(bundleDir, "install"), setupContent);

for (const name of ["setup.sh", "install", "docker-compose.yml", ".env.example"]) {
  cpSync(resolve(bundleDir, name), resolve(outputRoot, name));
}

execFileSync("tar", ["-czf", tarPath, "-C", bundleDir, "."], { stdio: "inherit" });

console.log(`Docker install bundle written to ${outputRoot}`);
console.log("  install, setup.sh, docker-compose.yml, .env.example");
console.log(`  wgw-docker-install-${version}.tar.gz`);

function resolveVersion() {
  const fromEnv = process.env.WGW_RELEASE_VERSION?.trim();
  if (fromEnv) {
    return fromEnv.replace(/^v/, "");
  }
  const versionFile = resolve(repoRoot, "apps/wegotworkspace/VERSION");
  if (existsSync(versionFile)) {
    return readFileSync(versionFile, "utf8").trim();
  }
  throw new Error("Set WGW_RELEASE_VERSION or provide apps/wegotworkspace/VERSION");
}

function ensureExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}
