#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
APP_ROOT="$REPO_ROOT/apps/wegotworkspace"
PRIVATE_DIR_NAME="${SABRE_PRIVATE_DIR_NAME:-wgw-modules}"
RUNTIME_ROOT="$APP_ROOT"

if [[ -n "${SABRE_BUILD_DIR:-}" ]]; then
  if [[ "${SABRE_BUILD_DIR}" == /* ]]; then
    RUNTIME_ROOT="${SABRE_BUILD_DIR%/}"
  else
    RUNTIME_ROOT="$APP_ROOT/${SABRE_BUILD_DIR%/}"
  fi
fi

OUT_DEST="$RUNTIME_ROOT/$PRIVATE_DIR_NAME/office/build"
OFFICE_BASE_PATH="${OFFICE_BASE_PATH:-/office}"
OFFICE_VERSION="${OFFICE_VERSION:-v9.3.0.24-1}"

cd "$REPO_ROOT/packages/onlyoffice-web"
export OFFICE_BASE_PATH
export NEXT_PUBLIC_APP_ROOT="${OFFICE_BASE_PATH}/${OFFICE_VERSION}"
export NEXT_PUBLIC_OFFICE_BASE_PATH="${OFFICE_BASE_PATH}"
pnpm run build:upstream
node utils/build-slim.mjs

rm -rf "$OUT_DEST"
mkdir -p "$OUT_DEST"
cp -R out/* "$OUT_DEST/"

echo "Done. ONLYOFFICE static export is in ${OUT_DEST}/ (URL prefix: ${OFFICE_BASE_PATH})."
