#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { containsCursorAttribution } from "./cursor-attribution.mjs";

const file = process.argv[2];
if (!file) {
  process.exit(0);
}

const message = readFileSync(file, "utf8");
if (containsCursorAttribution(message)) {
  console.error(
    "Commit message must not include Cursor attribution trailers (Co-authored-by / Made-with).",
  );
  console.error("Disable Cursor Settings → Agents → Attribution, or use a normal git commit.");
  process.exit(1);
}
