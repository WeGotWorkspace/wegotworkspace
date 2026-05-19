#!/usr/bin/env node

import chokidar from "chokidar";
import { syncRuntimeApiPackage } from "./sync-runtime-api-package.mjs";

const watchPaths = ["openapi/**/*", "scripts/**/*", "docs/**/*", "package.json", "README.md"];

let syncing = false;
let queued = false;
let syncCount = 0;

async function runSync(reason) {
  if (syncing) {
    queued = true;
    return;
  }
  syncing = true;
  const startedAt = Date.now();
  try {
    syncRuntimeApiPackage();
    syncCount += 1;
    process.stdout.write(
      `[watch-runtime-api-package] Sync #${syncCount} done in ${Date.now() - startedAt}ms (${reason}).\n`,
    );
  } catch (error) {
    process.stderr.write(
      `[watch-runtime-api-package] Sync failed (${reason}): ${error instanceof Error ? error.message : String(error)}\n`,
    );
  } finally {
    syncing = false;
    if (queued) {
      queued = false;
      await runSync("queued");
    }
  }
}

await runSync("startup");

const watcher = chokidar.watch(watchPaths, {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 120,
    pollInterval: 30,
  },
});

watcher.on("all", (eventName, filePath) => {
  void runSync(`${eventName}:${filePath}`);
});

process.on("SIGINT", async () => {
  await watcher.close();
  process.exit(0);
});
