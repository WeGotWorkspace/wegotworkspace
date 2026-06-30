#!/usr/bin/env bash
# Serve the built install tree via host nginx + PHP built-in router (no Docker).
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
CONF="${RUNTIME_DIR}/nginx-preview.conf"
PID_FILE="${RUNTIME_DIR}/nginx-preview.pid"

NGINX="$(preview_server_find_nginx || true)"
if [[ -z "${NGINX}" ]]; then
  preview_server_print_nginx_install_hint
  exit 1
fi

NGINX_PREFIX="$(preview_server_nginx_prefix "${NGINX}")"
MIME_TYPES="$(preview_server_find_mime_types "${NGINX_PREFIX}" || true)"
if [[ -z "${MIME_TYPES}" ]]; then
  echo "[wgw-preview:nginx] mime.types not found (tried /etc/nginx/mime.types and ${NGINX_PREFIX}/conf/mime.types)." >&2
  echo "[wgw-preview:nginx] Set WGW_NGINX_PREFIX if auto-detection fails." >&2
  exit 1
fi

preview_server_ensure_htaccess "${INSTALL_ROOT}"
preview_server_migrate "${ROOT}"

php_pid=""
nginx_pid=""

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "${nginx_pid}" ]] && kill -0 "${nginx_pid}" 2>/dev/null; then
    "${NGINX}" -c "${CONF}" -s quit 2>/dev/null || kill -TERM "${nginx_pid}" 2>/dev/null || true
    wait "${nginx_pid}" 2>/dev/null || true
  fi
  if [[ -n "${php_pid}" ]] && kill -0 "${php_pid}" 2>/dev/null; then
    kill -TERM "${php_pid}" 2>/dev/null || true
    wait "${php_pid}" 2>/dev/null || true
  fi
  rm -f "${PID_FILE}"
}

trap cleanup EXIT INT TERM

bash "${ROOT}/packages/api/scripts/dev-php-server.sh" &
php_pid=$!
sleep 0.5
if ! kill -0 "${php_pid}" 2>/dev/null; then
  echo "[wgw-preview:nginx] Failed to start PHP built-in server on :9080." >&2
  exit 1
fi

{
  cat <<EOF
worker_processes 1;
error_log "${RUNTIME_DIR}/nginx-error.log";
pid "${PID_FILE}";

events {
    worker_connections 64;
}

http {
    include       ${MIME_TYPES};
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;
    client_max_body_size 512m;
    types {
        application/wasm wasm;
    }

    server {
        listen ${PORT};
        server_name 127.0.0.1 localhost;
        root ${INSTALL_ROOT};
        index index.php;

        # Mirror install-root .htaccess deny rules.
        location ~ ^/(wgw-modules|wgw-private|wgw-content|wgw-src|src|resources|vendor|scripts|patches|config|public|packages)(/|$) {
            return 403;
        }
        location ~ ^/(composer\.(json|lock)|package\.json|wgw-config(\.sample)?\.php|\.env)$ {
            return 403;
        }

        location ^~ /api/ {
            proxy_pass http://127.0.0.1:9080;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header Authorization \$http_authorization;
        }

        location ^~ /swagger/ {
            alias ${API_PUBLIC}/swagger/;
        }

        location ^~ /apps/ {
            alias ${APPS_DIST}/;
        }

        location / {
            try_files \$uri \$uri/ @php;
        }

        location @php {
            proxy_pass http://127.0.0.1:9080;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header Authorization \$http_authorization;
        }
    }
}
EOF
} >"${CONF}"

echo "[wgw-preview:nginx] UI at http://127.0.0.1:${PORT}/ (nginx → PHP :9080)"
echo "[wgw-preview:nginx] Config: ${CONF}"
echo "[wgw-preview:nginx] Press Ctrl+C to stop."

"${NGINX}" -c "${CONF}" -g "daemon off;" &
nginx_pid=$!
wait "${nginx_pid}"
