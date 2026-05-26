#!/usr/bin/env bash
# Smoke-test document collab API (signaling + markdown/Yjs sidecar) against local Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$ROOT/.env.local"

PROXY_TARGET="${WGW_PROXY_TARGET:-https://wegotworkspace.local}"
USERNAME="${WGW_DEV_USERNAME:-${VITE_WGW_DEV_USERNAME:-admin}}"
PASSWORD="${WGW_DEV_PASSWORD:-${VITE_WGW_DEV_PASSWORD:-storybook-dev}}"
SIGNAL_ROOM="${COLLAB_SIGNAL_ROOM:-docs/test-together.md}"
DOC_ROOM="${COLLAB_DOC_ROOM:-/users/admin/docs/test-together.md}"

RUN_SIGNALING=1
RUN_DOCUMENT=1
VERBOSE=0

usage() {
  cat <<'EOF'
Usage: tools/test-collab-api.sh [options]

Smoke-test /api/v1/collab/* (join/poll/leave + document GET/PUT) on the local install.

Reads defaults from repo-root .env.local when present:
  WGW_PROXY_TARGET, VITE_WGW_DEV_USERNAME, VITE_WGW_DEV_PASSWORD

Options:
  --base URL          API origin (default: WGW_PROXY_TARGET or https://wegotworkspace.local)
  --user NAME         Login username (default: admin)
  --password PASS     Login password (default: storybook-dev)
  --signal-room ID    Signaling room id (default: docs/test-together.md)
  --doc-room PATH     Drive path for document API (default: /users/admin/docs/test-together.md)
  --signaling-only    Run Phase 1 only
  --document-only     Run Phase 2 only (requires TOKEN or runs auth first)
  --verbose           Print curl commands
  -h, --help          Show this help

Examples:
  pnpm test:collab-api
  WGW_PROXY_TARGET=https://wegotworkspace.local tools/test-collab-api.sh
  tools/test-collab-api.sh --document-only
EOF
}

load_env_local() {
  [[ -f "$ENV_LOCAL" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -n "$line" ]] || continue
    case "$line" in
      WGW_PROXY_TARGET=*|VITE_WGW_DEV_USERNAME=*|VITE_WGW_DEV_PASSWORD=*|COLLAB_*=*)
        export "$line"
        ;;
    esac
  done <"$ENV_LOCAL"
}

normalize_base() {
  local origin="${1%/}"
  if [[ "$origin" == */api/v1 ]]; then
    printf '%s' "$origin"
  else
    printf '%s/api/v1' "$origin"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      PROXY_TARGET="$2"
      shift 2
      ;;
    --user)
      USERNAME="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
      shift 2
      ;;
    --signal-room)
      SIGNAL_ROOM="$2"
      shift 2
      ;;
    --doc-room)
      DOC_ROOM="$2"
      shift 2
      ;;
    --signaling-only)
      RUN_SIGNALING=1
      RUN_DOCUMENT=0
      shift
      ;;
    --document-only)
      RUN_SIGNALING=0
      RUN_DOCUMENT=1
      shift
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

load_env_local
PROXY_TARGET="${WGW_PROXY_TARGET:-$PROXY_TARGET}"
USERNAME="${WGW_DEV_USERNAME:-${VITE_WGW_DEV_USERNAME:-$USERNAME}}"
PASSWORD="${WGW_DEV_PASSWORD:-${VITE_WGW_DEV_PASSWORD:-$PASSWORD}}"

BASE="$(normalize_base "$PROXY_TARGET")"
CURL=(curl -sS)
if [[ "$BASE" == https://* ]]; then
  CURL+=(-k)
fi

log() {
  printf '\n==> %s\n' "$*"
}

run_curl() {
  if [[ "$VERBOSE" -eq 1 ]]; then
    printf '+ curl'
    for arg in "${CURL[@]}"; do printf ' %q' "$arg"; done
    for arg in "$@"; do printf ' %q' "$arg"; done
    printf '\n'
  fi
  "${CURL[@]}" "$@"
}

require_python() {
  command -v python3 >/dev/null 2>&1 || {
    echo "python3 is required for JSON parsing." >&2
    exit 1
  }
}

json_get() {
  local key="$1"
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[sys.argv[1]])' "$key"
}

check_http() {
  local code="$1"
  local expect="$2"
  local label="$3"
  if [[ "$code" != "$expect" ]]; then
    echo "FAIL: $label (expected HTTP $expect, got $code)" >&2
    exit 1
  fi
}

log "Config"
echo "  BASE=$BASE"
echo "  USER=$USERNAME"
echo "  SIGNAL_ROOM=$SIGNAL_ROOM"
echo "  DOC_ROOM=$DOC_ROOM"

require_python

log "Health"
HEALTH_BODY="$(run_curl -w '\n%{http_code}' "$BASE/health")"
HEALTH_CODE="${HEALTH_BODY##*$'\n'}"
HEALTH_JSON="${HEALTH_BODY%$'\n'*}"
check_http "$HEALTH_CODE" "200" "GET /health"
echo "$HEALTH_JSON" | python3 -m json.tool

log "Auth"
TOKEN_RESPONSE="$(run_curl -w '\n%{http_code}' -X POST "$BASE/auth/token" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"${USERNAME}\",\"password\":\"${PASSWORD}\"}")"
TOKEN_CODE="${TOKEN_RESPONSE##*$'\n'}"
TOKEN_JSON="${TOKEN_RESPONSE%$'\n'*}"
check_http "$TOKEN_CODE" "200" "POST /auth/token"
TOKEN="$(printf '%s' "$TOKEN_JSON" | json_get access_token)"
echo "  access_token=${TOKEN:0:24}..."

