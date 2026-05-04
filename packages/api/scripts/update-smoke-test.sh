#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost}"
COOKIE_JAR="${2:-/tmp/wgw-update-smoke.cookies}"

echo "Smoke test target: ${BASE_URL}"
echo "This script expects an authenticated admin cookie in ${COOKIE_JAR}."
echo "Tip: log in via browser, export cookie, then rerun."

echo "0) Mint API v1 session token"
SESSION_JSON="$(curl -fsS -b "${COOKIE_JAR}" -H 'Accept: application/json' -X POST "${BASE_URL}/api/v1/auth/session")"
ACCESS_TOKEN="$(php -r '$d=json_decode($argv[1], true); if (!is_array($d) || !isset($d["access_token"])) { fwrite(STDERR, "missing access_token\n"); exit(1);} echo $d["access_token"];' "${SESSION_JSON}")"

api_get() {
  local path="$1"
  curl -fsS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H 'Accept: application/json' \
    "${BASE_URL}${path}"
}

echo "1) Read admin state"
api_get "/api/v1/admin/state" >/tmp/wgw-admin-state.json

echo "2) Read update state"
api_get "/api/v1/admin/updates/state" >/tmp/wgw-update-state.json

echo "3) Read updater log"
api_get "/api/v1/admin/updates/log" >/tmp/wgw-update-log.json

echo "Smoke checks completed. Output files:"
echo " - /tmp/wgw-admin-state.json"
echo " - /tmp/wgw-update-state.json"
echo " - /tmp/wgw-update-log.json"
