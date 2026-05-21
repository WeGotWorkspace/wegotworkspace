#!/usr/bin/env bash
# Load repo-root .env (with shell expansion) then run a command.
#
#   tools/with-root-env.sh -- turbo run test
#   tools/with-root-env.sh run 'pnpm run dev:bootstrap && turbo run dev'
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

usage() {
  echo "usage: tools/with-root-env.sh -- <command> [args...]" >&2
  echo "       tools/with-root-env.sh run '<shell pipeline>'" >&2
  exit 1
}

[[ $# -gt 0 ]] || usage

if [[ "${1:-}" == "run" ]]; then
  shift
  [[ $# -gt 0 ]] || usage
  bash -ec "$*"
  exit 0
fi

if [[ "${1:-}" == "--" ]]; then
  shift
fi

[[ $# -gt 0 ]] || usage
exec "$@"
