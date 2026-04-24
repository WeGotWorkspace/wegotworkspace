#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost}"
COOKIE_JAR="${2:-/tmp/wgw-update-smoke.cookies}"

echo "Smoke test target: ${BASE_URL}"
echo "This script expects an authenticated admin cookie in ${COOKIE_JAR}."
echo "Tip: log in via browser, export cookie, then rerun."

echo "1) Read admin state"
curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/admin/api/state" >/tmp/wgw-admin-state.json

echo "2) Read update state"
curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/admin/api/updates/state" >/tmp/wgw-update-state.json

echo "3) Read updater log"
curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/admin/api/updates/log" >/tmp/wgw-update-log.json

echo "Smoke checks completed. Output files:"
echo " - /tmp/wgw-admin-state.json"
echo " - /tmp/wgw-update-state.json"
echo " - /tmp/wgw-update-log.json"
