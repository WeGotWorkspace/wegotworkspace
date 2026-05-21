#!/usr/bin/env node

import { build } from "vite";

const mode = process.env.WGW_VITE_WATCH_MODE || "development";
let buildCounter = 0;

await build({
  mode,
  build: {
    watch: {},
  },
  plugins: [
    {
      name: "wgw-dev-build-log",
      apply: "build",
      closeBundle() {
        buildCounter += 1;
        console.log(
          `[watch-dev-app-builds] Rebuilt packages/apps/dist (#${buildCounter}). PHP serves from monorepo paths; run pnpm dev:preview to sync into apps/wegotworkspace.`,
        );
      },
    },
  ],
});
