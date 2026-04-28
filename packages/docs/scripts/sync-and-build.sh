#!/usr/bin/env bash
# packages/docs/scripts/sync-and-build.sh — ONLYOFFICE editor shell + web-apps for SabreDAV.
# Licensed under AGPL-3.0 — keep upstream attribution and offer source to network users as required.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
APP_ROOT="$REPO_ROOT/apps/wegotworkspace"
UPSTREAM_UI="$REPO_ROOT/tools/office-website"
WEB_APPS_REPO="$REPO_ROOT/tools/onlyoffice-web-apps"
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
OFFICE_UI_REPO="${OFFICE_UI_REPO:-https://github.com/baotlake/office-website.git}"
OFFICE_UI_REF="${OFFICE_UI_REF:-main}"
ONLYOFFICE_WEB_APPS_REF="${ONLYOFFICE_WEB_APPS_REF:-master}"
ONLYOFFICE_BUNDLE_VERSION="${ONLYOFFICE_BUNDLE_VERSION:-v9.3.0.24-1}"
ONLYOFFICE_BUNDLE_DIR="$UPSTREAM_UI/public/$ONLYOFFICE_BUNDLE_VERSION"
ONLYOFFICE_WEB_APPS_DIR="$ONLYOFFICE_BUNDLE_DIR/web-apps"
ONLYOFFICE_ARTIFACT_BASE_URL="${ONLYOFFICE_ARTIFACT_BASE_URL:-https://office-editor.ziziyi.com/$ONLYOFFICE_BUNDLE_VERSION}"

if [[ -d "$UPSTREAM_UI/.git" ]]; then
  echo "Refreshing office shell checkout ($OFFICE_UI_REF) …"
  git -C "$UPSTREAM_UI" fetch --depth 1 origin "$OFFICE_UI_REF"
  git -C "$UPSTREAM_UI" checkout -q FETCH_HEAD
elif [[ -d "$UPSTREAM_UI" ]]; then
  if [[ -f "$UPSTREAM_UI/package.json" ]]; then
    echo "Using existing office shell checkout at tools/office-website …"
  else
    echo "Removing incomplete office shell checkout …"
    rm -rf "$UPSTREAM_UI"
    echo "Cloning office shell ($OFFICE_UI_REF) into tools/office-website …"
    mkdir -p "$(dirname "$UPSTREAM_UI")"
    git clone --depth 1 --branch "$OFFICE_UI_REF" "$OFFICE_UI_REPO" "$UPSTREAM_UI"
  fi
else
  echo "Cloning office shell ($OFFICE_UI_REF) into tools/office-website …"
  mkdir -p "$(dirname "$UPSTREAM_UI")"
  git clone --depth 1 --branch "$OFFICE_UI_REF" "$OFFICE_UI_REPO" "$UPSTREAM_UI"
fi

if [[ ! -f "$UPSTREAM_UI/package.json" ]]; then
  echo "Missing editor shell source at tools/office-website (no package.json after checkout)."
  echo "Set OFFICE_UI_REPO / OFFICE_UI_REF to a compatible Next.js shell and re-run."
  exit 1
fi

if [[ -d "$WEB_APPS_REPO/.git" ]]; then
  echo "Refreshing ONLYOFFICE web-apps checkout ($ONLYOFFICE_WEB_APPS_REF) …"
  git -C "$WEB_APPS_REPO" fetch --depth 1 origin "$ONLYOFFICE_WEB_APPS_REF"
  git -C "$WEB_APPS_REPO" checkout -q FETCH_HEAD
elif [[ -d "$WEB_APPS_REPO" ]]; then
  if [[ -f "$WEB_APPS_REPO/package.json" ]]; then
    echo "Using existing ONLYOFFICE web-apps checkout at tools/onlyoffice-web-apps …"
  else
    echo "Removing incomplete ONLYOFFICE web-apps checkout …"
    rm -rf "$WEB_APPS_REPO"
    echo "Cloning ONLYOFFICE web-apps into tools/onlyoffice-web-apps …"
    mkdir -p "$(dirname "$WEB_APPS_REPO")"
    git clone --depth 1 --branch "$ONLYOFFICE_WEB_APPS_REF" https://github.com/ONLYOFFICE/web-apps.git "$WEB_APPS_REPO"
  fi
else
  echo "Cloning ONLYOFFICE web-apps into tools/onlyoffice-web-apps …"
  mkdir -p "$(dirname "$WEB_APPS_REPO")"
  git clone --depth 1 --branch "$ONLYOFFICE_WEB_APPS_REF" https://github.com/ONLYOFFICE/web-apps.git "$WEB_APPS_REPO"
fi

