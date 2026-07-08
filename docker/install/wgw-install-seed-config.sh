#!/bin/sh
set -eu

# Seed install config into the named volume before web subpath file mounts.
# Docker creates directories (not files) when subpath targets are missing; the
# migrator mounts the full volume here and writes wgw-config.php + api.env first.

CONFIG_VOL="${WGW_CONFIG_VOL:-/wgw-config-vol}"
INSTALL_ROOT="${WGW_APP_ROOT:-/var/www/html}"
API_ROOT="${INSTALL_ROOT}/packages/api"

ensure_config_file() {
  target="$1"
  source="$2"
  label="$3"

  if [ -d "$target" ]; then
    echo "[wgw-install-seed] Removing invalid directory at ${label}" >&2
    rm -rf "$target"
  fi

  if [ -f "$target" ] && [ -s "$target" ]; then
    return 0
  fi

  if [ ! -f "$source" ]; then
    echo "[wgw-install-seed] Error: template missing: ${source}" >&2
    exit 1
  fi

  cp "$source" "$target"
  echo "[wgw-install-seed] Seeded ${label} from ${source}"
}

mkdir -p "$CONFIG_VOL"

ensure_config_file \
  "${CONFIG_VOL}/wgw-config.php" \
  "${INSTALL_ROOT}/wgw-config.sample.php" \
  "wgw-config.php"

ensure_config_file \
  "${CONFIG_VOL}/api.env" \
  "${API_ROOT}/.env.example" \
  "api.env"

# Remove mistaken copies from older entrypoints that copied into directory mounts.
for stray in "${CONFIG_VOL}/wgw-config.sample.php" "${CONFIG_VOL}/.env.example"; do
  if [ -f "$stray" ]; then
    rm -f "$stray"
  fi
done

if [ "$(id -u)" = "0" ]; then
  chown -R www-data:www-data "$CONFIG_VOL"
fi
