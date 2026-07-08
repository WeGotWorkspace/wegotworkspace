#!/bin/sh
# Shared MySQL readiness probe for install entrypoint and migrator.
set -eu

if [ -z "${WGW_DB_HOST:-}" ] || [ "${WGW_WAIT_FOR_DB:-1}" = "0" ]; then
  return 0 2>/dev/null || exit 0
fi

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
    return 0 2>/dev/null || exit 0
  fi
  i=$((i + 1))
  sleep 2
done

echo "[wgw-install] Warning: MySQL not reachable after 120s; continuing anyway."
return 0 2>/dev/null || exit 0
