#!/usr/bin/env node

import { build } from "vite";
import { syncRuntimeAppBuilds } from "./sync-runtime-app-builds.mjs";

const mode = process.env.WGW_VITE_WATCH_MODE || "development";
let buildCounter = 0;

await build({
  mode,
  build: {
    watch: {},
  },
  plugins: [
    {
      name: "wgw-runtime-sync-on-rebuild",
      apply: "build",
      closeBundle() {
        buildCounter += 1;
        try {
          syncRuntimeAppBuilds();
          console.log(
            `[watch-runtime-app-builds] Synced apps/wegotworkspace/packages/apps/*/dist after build #${buildCounter}.`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(
            `[watch-runtime-app-builds] Sync failed after build #${buildCounter}: ${message}`,
          );
        }
      },
    },
  ],
});
