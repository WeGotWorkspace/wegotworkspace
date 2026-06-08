#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { stripCursorAttribution } from "./cursor-attribution.mjs";

const file = process.argv[2];
if (!file) {
  process.exit(0);
}

const original = readFileSync(file, "utf8");
const stripped = stripCursorAttribution(original);

if (stripped !== original) {
  writeFileSync(file, stripped, "utf8");
}
