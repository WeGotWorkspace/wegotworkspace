#!/bin/sh
set -eu

INSTALL_ROOT="${WGW_APP_ROOT:-/var/www/html}"
API_ROOT="${INSTALL_ROOT}/packages/api"

if [ -n "${WGW_DB_HOST:-}" ] && [ "${WGW_WAIT_FOR_DB:-1}" != "0" ]; then
  DB_PORT="${WGW_DB_PORT:-3306}"
  echo "[wgw-install] Waiting for MySQL at ${WGW_DB_HOST}:${DB_PORT}..."
  i=0
  while [ "$i" -lt 60 ]; do
    if php -r "
      \$host = getenv('WGW_DB_HOST') ?: '';
      \$port = (int) (getenv('WGW_DB_PORT') ?: 3306);
      try {
        new PDO(
          'mysql:host=' . \$host . ';port=' . \$port,
          getenv('WGW_DB_USERNAME') ?: 'root',
          getenv('WGW_DB_PASSWORD') ?: '',
          [PDO::ATTR_TIMEOUT => 2]
        );
        exit(0);
      } catch (Throwable \$e) {
        exit(1);
      }
    "; then
      echo "[wgw-install] MySQL is ready."
      break
    fi
    i=$((i + 1))
    sleep 2
  done
  if [ "$i" -ge 60 ]; then
    echo "[wgw-install] Warning: MySQL not reachable after 120s; continuing anyway."
  fi
fi

# First-boot setup runs as root; Apache (www-data) serves requests afterward.
# Mirrors docker/apache/docker-entrypoint.sh and apps/wegotworkspace/bootstrap/WgwAppBootstrap.php.
if [ "$(id -u)" != "0" ]; then
  echo "[wgw-install] Warning: entrypoint is not root; runtime file setup may fail." >&2
fi

if [ ! -f "${INSTALL_ROOT}/wgw-config.php" ] && [ -f "${INSTALL_ROOT}/wgw-config.sample.php" ]; then
  cp "${INSTALL_ROOT}/wgw-config.sample.php" "${INSTALL_ROOT}/wgw-config.php"
  # cp runs as root; Apache serves as www-data and must overwrite this on install finish.
  if [ "$(id -u)" = "0" ]; then
    chown www-data:www-data "${INSTALL_ROOT}/wgw-config.php"
  fi
fi

if [ -f "${API_ROOT}/.env.example" ] && [ ! -f "${API_ROOT}/.env" ]; then
  cp "${API_ROOT}/.env.example" "${API_ROOT}/.env"
fi

if [ -f "${API_ROOT}/artisan" ] && [ -f "${API_ROOT}/.env" ]; then
  php "${API_ROOT}/artisan" key:generate --force --no-interaction >/dev/null 2>&1 || true
fi

mkdir -p \
  "${INSTALL_ROOT}/wgw-content" \
  "${API_ROOT}/storage/framework/cache" \
  "${API_ROOT}/storage/framework/sessions" \
  "${API_ROOT}/storage/framework/views" \
  "${API_ROOT}/storage/logs" \
  "${API_ROOT}/bootstrap/cache"

if [ "$(id -u)" = "0" ]; then
  chown -R www-data:www-data \
    "${INSTALL_ROOT}/wgw-content" \
    "${API_ROOT}/storage" \
    "${API_ROOT}/bootstrap/cache"

  for path in \
    "${API_ROOT}/.env" \
    "${INSTALL_ROOT}/wgw-config.php" \
    "${INSTALL_ROOT}/.htaccess"; do
    if [ -e "$path" ]; then
      chown www-data:www-data "$path"
    fi
  done

  # Non-recursive: lets www-data create .env / .htaccess when bootstrap runs before entrypoint re-runs.
  chown www-data:www-data "${INSTALL_ROOT}" "${API_ROOT}"
fi

echo "[wgw-install] Serving ${INSTALL_ROOT} (production install layout; vendor pre-baked in image)."

exec docker-php-entrypoint "$@"
