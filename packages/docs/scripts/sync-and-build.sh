#!/usr/bin/env bash
# packages/docs/scripts/sync-and-build.sh — ZIZIYI Office (https://github.com/baotlake/office-website) for SabreDAV.
# Licensed under AGPL-3.0 — keep upstream attribution and offer source to network users as required.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
APP_ROOT="$REPO_ROOT/apps/wegotworkspace"
UPSTREAM="$REPO_ROOT/tools/office-website"
OVERLAY="$REPO_ROOT/packages/docs/overlay"
PRIVATE_DIR_NAME="${SABRE_PRIVATE_DIR_NAME:-wgw-modules}"
RUNTIME_ROOT="$APP_ROOT"
if [[ -n "${SABRE_BUILD_DIR:-}" ]]; then
  if [[ "${SABRE_BUILD_DIR}" == /* ]]; then
    RUNTIME_ROOT="${SABRE_BUILD_DIR%/}"
  else
    RUNTIME_ROOT="$APP_ROOT/${SABRE_BUILD_DIR%/}"
  fi
fi
OUT_DEST="$RUNTIME_ROOT/$PRIVATE_DIR_NAME/docs/build"

OFFICE_BASE_PATH="${OFFICE_BASE_PATH:-/office}"

if [[ ! -f "$UPSTREAM/package.json" ]]; then
  echo "Cloning office-website into tools/office-website …"
  mkdir -p "$(dirname "$UPSTREAM")"
  git clone --depth 1 https://github.com/baotlake/office-website.git "$UPSTREAM"
fi

echo "Applying Sabre overlay from packages/docs/overlay/ …"
rsync -a "$OVERLAY/" "$UPSTREAM/"

cd "$UPSTREAM"
corepack enable
# This directory is under the monorepo root; without --ignore-workspace, pnpm
# installs only workspace packages and never creates ./node_modules here, so
# `next` is missing when the build script runs.
pnpm install --ignore-workspace
export OFFICE_BASE_PATH
export NEXT_PUBLIC_OFFICE_BASE_PATH="$OFFICE_BASE_PATH"
export NEXT_PUBLIC_APP_ROOT="${OFFICE_BASE_PATH}/v9.3.0.24-1"

pnpm build

node "$REPO_ROOT/packages/docs/patch-onlyoffice-service-worker.mjs" "$UPSTREAM/out/v9.3.0.24-1"

rm -rf "$OUT_DEST"
mkdir -p "$OUT_DEST"
cp -R "$UPSTREAM/out/"* "$OUT_DEST/"

echo "Done. Static export is in ${OUT_DEST}/ (URL prefix: ${OFFICE_BASE_PATH})."
