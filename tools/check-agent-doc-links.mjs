#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const agentsRoot = join(repoRoot, ".agents");

/** @param {string} dir */
function walkMarkdownFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkMarkdownFiles(full, results);
    } else if (entry.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

/** @param {string} content */
function extractMarkdownLinks(content) {
  const links = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(pattern)) {
    links.push(match[1].trim());
  }
  return links;
}

/** @param {string} target */
function isExternalLink(target) {
  return /^(https?:|mailto:|#)/.test(target);
}

/** @param {string} filePath @param {string} target */
function resolveLinkTarget(filePath, target) {
  const withoutAnchor = target.split("#")[0];
  if (withoutAnchor === "") {
    return null;
  }
  return resolve(dirname(filePath), withoutAnchor);
}

function main() {
  const files = walkMarkdownFiles(agentsRoot);
  /** @type {string[]} */
  const broken = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    for (const target of extractMarkdownLinks(content)) {
      if (isExternalLink(target)) {
        continue;
      }
      const resolved = resolveLinkTarget(filePath, target);
      if (resolved === null) {
        continue;
      }
      try {
        statSync(resolved);
      } catch {
        broken.push(`${relativePath(filePath)} → ${target}`);
      }
    }
  }

  if (broken.length > 0) {
    console.error("Broken relative links in .agents/**/*.md:\n");
    for (const line of broken) {
      console.error(`  - ${line}`);
    }
    process.exit(1);
  }

  console.log(`Agent doc link check passed (${files.length} markdown files).`);
}

/** @param {string} filePath */
function relativePath(filePath) {
  return filePath.startsWith(repoRoot + "/")
    ? filePath.slice(repoRoot.length + 1)
    : filePath;
}

main();
