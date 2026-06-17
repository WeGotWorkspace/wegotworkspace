#!/usr/bin/env bash
# Generate RS256 JWT signing keys for host PHP dev (packages/api/.env paths).
set -euo pipefail

API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_DIR="${API_DIR}/storage/app/jwt"
PRIVATE="${KEY_DIR}/api-jwt-private.pem"
PUBLIC="${KEY_DIR}/api-jwt-public.pem"
if [[ -r "$PRIVATE" && -r "$PUBLIC" ]]; then
  echo "JWT keys already exist:"
  echo "  $PRIVATE"
  echo "  $PUBLIC"
  exit 0
fi

mkdir -p "$KEY_DIR"
chmod 700 "$KEY_DIR"

openssl genrsa -out "$PRIVATE" 2048
openssl rsa -in "$PRIVATE" -pubout -out "$PUBLIC"
chmod 600 "$PRIVATE"
chmod 644 "$PUBLIC"

echo "Generated JWT keys:"
echo "  $PRIVATE"
echo "  $PUBLIC"
echo
echo "Add to packages/api/.env (paths relative to install root apps/wegotworkspace):"
echo "  WGW_API_JWT_PRIVATE_KEY_PATH=../../packages/api/storage/app/jwt/api-jwt-private.pem"
echo "  WGW_API_JWT_PUBLIC_KEY_PATH=../../packages/api/storage/app/jwt/api-jwt-public.pem"
