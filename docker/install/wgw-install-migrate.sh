#!/bin/sh
set -eu

INSTALL_ROOT="${WGW_APP_ROOT:-/var/www/html}"
API_ROOT="${INSTALL_ROOT}/packages/api"
INSTALLED_LOCK="${INSTALL_ROOT}/wgw-content/.installed"

# shellcheck source=/dev/null
. /usr/local/bin/wgw-install-wait-db.sh

/usr/local/bin/wgw-install-seed-config.sh

if [ ! -f "$INSTALLED_LOCK" ]; then
  echo "[wgw-install-migrate] Fresh install (no ${INSTALLED_LOCK}); skipping schema migration."
  exit 0
fi

if [ ! -f "${API_ROOT}/artisan" ]; then
  echo "[wgw-install-migrate] Error: artisan not found at ${API_ROOT}/artisan" >&2
  exit 1
fi

echo "[wgw-install-migrate] Running wgw:schema-migrate..."
exec php "${API_ROOT}/artisan" wgw:schema-migrate
