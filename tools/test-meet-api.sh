#!/usr/bin/env bash
# Smoke-test Meet signaling API against local Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$ROOT/.env.local"

PROXY_TARGET="${WGW_PROXY_TARGET:-https://wegotworkspace.localhost}"
ROOM="${MEET_SIGNAL_ROOM:-abcd-efgh-ijkl}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      PROXY_TARGET="$2"
      shift 2
      ;;
    --room)
      ROOM="$2"
      shift 2
      ;;
    -h | --help)
      echo "Usage: tools/test-meet-api.sh [--base URL] [--room CODE]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -f "$ENV_LOCAL" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -n "$line" ]] || continue
    case "$line" in
      WGW_PROXY_TARGET=*|MEET_*=*)
        export "$line"
        ;;
    esac
  done <"$ENV_LOCAL"
fi

PROXY_TARGET="${WGW_PROXY_TARGET:-$PROXY_TARGET}"

BASE="${PROXY_TARGET%/}/api/v1"
CURL=(curl -sS)
if [[ "$BASE" == https://* ]]; then
  CURL+=(-k)
fi

echo "==> Config"
echo "  BASE=$BASE"
echo "  ROOM=$ROOM"

echo ""
echo "==> Health"
"${CURL[@]}" "$BASE/health" | python3 -m json.tool

echo ""
echo "==> Guest join"
JOIN_JSON="$("${CURL[@]}" -X POST "$BASE/meet/join" \
  -H 'Content-Type: application/json' \
  -d "{\"room\":\"${ROOM}\",\"peerId\":\"guestPeer1\",\"name\":\"Guest One\"}")"
echo "$JOIN_JSON" | python3 -m json.tool
SESSION_KEY="$(printf '%s' "$JOIN_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("sessionKey") or "")')"

echo ""
echo "==> Guest poll"
POLL_BODY="$(printf '{"room":"%s","peerId":"guestPeer1"' "$ROOM")"
if [[ -n "$SESSION_KEY" ]]; then
  POLL_BODY+=$(printf ',"sessionKey":"%s"' "$SESSION_KEY")
fi
POLL_BODY+='}'
"${CURL[@]}" -X POST "$BASE/meet/poll" \
  -H 'Content-Type: application/json' \
  -d "$POLL_BODY" | python3 -m json.tool

echo ""
echo "==> Guest leave"
LEAVE_BODY="$(printf '{"room":"%s","peerId":"guestPeer1"' "$ROOM")"
if [[ -n "$SESSION_KEY" ]]; then
  LEAVE_BODY+=$(printf ',"sessionKey":"%s"' "$SESSION_KEY")
fi
LEAVE_BODY+='}'
"${CURL[@]}" -X POST "$BASE/meet/leave" \
  -H 'Content-Type: application/json' \
  -d "$LEAVE_BODY" | python3 -m json.tool

echo ""
echo "==> Done — Meet signaling checks passed"
