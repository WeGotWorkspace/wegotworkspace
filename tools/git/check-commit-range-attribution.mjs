#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  containsCursorAttribution,
  isCursorAgentAuthorEmail,
} from "./cursor-attribution.mjs";

const range = process.argv[2];
if (!range) {
  console.error("Usage: check-commit-range-attribution.mjs <git-rev-range>");
  process.exit(1);
}

if (/^0+$/.test(range.split("..")[0] ?? "")) {
  process.exit(0);
}

let logOutput = "";
try {
  logOutput = execFileSync(
    "git",
    ["log", "--format=%H%x1f%ae%x1f%B%x1e", range],
    { encoding: "utf8" },
  );
} catch {
  process.exit(0);
}

const entries = logOutput.split("\x1e").filter(Boolean);
const violations = [];

for (const entry of entries) {
  const separator = entry.indexOf("\x1f");
  if (separator === -1) {
    continue;
  }

  const rest = entry.slice(separator + 1);
  const emailSeparator = rest.indexOf("\x1f");
  if (emailSeparator === -1) {
    continue;
  }

  const sha = entry.slice(0, separator);
  const authorEmail = rest.slice(0, emailSeparator);
  const message = rest.slice(emailSeparator + 1);
  if (isCursorAgentAuthorEmail(authorEmail) || containsCursorAttribution(message)) {
    violations.push(sha.trim().slice(0, 12));
  }
}

if (violations.length > 0) {
  console.error(
    `Found Cursor attribution in ${violations.length} commit(s): ${violations.join(", ")}`,
  );
  console.error(
    "Use your own git author identity and remove Co-authored-by / Made-with Cursor trailers before merging.",
  );
  process.exit(1);
}
