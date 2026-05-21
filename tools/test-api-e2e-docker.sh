#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${WGW_DOCKER_HTTP_PORT:-9080}"
BASE="http://127.0.0.1:${PORT}"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ ! -f packages/api/vendor/autoload.php ]; then
  echo "==> Installing Composer dependencies"
  composer --working-dir packages/api install --no-interaction --prefer-dist
fi

echo "==> Building UI dist (installer shell)"
pnpm --filter @wgw/apps run build:dev

echo "==> Starting Docker stack (compose.ci.yml)"
docker compose -f compose.ci.yml up -d --build --wait

cleanup() {
  docker compose -f compose.ci.yml down -v
}
trap cleanup EXIT

export WGW_API_E2E_NO_SERVER=1
export WGW_API_BASE_URL="${BASE}"
export WGW_INSTALL_BASE_URL="${BASE}"

echo "==> Playwright API e2e against ${BASE}"
pnpm --filter @wgw/api test:e2e
