#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${WGW_DEV_DOMAIN:-wegotworkspace.localhost}"
CERT_DIR="${ROOT}/docker/apache/certs"

mkdir -p "${CERT_DIR}"

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is required. Install: brew install mkcert && mkcert -install" >&2
  exit 1
fi

mkcert -install
mkcert \
  -cert-file "${CERT_DIR}/${DOMAIN}.pem" \
  -key-file "${CERT_DIR}/${DOMAIN}-key.pem" \
  "${DOMAIN}" localhost 127.0.0.1 ::1

echo ""
echo "Wrote:"
echo "  ${CERT_DIR}/${DOMAIN}.pem"
echo "  ${CERT_DIR}/${DOMAIN}-key.pem"
echo ""
echo "Add to /etc/hosts (once):"
echo "  127.0.0.1 ${DOMAIN}"
echo ""
echo "Then: docker compose -f compose.dev.yml up -d --build"
echo "Open: https://${DOMAIN}/"
