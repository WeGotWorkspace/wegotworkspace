#!/usr/bin/env bash
# Serve the built install tree via host Apache (no Docker), production-style.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=preview-server-common.sh
source "${SCRIPT_DIR}/preview-server-common.sh"

ROOT="$(preview_server_root)"
INSTALL_ROOT="${ROOT}/apps/wegotworkspace"
API_PUBLIC="${ROOT}/packages/api/public"
APPS_DIST="${ROOT}/packages/apps/dist"
PORT="$(preview_server_port)"
RUNTIME_DIR="$(preview_server_runtime_dir "${ROOT}")"
CONF="${RUNTIME_DIR}/apache-preview.conf"
PID_FILE="${RUNTIME_DIR}/apache-preview.pid"

HTTPD="$(preview_server_find_httpd || true)"
if [[ -z "${HTTPD}" ]]; then
  preview_server_print_apache_install_hint
  exit 1
fi

HTTPD_PREFIX="$(preview_server_httpd_prefix "${HTTPD}")"
HTTPD_MODULE_DIR="$(preview_server_httpd_module_dir "${HTTPD_PREFIX}" || true)"
if [[ -z "${HTTPD_MODULE_DIR}" ]]; then
  echo "[wgw-preview:apache] Could not locate Apache module directory." >&2
  echo "[wgw-preview:apache] Set WGW_HTTPD_PREFIX if auto-detection fails." >&2
  exit 1
fi

preview_server_ensure_htaccess "${INSTALL_ROOT}"
preview_server_migrate "${ROOT}"

PHP_MODULE="$(preview_server_find_php_module || true)"
PHP_MODE="proxy"
if [[ -n "${PHP_MODULE}" ]]; then
  PHP_MODE="mod_php"
fi

php_pid=""
apache_pid=""

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "${apache_pid}" ]] && kill -0 "${apache_pid}" 2>/dev/null; then
    kill -TERM "${apache_pid}" 2>/dev/null || true
    wait "${apache_pid}" 2>/dev/null || true
  fi
  if [[ -n "${php_pid}" ]] && kill -0 "${php_pid}" 2>/dev/null; then
    kill -TERM "${php_pid}" 2>/dev/null || true
    wait "${php_pid}" 2>/dev/null || true
  fi
  rm -f "${PID_FILE}"
}

trap cleanup EXIT INT TERM

if [[ "${PHP_MODE}" == "proxy" ]]; then
  echo "[wgw-preview:apache] libphp.so not found — proxying dynamic requests to PHP built-in server on :9080." >&2
  echo "[wgw-preview:apache] Install PHP's Apache module for full mod_php parity (e.g. libapache2-mod-php on Debian/Ubuntu, or httpd+php via Homebrew on macOS)." >&2
  bash "${ROOT}/packages/api/scripts/dev-php-server.sh" &
  php_pid=$!
  sleep 0.5
  if ! kill -0 "${php_pid}" 2>/dev/null; then
    echo "[wgw-preview:apache] Failed to start PHP built-in server on :9080." >&2
    exit 1
  fi
fi

php_module_line=""
if [[ "${PHP_MODE}" == "mod_php" ]]; then
  php_module_line="\"${PHP_MODULE}\""
fi

{
  echo "ServerRoot \"${HTTPD_PREFIX}\""
  echo "PidFile \"${PID_FILE}\""
  echo "ErrorLog \"${RUNTIME_DIR}/apache-main-error.log\""
  echo "ServerName 127.0.0.1"
  echo "Listen ${PORT}"
  echo "LoadModule mpm_prefork_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_mpm_prefork.so)"
  echo "LoadModule dir_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_dir.so)"
  echo "LoadModule mime_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_mime.so)"
  echo "LoadModule rewrite_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_rewrite.so)"
  echo "LoadModule alias_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_alias.so)"
  echo "LoadModule authz_core_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_authz_core.so)"
  echo "LoadModule unixd_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_unixd.so)"
  echo "LoadModule log_config_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_log_config.so)"
  echo "LoadModule env_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_env.so)"
  if [[ "${PHP_MODE}" == "proxy" ]]; then
    echo "LoadModule proxy_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_proxy.so)"
    echo "LoadModule proxy_http_module $(preview_server_httpd_module "${HTTPD_MODULE_DIR}" mod_proxy_http.so)"
  fi
  if [[ "${PHP_MODE}" == "mod_php" ]]; then
    echo "LoadModule php_module ${php_module_line}"
    echo "DirectoryIndex index.php"
    echo "<FilesMatch \\.php$>"
    echo "    SetHandler application/x-httpd-php"
    echo "</FilesMatch>"
  fi
  echo
  echo "# Adapted from docker/apache/vhost.conf (monorepo bind-mount layout)."
  echo "Alias /api ${API_PUBLIC}"
  echo "Alias /apps ${APPS_DIST}"
  echo "Alias /swagger ${API_PUBLIC}/swagger"
  echo
  echo "<Directory \"${INSTALL_ROOT}\">"
  echo "    Options -Indexes +FollowSymLinks"
  echo "    AllowOverride All"
  echo "    Require all granted"
  echo "</Directory>"
  echo
  echo "<Directory \"${API_PUBLIC}\">"
  echo "    Options -Indexes +FollowSymLinks"
  echo "    AllowOverride All"
  echo "    Require all granted"
  echo "</Directory>"
  echo
  echo "<Directory \"${APPS_DIST}\">"
  echo "    Options -Indexes +FollowSymLinks"
  echo "    AllowOverride None"
  echo "    Require all granted"
  echo "</Directory>"
  echo
  echo "LimitRequestBody 536870912"
  echo
  echo "<VirtualHost *:${PORT}>"
  echo "    ServerName 127.0.0.1"
  echo "    DocumentRoot \"${INSTALL_ROOT}\""
  if [[ "${PHP_MODE}" == "mod_php" ]]; then
    echo "    SetEnv WGW_APP_ROOT \"${INSTALL_ROOT}\""
  fi
  echo "    <IfModule mod_dir.c>"
  echo "        DirectoryIndex index.php"
  echo "    </IfModule>"
  if [[ "${PHP_MODE}" == "proxy" ]]; then
    echo "    ProxyPreserveHost On"
    echo "    ProxyPass / http://127.0.0.1:9080/"
    echo "    ProxyPassReverse / http://127.0.0.1:9080/"
  fi
  echo "    ErrorLog \"${RUNTIME_DIR}/apache-error.log\""
  echo "    CustomLog \"${RUNTIME_DIR}/apache-access.log\" common"
  echo "</VirtualHost>"
} >"${CONF}"

echo "[wgw-preview:apache] Serving install tree at http://127.0.0.1:${PORT}/ (${PHP_MODE})"
echo "[wgw-preview:apache] Config: ${CONF}"
echo "[wgw-preview:apache] Press Ctrl+C to stop."

"${HTTPD}" -f "${CONF}" -D FOREGROUND &
apache_pid=$!
wait "${apache_pid}"
