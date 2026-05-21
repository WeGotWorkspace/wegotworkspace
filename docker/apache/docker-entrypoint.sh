#!/bin/sh
set -eu

INSTALL_ROOT="${WGW_APP_ROOT:-/var/www/install}"
API_ROOT="/var/www/packages/api"

if [ ! -f "${INSTALL_ROOT}/wgw-config.php" ] && [ -f "${INSTALL_ROOT}/wgw-config.sample.php" ]; then
  cp "${INSTALL_ROOT}/wgw-config.sample.php" "${INSTALL_ROOT}/wgw-config.php"
fi

if [ -f "${API_ROOT}/composer.json" ] && [ ! -f "${API_ROOT}/vendor/autoload.php" ]; then
  composer install --working-dir="${API_ROOT}" --no-interaction --prefer-dist
fi

mkdir -p "${INSTALL_ROOT}/wgw-content" "${API_ROOT}/storage/framework/cache" "${API_ROOT}/storage/logs"
chown -R www-data:www-data "${INSTALL_ROOT}/wgw-content" "${API_ROOT}/storage" 2>/dev/null || true

exec docker-php-entrypoint "$@"
