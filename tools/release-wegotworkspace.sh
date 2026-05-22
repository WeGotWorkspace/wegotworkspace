#!/usr/bin/env bash
# Build release artifacts and/or publish a signed tag (CI builds the GitHub Release).
#
#   pnpm release                          # build + package (loads repo-root .env)
#   pnpm release:publish patch            # bump VERSION, commit, signed tag, push
#   pnpm release:publish 1.2.3 --yes      # explicit version, no prompt
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT/apps/wegotworkspace/VERSION"
BUILD_SCRIPT="$ROOT/tools/build-wegotworkspace-release.mjs"

usage() {
  cat <<'EOF'
usage:
  tools/release-wegotworkspace.sh package [--skip-build]
  tools/release-wegotworkspace.sh publish <patch|minor|major|X.Y.Z> [--yes] [--no-push] [--verify]

package   Run pnpm build (unless --skip-build), then write dist/releases/* using
          WGW_RELEASE_SIGNING_PRIVATE_KEY from the environment (repo-root .env via pnpm).

publish   Bump apps/wegotworkspace/VERSION, commit, create a signed annotated tag v*,
          and push branch + tag. GitHub Actions builds and uploads the release assets.

options:
  --yes       Skip confirmation prompts (publish only).
  --no-push   Commit and tag locally but do not push (publish only).
  --verify    After bump, run package build before commit (publish only).
  --skip-build  Skip pnpm build (package, or publish --verify).
EOF
  exit 1
}

require_clean_tree() {
  if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
    echo "error: working tree is not clean. Commit or stash changes first." >&2
    exit 1
  fi
}

read_version() {
  [[ -f "$VERSION_FILE" ]] || { echo "error: missing $VERSION_FILE" >&2; exit 1; }
  tr -d '[:space:]' < "$VERSION_FILE" | sed 's/^v//'
}

write_version() {
  printf '%s\n' "$1" >"$VERSION_FILE"
}

bump_version() {
  local bump="$1" current="$2"
  node -e '
const bump = process.argv[1];
const current = process.argv[2].replace(/^v/, "");
const explicit = /^\d+\.\d+\.\d+$/;
if (explicit.test(bump)) {
  console.log(bump);
  process.exit(0);
}
const parts = current.split(".").map((n) => Number.parseInt(n, 10));
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  console.error("error: VERSION must be semver (X.Y.Z)");
  process.exit(1);
}
let [major, minor, patch] = parts;
switch (bump) {
  case "patch":
    patch += 1;
    break;
  case "minor":
    minor += 1;
    patch = 0;
    break;
  case "major":
    major += 1;
    minor = 0;
    patch = 0;
    break;
  default:
    console.error("error: bump must be patch, minor, major, or X.Y.Z");
    process.exit(1);
}
console.log(`${major}.${minor}.${patch}`);
' "$bump" "$current"
}

run_build() {
  echo "→ pnpm build"
  (cd "$ROOT" && pnpm run build)
}

run_package() {
  echo "→ node tools/build-wegotworkspace-release.mjs"
  (cd "$ROOT" && node "$BUILD_SCRIPT")
}

ensure_signing_key() {
  if [[ -z "${WGW_RELEASE_SIGNING_PRIVATE_KEY:-}" ]]; then
    echo "warning: WGW_RELEASE_SIGNING_PRIVATE_KEY is not set; manifest.sig will be omitted." >&2
    echo "         Add it to repo-root .env (see .env.example) for signed artifacts." >&2
  fi
}

ensure_tag_signing() {
  if ! git -C "$ROOT" config --get user.signingkey &>/dev/null; then
    echo "error: git user.signingkey is not configured (required for signed tags)." >&2
    echo "       Set GPG or SSH commit signing, then retry." >&2
    exit 1
  fi
}

cmd_package() {
  local skip_build=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --skip-build) skip_build=1 ;;
      *) usage ;;
    esac
    shift
  done
  [[ $# -eq 0 ]] || usage

  ensure_signing_key
  if [[ "$skip_build" -eq 0 ]]; then
    run_build
  fi
  run_package
}

cmd_publish() {
  local bump="" yes=0 no_push=0 verify=0 skip_build=0
  [[ $# -gt 0 ]] || usage
  bump="$1"
  shift
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes) yes=1 ;;
      --no-push) no_push=1 ;;
      --verify) verify=1 ;;
      --skip-build) skip_build=1 ;;
      *) usage ;;
    esac
    shift
  done
  [[ $# -eq 0 ]] || usage

  require_clean_tree
  ensure_tag_signing

  local current new tag
  current="$(read_version)"
  new="$(bump_version "$bump" "$current")"
  tag="v${new}"

  if [[ "$current" == "$new" && "$bump" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: VERSION is already ${new}" >&2
    exit 1
  fi

  echo "Release: ${current} → ${new} (${tag})"
  if [[ "$yes" -eq 0 ]]; then
    read -r -p "Continue? [y/N] " reply
    [[ "${reply,,}" == "y" || "${reply,,}" == "yes" ]] || { echo "Aborted."; exit 0; }
  fi

  write_version "$new"
  export WGW_RELEASE_VERSION="$new"

  if [[ "$verify" -eq 1 ]]; then
    ensure_signing_key
    if [[ "$skip_build" -eq 0 ]]; then
      run_build
    fi
    run_package
  fi

  git -C "$ROOT" add "$VERSION_FILE"
  git -C "$ROOT" commit -m "chore(release): ${tag}"
  git -C "$ROOT" tag -s "$tag" -m "chore(release): ${tag}"

  echo "→ Created commit and signed tag ${tag}"
  if [[ "$no_push" -eq 1 ]]; then
    echo "Skipped push (--no-push). When ready:"
    echo "  git push origin HEAD && git push origin ${tag}"
    exit 0
  fi

  local branch
  branch="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
  echo "→ git push origin ${branch}"
  git -C "$ROOT" push origin "HEAD:${branch}"
  echo "→ git push origin ${tag}"
  git -C "$ROOT" push origin "$tag"
  echo "Done. GitHub Actions will build and publish release assets for ${tag}."
}

[[ $# -gt 0 ]] || usage
command="$1"
shift

case "$command" in
  package) cmd_package "$@" ;;
  publish) cmd_publish "$@" ;;
  -h | --help | help) usage ;;
  *) usage ;;
esac
