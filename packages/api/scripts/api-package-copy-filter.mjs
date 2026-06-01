import { basename } from "node:path";

/** Never ship removed greenfield paths (e.g. deleted packages/api/legacy/). */
const excludedDirNames = new Set(["legacy"]);

/** Laravel runtime dirs under storage/framework/ — ship structure + .gitignore only. */
const storageFrameworkRuntimeSegments = new Set([
  "cache",
  "sessions",
  "testing",
  "views",
]);

function relativePath(absolutePath, copyRoot) {
  return absolutePath.slice(copyRoot.length).replace(/^[/\\]+/, "");
}

function pathHasExcludedDir(relative) {
  if (relative === "") {
    return false;
  }
  return relative.split(/[/\\]/).some((segment) => excludedDirNames.has(segment));
}

function isGitignoreFile(relative) {
  return basename(relative) === ".gitignore";
}

function isStorageRuntimePath(relative) {
  const parts = relative.split(/[/\\]/);
  if (parts[0] !== "storage") {
    return false;
  }

  if (parts[1] === "logs" && parts.length > 2) {
    return !isGitignoreFile(relative);
  }

  if (
    parts[1] === "framework" &&
    parts[2] &&
    storageFrameworkRuntimeSegments.has(parts[2]) &&
    parts.length > 3
  ) {
    return !isGitignoreFile(relative);
  }

  if (parts[1] && parts[1].endsWith(".key")) {
    return true;
  }

  return false;
}

const releaseOnlyExcludedTopLevel = new Set([
  "node_modules",
  "tests",
  "e2e",
  "test-results",
]);

const releaseOnlyExcludedFiles = new Set([
  ".env",
  ".phpunit.result.cache",
  "phpunit.xml",
  "playwright.config.mjs",
  "database.sqlite",
]);

/**
 * cpSync filter for @wgw/api trees. Keeps Laravel storage scaffolding but skips
 * local runtime files (logs, compiled views, test fakes, secrets).
 */
export function createApiPackageCopyFilter(copyRoot, options = {}) {
  const forRelease = Boolean(options.forRelease);
  const includeEnv = Boolean(options.includeEnv);

  return (src) => {
    const relative = relativePath(src, copyRoot);
    if (relative === "") {
      return true;
    }

    if (pathHasExcludedDir(relative)) {
      return false;
    }

    if (isStorageRuntimePath(relative)) {
      return false;
    }

    const topLevel = relative.split(/[/\\]/)[0] ?? "";
    const fileName = basename(relative);

    if (!includeEnv && fileName === ".env") {
      return false;
    }

    if (forRelease) {
      if (releaseOnlyExcludedTopLevel.has(topLevel)) {
        return false;
      }
      if (releaseOnlyExcludedFiles.has(fileName)) {
        return false;
      }
      if (relative === "database/database.sqlite") {
        return false;
      }
    }

    return true;
  };
}