echo "Syncing ONLYOFFICE web-apps (apps + vendor) into public/$ONLYOFFICE_BUNDLE_VERSION/web-apps …"
mkdir -p "$ONLYOFFICE_WEB_APPS_DIR"
rsync -a --delete "$WEB_APPS_REPO/apps/" "$ONLYOFFICE_WEB_APPS_DIR/apps/"
rsync -a --delete "$WEB_APPS_REPO/vendor/" "$ONLYOFFICE_WEB_APPS_DIR/vendor/"
# Compatibility paths used by upstream preload/runtime (absolute /office/apps/... and /office/sdkjs/...).
rsync -a --delete "$WEB_APPS_REPO/apps/" "$UPSTREAM_UI/public/apps/"
if [[ -d "$ONLYOFFICE_BUNDLE_DIR/sdkjs" ]]; then
  rsync -a --delete "$ONLYOFFICE_BUNDLE_DIR/sdkjs/" "$UPSTREAM_UI/public/sdkjs/"
fi

# Disable ONLYOFFICE service worker registration to avoid "Editor updated" reload loops in embedded mode.
for swjs in \
  "$ONLYOFFICE_WEB_APPS_DIR/apps/common/main/lib/util/docserviceworker.js" \
  "$UPSTREAM_UI/public/apps/common/main/lib/util/docserviceworker.js"
do
  if [[ -f "$swjs" ]]; then
    cat > "$swjs" <<'EOF'
+function registerServiceWorker() {
    // Disabled in Sabre packaging: SW update checks can trigger perpetual reload prompts.
    if (typeof window !== 'undefined' && typeof window.compareVersions !== 'function') {
        // ONLYOFFICE version-mismatch dialogs are guarded by "!window.compareVersions".
        window.compareVersions = function () { return 0; };
    }
}();
EOF
  fi
done

patch_server_version_guard() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  python3 - "$file" <<'PY'
import re
import sys
from pathlib import Path

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")
replacement = """onServerVersion: function(buildVersion) {\n                // Sabre embedding: do not force runtime reload loops on minor version drift.\n                return false;\n            },"""
ns, n = re.subn(
    r"onServerVersion:\s*function\(buildVersion\)\s*\{[\s\S]*?return false;\n\s*\},",
    replacement,
    s,
    count=1,
)
if n:
    p.write_text(ns, encoding="utf-8")
PY
}

for vcheck in \
  "$ONLYOFFICE_WEB_APPS_DIR/apps/documenteditor/main/app/controller/Main.js" \
  "$ONLYOFFICE_WEB_APPS_DIR/apps/documenteditor/forms/app/controller/ApplicationController.js" \
  "$UPSTREAM_UI/public/apps/documenteditor/main/app/controller/Main.js" \
  "$UPSTREAM_UI/public/apps/documenteditor/forms/app/controller/ApplicationController.js"
do
  patch_server_version_guard "$vcheck"
done

if [[ ! -f "$ONLYOFFICE_WEB_APPS_DIR/apps/api/documents/preload.html" ]]; then
  echo "Missing required ONLYOFFICE asset: $ONLYOFFICE_WEB_APPS_DIR/apps/api/documents/preload.html"
  exit 1
fi
if [[ ! -f "$ONLYOFFICE_WEB_APPS_DIR/vendor/jquery/jquery.min.js" ]]; then
  echo "Missing required ONLYOFFICE asset: $ONLYOFFICE_WEB_APPS_DIR/vendor/jquery/jquery.min.js"
  exit 1
fi
if [[ ! -f "$ONLYOFFICE_WEB_APPS_DIR/vendor/socketio/socket.io.min.js" ]]; then
  echo "Missing required ONLYOFFICE asset: $ONLYOFFICE_WEB_APPS_DIR/vendor/socketio/socket.io.min.js"
  exit 1
fi
if [[ ! -f "$ONLYOFFICE_WEB_APPS_DIR/apps/documenteditor/main/app.js" ]]; then
  echo "Missing required ONLYOFFICE asset: $ONLYOFFICE_WEB_APPS_DIR/apps/documenteditor/main/app.js"
  exit 1
fi

# Prefer deploy HTML variants from web-apps source. The plain index.html files in this repo are debug templates
# that expect sdkjs/develop and less runtime files which are absent in production.
for app in documenteditor spreadsheeteditor presentationeditor visioeditor; do
  d="$ONLYOFFICE_WEB_APPS_DIR/apps/$app/main"
  if [[ -f "$d/index.html.deploy" ]]; then
    cp "$d/index.html.deploy" "$d/index.html"
  fi
done

# web-apps v9.3 may request this high-DPI sprite, but some source bundles omit it.
DOC_FORMATS_SVG="$ONLYOFFICE_WEB_APPS_DIR/apps/common/main/resources/img/doc-formats/formats@2.5x.svg"
if [[ ! -f "$DOC_FORMATS_SVG" ]]; then
  mkdir -p "$(dirname "$DOC_FORMATS_SVG")"
  cat > "$DOC_FORMATS_SVG" <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1" preserveAspectRatio="none">
  <rect width="1" height="1" fill="transparent"/>
</svg>
EOF
fi