AUTH_HEADER=(-H "Authorization: Bearer ${TOKEN}")

if [[ "$RUN_SIGNALING" -eq 1 ]]; then
  log "Phase 1 — collab join"
  JOIN_RESPONSE="$(run_curl -w '\n%{http_code}' -X POST "$BASE/collab/join" \
    "${AUTH_HEADER[@]}" \
    -H 'Content-Type: application/json' \
    -d "{\"room\":\"${SIGNAL_ROOM}\",\"name\":\"${USERNAME}\"}")"
  JOIN_CODE="${JOIN_RESPONSE##*$'\n'}"
  JOIN_JSON="${JOIN_RESPONSE%$'\n'*}"
  check_http "$JOIN_CODE" "200" "POST /collab/join"
  PEER="$(printf '%s' "$JOIN_JSON" | json_get peerId)"
  echo "$JOIN_JSON" | python3 -m json.tool
  echo "  peerId=$PEER"

  log "Phase 1 — collab poll"
  POLL_RESPONSE="$(run_curl -w '\n%{http_code}' -X POST "$BASE/collab/poll" \
    "${AUTH_HEADER[@]}" \
    -H 'Content-Type: application/json' \
    -d "{\"room\":\"${SIGNAL_ROOM}\",\"peerId\":\"${PEER}\",\"since\":0}")"
  POLL_CODE="${POLL_RESPONSE##*$'\n'}"
  POLL_JSON="${POLL_RESPONSE%$'\n'*}"
  check_http "$POLL_CODE" "200" "POST /collab/poll"
  echo "$POLL_JSON" | python3 -m json.tool

  log "Phase 1 — collab leave"
  LEAVE_RESPONSE="$(run_curl -w '\n%{http_code}' -X POST "$BASE/collab/leave" \
    "${AUTH_HEADER[@]}" \
    -H 'Content-Type: application/json' \
    -d "{\"room\":\"${SIGNAL_ROOM}\",\"peerId\":\"${PEER}\"}")"
  LEAVE_CODE="${LEAVE_RESPONSE##*$'\n'}"
  LEAVE_JSON="${LEAVE_RESPONSE%$'\n'*}"
  check_http "$LEAVE_CODE" "200" "POST /collab/leave"
  echo "$LEAVE_JSON" | python3 -m json.tool
fi

if [[ "$RUN_DOCUMENT" -eq 1 ]]; then
  DOC_Q="$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$DOC_ROOM")"

  log "Phase 2 — GET document (markdown)"
  MD_RESPONSE="$(run_curl -w '\n%{http_code}' "${AUTH_HEADER[@]}" \
    "$BASE/collab/document?room=${DOC_Q}")"
  MD_CODE="${MD_RESPONSE##*$'\n'}"
  MD_BODY="${MD_RESPONSE%$'\n'*}"
  check_http "$MD_CODE" "200" "GET /collab/document"
  echo "$MD_BODY" | head -5
  if [[ "$(printf '%s' "$MD_BODY" | wc -l | tr -d ' ')" -gt 5 ]]; then
    echo "  … ($(printf '%s' "$MD_BODY" | wc -c | tr -d ' ') bytes total)"
  fi

  log "Phase 2 — GET document (yjs, expect 204 if empty)"
  YJS_CODE="$(run_curl -o /dev/null -w '%{http_code}' "${AUTH_HEADER[@]}" \
    "$BASE/collab/document?room=${DOC_Q}&format=yjs")"
  echo "  HTTP $YJS_CODE"
  if [[ "$YJS_CODE" != "204" && "$YJS_CODE" != "200" ]]; then
    echo "FAIL: unexpected Yjs GET status" >&2
    exit 1
  fi

  log "Phase 2 — PUT document (markdown + yjs)"
  PUT_RESPONSE="$(run_curl -w '\n%{http_code}' -X PUT "$BASE/collab/document" \
    "${AUTH_HEADER[@]}" \
    -H 'Content-Type: application/json' \
    -d "{\"room\":\"${DOC_ROOM}\",\"markdown\":\"# Together\\n\\nHello from test-collab-api.sh.\\n\",\"yjs\":[1,2,3,255]}")"
  PUT_CODE="${PUT_RESPONSE##*$'\n'}"
  PUT_JSON="${PUT_RESPONSE%$'\n'*}"
  check_http "$PUT_CODE" "200" "PUT /collab/document"
  echo "$PUT_JSON" | python3 -m json.tool

  log "Phase 2 — GET document (markdown, after save)"
  MD2_RESPONSE="$(run_curl -w '\n%{http_code}' "${AUTH_HEADER[@]}" \
    "$BASE/collab/document?room=${DOC_Q}")"
  MD2_CODE="${MD2_RESPONSE##*$'\n'}"
  MD2_BODY="${MD2_RESPONSE%$'\n'*}"
  check_http "$MD2_CODE" "200" "GET /collab/document (after PUT)"
  echo "$MD2_BODY" | head -5

  log "Phase 2 — GET document (yjs bytes)"
  YJS_BYTES="$(run_curl "${AUTH_HEADER[@]}" "$BASE/collab/document?room=${DOC_Q}&format=yjs")"
  if command -v xxd >/dev/null 2>&1; then
    printf '%s' "$YJS_BYTES" | xxd
  else
    printf '%s' "$YJS_BYTES" | python3 -c 'import sys; print(list(sys.stdin.buffer.read()))'
  fi

  DISK_MD="${ROOT}/apps/wegotworkspace/wgw-content/files/${DOC_ROOM#/}"
  DISK_YJS="${DISK_MD}.yjs"
  echo "  markdown on disk: ${DISK_MD}"
  echo "  yjs sidecar:      ${DISK_YJS}"
fi

log "Done — all checks passed"
