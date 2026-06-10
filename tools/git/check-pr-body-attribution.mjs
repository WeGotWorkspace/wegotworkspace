#!/usr/bin/env node

import { containsCursorPrAttribution } from "./cursor-attribution.mjs";

const body = process.argv[2] ?? process.env.PR_BODY ?? "";

if (containsCursorPrAttribution(body)) {
  console.error(
    "Pull request description must not include Cursor attribution (e.g. \"Made with Cursor\").",
  );
  console.error(
    "Remove attribution from the PR body, or disable Cursor Settings → Agents → Attribution → PR Attribution.",
  );
  process.exit(1);
}
