#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  containsCursorAttribution,
  isCursorAgentAuthorEmail,
} from "./cursor-attribution.mjs";

function resolveAuthorEmail() {
  const fromEnv = process.env.GIT_AUTHOR_EMAIL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    const ident = execFileSync("git", ["var", "GIT_AUTHOR_IDENT"], {
      encoding: "utf8",
    }).trim();
    const match = ident.match(/<([^>]+)>$/);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

const file = process.argv[2];
if (!file) {
  process.exit(0);
}

const authorEmail = resolveAuthorEmail();
if (isCursorAgentAuthorEmail(authorEmail)) {
  console.error(
    `Commit author must not be Cursor Agent <${authorEmail}>.`,
  );
  console.error("Disable Cursor Settings → Agents → Attribution, or use a normal git commit.");
  process.exit(1);
}

const message = readFileSync(file, "utf8");
if (containsCursorAttribution(message)) {
  console.error(
    "Commit message must not include Cursor attribution trailers (Co-authored-by / Made-with).",
  );
  console.error("Disable Cursor Settings → Agents → Attribution, or use a normal git commit.");
  process.exit(1);
}
