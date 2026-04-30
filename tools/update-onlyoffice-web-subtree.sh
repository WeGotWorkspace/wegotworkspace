#!/usr/bin/env bash
set -euo pipefail

PREFIX="packages/onlyoffice-web"
REPO_URL="${1:-https://github.com/woutervroege/onlyoffice-web.git}"
BRANCH="${2:-main}"
MODE="${3:---squash}"

if [[ "$MODE" != "--squash" && "$MODE" != "--no-squash" ]]; then
  echo "Invalid mode: $MODE"
  echo "Use --squash (default) or --no-squash."
  exit 1
fi

if [[ "$MODE" == "--no-squash" ]]; then
  SQUASH_FLAG=""
else
  SQUASH_FLAG="--squash"
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this script inside the sabre-installer git repository."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit/stash first, then retry."
  exit 1
fi

if [[ ! -d "$PREFIX" ]]; then
  echo "Prefix '$PREFIX' does not exist. Bootstrapping with subtree add..."
  if [[ -n "$SQUASH_FLAG" ]]; then
    git subtree add --prefix "$PREFIX" "$REPO_URL" "$BRANCH" --squash
  else
    git subtree add --prefix "$PREFIX" "$REPO_URL" "$BRANCH"
  fi
  exit 0
fi

echo "Updating $PREFIX from $REPO_URL#$BRANCH ..."
if [[ -n "$SQUASH_FLAG" ]]; then
  git subtree pull --prefix "$PREFIX" "$REPO_URL" "$BRANCH" --squash
else
  git subtree pull --prefix "$PREFIX" "$REPO_URL" "$BRANCH"
fi

echo "Done. Rebuild to refresh runtime artifacts:"
echo "  pnpm --filter @wgw/onlyoffice-web build"
