#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "${REPO_ROOT}" ]]; then
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
fi
APP_ROOT="${REPO_ROOT}/apps/wegotworkspace"
KEY_DIR="${APP_ROOT}/wgw-content/keys"
PRIV="${KEY_DIR}/api-jwt-private.pem"
PUB="${KEY_DIR}/api-jwt-public.pem"

mkdir -p "${KEY_DIR}"

if [[ -f "${PRIV}" || -f "${PUB}" ]]; then
  echo "Refusing to overwrite existing keys."
  echo "Delete these files first if you want to rotate:"
  echo "  ${PRIV}"
  echo "  ${PUB}"
  exit 1
fi

openssl genrsa -out "${PRIV}" 4096
openssl rsa -in "${PRIV}" -pubout -out "${PUB}"
chmod 600 "${PRIV}"
chmod 644 "${PUB}"

echo "Generated JWT keys:"
echo "  Private: ${PRIV}"
echo "  Public : ${PUB}"
