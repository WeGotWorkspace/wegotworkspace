#!/usr/bin/env bash
# build.sh — Build the website Docker image.
#
# Usage:
#   ./build.sh [DS_VERSION] [HASH] [extra docker build args...]
#
# Examples:
#   ./build.sh                        # defaults: DS_VERSION=9.3.1, HASH=1
#   ./build.sh 9.3.1 2                  # bump HASH to bust asset cache
#   ./build.sh 9.3.0 1                  # upgrade to a new DocumentServer version
#   ./build.sh 9.3.1 1 --no-cache
#   ./build.sh 9.3.1 1 --push --tag my-registry/office-website:latest

set -euo pipefail

DS_VERSION="${1:-9.3.1}"
HASH="${2:-1}"
shift 2 2>/dev/null || true   # remaining args forwarded to docker build

echo "→ DocumentServer version : ${DS_VERSION}"
echo "→ Hash / revision        : ${HASH}"
echo "→ Asset directory        : /v${DS_VERSION}-${HASH}"

docker build \
  --build-arg "DS_VERSION=${DS_VERSION}" \
  --build-arg "HASH=${HASH}" \
  --tag "office-website:latest" \
  --tag "office-website:${DS_VERSION}-${HASH}" \
  "$@" \
  .

echo ""
echo "✓ Build complete."
echo "  Image tags:"
echo "    office-website:latest"
echo "    office-website:${DS_VERSION}-${HASH}"
echo ""
echo "  Run with:"
echo "    docker run -p 80:80 office-website:latest"
