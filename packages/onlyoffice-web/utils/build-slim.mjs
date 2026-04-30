import { access, readdir, rm } from "node:fs/promises";
import path from "node:path";

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getAppsRoots(outDir) {
  const roots = new Set();
  const directRoot = path.join(outDir, "web-apps", "apps");
  if (await pathExists(directRoot)) {
    roots.add(directRoot);
  }

  const entries = await readdir(outDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const nestedRoot = path.join(outDir, entry.name, "web-apps", "apps");
    if (await pathExists(nestedRoot)) {
      roots.add(nestedRoot);
    }
  }

  return [...roots];
}

async function getHelpDirs(appsRoot) {
  const helpDirs = [];
  const appEntries = await readdir(appsRoot, { withFileTypes: true });

  for (const appEntry of appEntries) {
    if (!appEntry.isDirectory()) {
      continue;
    }

    const helpDir = path.join(appsRoot, appEntry.name, "main", "resources", "help");
    if (await pathExists(helpDir)) {
      helpDirs.push(helpDir);
    }
  }

  return helpDirs;
}

async function removeAllHelp(helpDirs) {
  let removed = 0;

  for (const helpDir of helpDirs) {
    await rm(helpDir, { recursive: true, force: true });
    removed += 1;
    console.log(`Removed ${path.relative(process.cwd(), helpDir)}`);
  }

  return removed;
}

async function keepOnlyLocale(helpDirs, locale) {
  let removed = 0;

  for (const helpDir of helpDirs) {
    const entries = await readdir(helpDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (entry.name === locale) {
        continue;
      }

      const removeTarget = path.join(helpDir, entry.name);
      await rm(removeTarget, { recursive: true, force: true });
      removed += 1;
      console.log(`Removed ${path.relative(process.cwd(), removeTarget)}`);
    }
  }

  return removed;
}

async function main() {
  const args = process.argv.slice(2);
  const localeFlagIndex = args.indexOf("--locale");
  const locale = localeFlagIndex >= 0 ? args[localeFlagIndex + 1] : undefined;

  if (localeFlagIndex >= 0 && !locale) {
    console.error("Missing value for --locale (example: --locale en).");
    process.exit(1);
  }

  const outDir = path.join(process.cwd(), "out");
  if (!(await pathExists(outDir))) {
    console.error("No out directory found. Run build first.");
    process.exit(1);
  }

  const appsRoots = await getAppsRoots(outDir);
  if (appsRoots.length === 0) {
    console.log("No web-apps/apps directories found in out. Nothing to slim.");
    return;
  }

  const helpDirs = (
    await Promise.all(appsRoots.map((appsRoot) => getHelpDirs(appsRoot)))
  ).flat();

  if (helpDirs.length === 0) {
    console.log("No help directories found. Nothing to slim.");
    return;
  }

  if (locale) {
    const removed = await keepOnlyLocale(helpDirs, locale);
    console.log(
      `Done. Removed ${removed} help subfolders, kept only locale "${locale}".`,
    );
    return;
  }

  const removed = await removeAllHelp(helpDirs);
  console.log(`Done. Removed ${removed} help directories.`);
}

await main();
