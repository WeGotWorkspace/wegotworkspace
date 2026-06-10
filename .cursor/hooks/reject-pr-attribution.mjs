#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { containsCursorPrAttribution } from "../../tools/git/cursor-attribution.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = input.command ?? "";

/** Ignore gh pr substrings inside heredocs or quoted commit/PR bodies. */
function ghPrCommandPrefix(command) {
  const heredocStart = command.search(/<<-?\s*['"]?\w*['"]?/);
  const quoteStart = command.search(/['"]/);
  const cutAt = Math.min(
    heredocStart === -1 ? command.length : heredocStart,
    quoteStart === -1 ? command.length : quoteStart,
  );
  return command.slice(0, cutAt);
}

const ghPrPrefix = ghPrCommandPrefix(command);
if (!/\bgh\s+pr\s+(create|edit)\b/.test(ghPrPrefix)) {
  console.log(JSON.stringify({ permission: "allow" }));
  process.exit(0);
}

if (containsCursorPrAttribution(command)) {
  console.log(
    JSON.stringify({
      permission: "deny",
      user_message:
        "PR description cannot include Cursor attribution (e.g. \"Made with Cursor\"). Remove it before creating or editing the PR.",
      agent_message:
        "Do not add \"Made with Cursor\", \"Made-with: Cursor\", or Co-authored-by Cursor lines to PR descriptions. Strip attribution from --body before running gh pr create or gh pr edit.",
    }),
  );
  process.exit(0);
}

console.log(JSON.stringify({ permission: "allow" }));