# Fetch prebuilt SDKJS + CSS artifacts when not provided locally.
mkdir -p "$ONLYOFFICE_BUNDLE_DIR/sdkjs"
fetch_if_missing() {
  local rel="$1"
  local dest="$ONLYOFFICE_BUNDLE_DIR/$rel"
  if [[ -f "$dest" ]]; then
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  local url="$ONLYOFFICE_ARTIFACT_BASE_URL/$rel"
  echo "Downloading missing ONLYOFFICE artifact: $rel"
  curl --fail --location --silent --show-error --output "$dest" "$url"
}

fetch_optional_if_missing() {
  local rel="$1"
  local dest="$ONLYOFFICE_BUNDLE_DIR/$rel"
  if [[ -f "$dest" ]]; then
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  local url="$ONLYOFFICE_ARTIFACT_BASE_URL/$rel"
  echo "Trying optional ONLYOFFICE artifact: $rel"
  if ! curl --fail --location --silent --show-error --output "$dest" "$url"; then
    rm -f "$dest"
    echo "Optional artifact unavailable: $rel"
  fi
}

fetch_if_missing "sdkjs/common/AllFonts.js"
fetch_optional_if_missing "sdkjs/common/device_scale.js"
fetch_optional_if_missing "sdkjs/vendor/string.js"
fetch_if_missing "sdkjs/word/sdk-all-min.js"
fetch_if_missing "sdkjs/word/sdk-all.js"
fetch_if_missing "sdkjs/cell/sdk-all-min.js"
fetch_if_missing "sdkjs/cell/sdk-all.js"
fetch_if_missing "sdkjs/cell/css/main.css"
fetch_if_missing "sdkjs/slide/sdk-all-min.js"
fetch_if_missing "sdkjs/slide/sdk-all.js"
fetch_if_missing "sdkjs/visio/sdk-all-min.js"
fetch_if_missing "sdkjs/visio/sdk-all.js"
fetch_if_missing "web-apps/apps/documenteditor/main/resources/css/app.css"
fetch_if_missing "web-apps/apps/spreadsheeteditor/main/resources/css/app.css"
fetch_if_missing "web-apps/apps/presentationeditor/main/resources/css/app.css"
fetch_if_missing "web-apps/apps/visioeditor/main/resources/css/app.css"

if [[ ! -f "$ONLYOFFICE_BUNDLE_DIR/sdkjs/word/sdk-all.js" ]]; then
  echo "Missing required SDKJS asset: $ONLYOFFICE_BUNDLE_DIR/sdkjs/word/sdk-all.js"
  echo "Provide a prebuilt SDKJS runtime or set ONLYOFFICE_ARTIFACT_BASE_URL to a source that serves it."
  exit 1
fi

if [[ ! -f "$ONLYOFFICE_BUNDLE_DIR/sdkjs/common/device_scale.js" ]]; then
  mkdir -p "$ONLYOFFICE_BUNDLE_DIR/sdkjs/common"
  cat > "$ONLYOFFICE_BUNDLE_DIR/sdkjs/common/device_scale.js" <<'EOF'
/* Fallback stub for ONLYOFFICE device_scale helper when not shipped in SDKJS bundle. */
(function () {
  if (typeof window === 'undefined') {
    return;
  }
  if (window.AscBrowser && typeof window.AscBrowser.checkZoom === 'function') {
    return;
  }
  window.AscBrowser = window.AscBrowser || {};
  if (typeof window.AscBrowser.checkZoom !== 'function') {
    window.AscBrowser.checkZoom = function () {
      return {
        zoom: 1,
        devicePixelRatio: window.devicePixelRatio || 1
      };
    };
  }
})();
EOF
fi

echo "Applying Sabre overlay from packages/docs/overlay/ …"
rsync -a "$OVERLAY/" "$UPSTREAM_UI/"

cd "$UPSTREAM_UI"
corepack enable
# This directory is under the monorepo root; without --ignore-workspace, pnpm
# installs only workspace packages and never creates ./node_modules here, so
# `next` is missing when the build script runs.
CI=1 pnpm install --ignore-workspace --force
export OFFICE_BASE_PATH
export NEXT_PUBLIC_OFFICE_BASE_PATH="$OFFICE_BASE_PATH"
export NEXT_PUBLIC_APP_ROOT="${OFFICE_BASE_PATH}/${ONLYOFFICE_BUNDLE_VERSION}"

pnpm build

node "$REPO_ROOT/packages/docs/patch-onlyoffice-service-worker.mjs" "$UPSTREAM_UI/out/$ONLYOFFICE_BUNDLE_VERSION"

rm -rf "$OUT_DEST"
mkdir -p "$OUT_DEST"
cp -R "$UPSTREAM_UI/out/"* "$OUT_DEST/"

echo "Done. Static export is in ${OUT_DEST}/ (URL prefix: ${OFFICE_BASE_PATH})."
