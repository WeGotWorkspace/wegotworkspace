#!/usr/bin/env bash
# Shared helpers for host Apache/nginx preview (no Docker).
set -euo pipefail

preview_server_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

preview_server_ensure_htaccess() {
  local install_root="$1"
  if [[ ! -f "${install_root}/.htaccess" && -f "${install_root}/example.htaccess" ]]; then
    cp "${install_root}/example.htaccess" "${install_root}/.htaccess"
  fi
}

preview_server_port() {
  local raw="${WGW_VITE_PREVIEW_PORT:-4173}"
  if [[ ! "${raw}" =~ ^[0-9]+$ ]] || (( raw < 1 || raw > 65535 )); then
    echo "[wgw-preview] Ignoring invalid WGW_VITE_PREVIEW_PORT=${raw}; using 4173" >&2
    echo 4173
    return
  fi
  echo "${raw}"
}

preview_server_migrate() {
  local root="$1"
  (cd "${root}/packages/api" && php artisan wgw:schema-migrate)
}

preview_server_runtime_dir() {
  local root="$1"
  local dir="${root}/.wgw-preview"
  mkdir -p "${dir}"
  echo "${dir}"
}

preview_server_find_httpd() {
  if [[ -n "${WGW_HTTPD:-}" && -x "${WGW_HTTPD}" ]]; then
    echo "${WGW_HTTPD}"
    return 0
  fi
  if command -v httpd >/dev/null 2>&1; then
    command -v httpd
    return 0
  fi
  if command -v apache2 >/dev/null 2>&1; then
    command -v apache2
    return 0
  fi
  return 1
}

preview_server_find_nginx() {
  if [[ -n "${WGW_NGINX:-}" && -x "${WGW_NGINX}" ]]; then
    echo "${WGW_NGINX}"
    return 0
  fi
  if command -v nginx >/dev/null 2>&1; then
    command -v nginx
    return 0
  fi
  return 1
}

preview_server_httpd_prefix() {
  local httpd_bin="$1"
  if [[ -n "${WGW_HTTPD_PREFIX:-}" && -d "${WGW_HTTPD_PREFIX}" ]]; then
    echo "${WGW_HTTPD_PREFIX}"
    return 0
  fi
  local httpd_v from_v
  httpd_v="$("${httpd_bin}" -V 2>&1 || true)"
  from_v="$(sed -n 's/.*HTTPD_ROOT="\([^"]*\)".*/\1/p' <<<"${httpd_v}" | head -1)"
  if [[ -n "${from_v}" && -d "${from_v}" ]]; then
    echo "${from_v}"
    return 0
  fi
  from_v="$(sed -n 's/.*SERVER_CONFIG_FILE="\([^"]*\)".*/\1/p' <<<"${httpd_v}" | head -1)"
  if [[ -n "${from_v}" ]]; then
    local config_root
    config_root="$(cd "$(dirname "${from_v}")/.." && pwd)"
    if [[ -d "${config_root}" ]]; then
      echo "${config_root}"
      return 0
    fi
  fi
  dirname "$(dirname "${httpd_bin}")"
}

preview_server_nginx_prefix() {
  local nginx_bin="$1"
  if [[ -n "${WGW_NGINX_PREFIX:-}" && -d "${WGW_NGINX_PREFIX}" ]]; then
    echo "${WGW_NGINX_PREFIX}"
    return 0
  fi
  local from_v
  from_v="$("${nginx_bin}" -V 2>&1 | sed -n 's/.*--prefix=\([^ ]*\).*/\1/p' | head -1)"
  if [[ -n "${from_v}" && -d "${from_v}" ]]; then
    echo "${from_v}"
    return 0
  fi
  dirname "$(dirname "${nginx_bin}")"
}

preview_server_find_php_module() {
  if [[ -n "${WGW_PHP_MODULE:-}" && -f "${WGW_PHP_MODULE}" ]]; then
    echo "${WGW_PHP_MODULE}"
    return 0
  fi
  local candidates=(
    /opt/homebrew/lib/httpd/modules/libphp.so
    /usr/local/lib/httpd/modules/libphp.so
  )
  local module
  for module in "${candidates[@]}"; do
    if [[ -f "${module}" ]]; then
      echo "${module}"
      return 0
    fi
  done
  local pattern matches
  shopt -s nullglob
  for pattern in \
    /usr/lib/apache2/modules/libphp*.so \
    /usr/lib64/httpd/modules/libphp*.so \
    /usr/lib/httpd/modules/libphp*.so; do
    matches=(${pattern})
    if ((${#matches[@]} > 0)); then
      shopt -u nullglob
      echo "${matches[0]}"
      return 0
    fi
  done
  shopt -u nullglob
  return 1
}

preview_server_httpd_module() {
  local module_dir="$1"
  local name="$2"
  echo "${module_dir}/${name}"
}

preview_server_httpd_module_dir() {
  local httpd_prefix="$1"
  if [[ -n "${WGW_HTTPD_MODULE_DIR:-}" && -d "${WGW_HTTPD_MODULE_DIR}" ]]; then
    echo "${WGW_HTTPD_MODULE_DIR}"
    return 0
  fi
  local candidates=(
    "${httpd_prefix}/lib/httpd/modules"
    /usr/lib/apache2/modules
    /usr/lib64/httpd/modules
    /usr/lib/httpd/modules
  )
  local dir
  for dir in "${candidates[@]}"; do
    if [[ -d "${dir}" && -f "${dir}/mod_mime.so" ]]; then
      echo "${dir}"
      return 0
    fi
  done
  return 1
}

preview_server_find_mime_types() {
  local nginx_prefix="$1"
  if [[ -n "${WGW_NGINX_MIME_TYPES:-}" && -f "${WGW_NGINX_MIME_TYPES}" ]]; then
    echo "${WGW_NGINX_MIME_TYPES}"
    return 0
  fi
  if [[ -f "${nginx_prefix}/conf/mime.types" ]]; then
    echo "${nginx_prefix}/conf/mime.types"
    return 0
  fi
  if [[ -f /etc/nginx/mime.types ]]; then
    echo "/etc/nginx/mime.types"
    return 0
  fi
  return 1
}

preview_server_print_apache_install_hint() {
  cat >&2 <<'EOF'
Apache (httpd) is not installed or not on PATH.

Install httpd and PHP via your package manager, for example:
  macOS:         brew install httpd php
  Debian/Ubuntu: sudo apt install apache2 libapache2-mod-php

Or set WGW_HTTPD to the httpd binary path.

Start with: pnpm preview:apache
EOF
}

preview_server_print_nginx_install_hint() {
  cat >&2 <<'EOF'
nginx is not installed or not on PATH.

Install nginx via your package manager, for example:
  macOS:         brew install nginx
  Debian/Ubuntu: sudo apt install nginx

Or set WGW_NGINX to the nginx binary path.

Start with: pnpm preview:nginx
EOF
}
