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

function extractGhPrBody(command) {
  const bodyFlag = command.match(/\b--body\b/);
  if (!bodyFlag) {
    return "";
  }

  const heredoc = command.match(/<<-?\s*['"]?EOF['"]?\s*\n([\s\S]*?)\nEOF\b/);
  if (heredoc) {
    return heredoc[1];
  }

  const fromBody = command.slice(bodyFlag.index + bodyFlag[0].length);
  const trimmed = fromBody.trimStart();

  if (trimmed.startsWith("<<")) {
    const heredoc = trimmed.match(/^<<-?\s*['"]?(\w*)['"]?\s*\n?([\s\S]*)$/);
    if (!heredoc) {
      return trimmed;
    }
    const marker = heredoc[1];
    if (marker) {
      const end = trimmed.indexOf(`\n${marker}`);
      return end === -1 ? trimmed : trimmed.slice(heredoc[0].length, end);
    }
    return heredoc[2];
  }

  const quote = trimmed[0];
  if (quote === '"' || quote === "'") {
    let body = "";
    let escaped = false;
    for (let i = 1; i < trimmed.length; i += 1) {
      const char = trimmed[i];
      if (escaped) {
        body += char;
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        return body;
      }
      body += char;
    }
    return body;
  }

  return trimmed.split(/\s+--/)[0] ?? trimmed;
}

const ghPrPrefix = ghPrCommandPrefix(command);
if (!/\bgh\s+pr\s+(create|edit)\b/.test(ghPrPrefix)) {
  console.log(JSON.stringify({ permission: "allow" }));
  process.exit(0);
}

const prBody = extractGhPrBody(command);
if (containsCursorPrAttribution(prBody)) {
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
