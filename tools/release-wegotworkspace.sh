#!/usr/bin/env bash
# Build release artifacts and/or publish a signed tag (CI builds the GitHub Release).
#
#   pnpm release                          # build + package (loads repo-root .env)
#   pnpm release:publish patch            # signed tag on main HEAD, push tag → CI publishes release
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
  tools/release-wegotworkspace.sh publish <patch|minor|major|X.Y.Z> [--yes] [--no-push] [--verify] [--sync-main]

package   Run pnpm build (unless --skip-build), then write dist/releases/* using
          WGW_RELEASE_SIGNING_PRIVATE_KEY from the environment (repo-root .env via pnpm).

publish   Resolve the next semver from the latest of apps/wegotworkspace/VERSION and
          the newest v* tag, create a signed annotated tag on main HEAD, and push the
          tag. GitHub Actions builds and uploads the release assets. No VERSION commit
          or sync PR is required — CI reads the version from the tag name.

options:
  --yes         Skip confirmation prompts (publish only).
  --no-push     Create the tag locally but do not push (publish only).
  --verify      Run package build before tagging (publish only).
  --sync-main   Also bump apps/wegotworkspace/VERSION, commit on main, and push main
                (for admins who want main kept in sync; requires branch bypass).
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

read_version_from_file() {
  [[ -f "$VERSION_FILE" ]] || { echo "error: missing $VERSION_FILE" >&2; exit 1; }
  tr -d '[:space:]' < "$VERSION_FILE" | sed 's/^v//'
}

read_latest_tag_version() {
  local tag
  tag="$(git -C "$ROOT" tag -l 'v*' --sort=-v:refname 2>/dev/null | head -1 || true)"
  [[ -n "$tag" ]] || return 0
  echo "${tag#v}"
}

read_version() {
  local from_file from_tag
  from_file="$(read_version_from_file)"
  from_tag="$(read_latest_tag_version)"
  node -e '
const file = process.argv[1]?.trim() ?? "";
const tag = process.argv[2]?.trim() ?? "";
const semver = /^\d+\.\d+\.\d+$/;
const parse = (value) => {
  if (!semver.test(value)) return null;
  return value.split(".").map((part) => Number.parseInt(part, 10));
};
const compare = (left, right) => {
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
};
const fileParts = parse(file);
const tagParts = parse(tag);
if (fileParts && tagParts) {
  console.log(compare(fileParts, tagParts) >= 0 ? file : tag);
  process.exit(0);
}
if (fileParts) {
  console.log(file);
  process.exit(0);
}
if (tagParts) {
  console.log(tag);
  process.exit(0);
}
console.error("error: no semver found in VERSION or v* tags");
process.exit(1);
' "$from_file" "$from_tag"
}

require_main_branch() {
  local branch
  branch="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
  if [[ "$branch" != "main" ]]; then
    echo "error: release:publish must run on main (current: ${branch})." >&2
    echo "       Checkout main, pull latest, then publish." >&2
    exit 1
  fi
}

sync_main_branch() {
  echo "→ git pull --ff-only origin main"
  git -C "$ROOT" pull --ff-only origin main
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

# Git -c args for signed tags (set by resolve_git_tag_signing).
GIT_TAG_SIGN_ARGS=()

expand_home() {
  local path="$1"
  if [[ "$path" == "~/"* ]]; then
    printf '%s/%s' "$HOME" "${path:2}"
  elif [[ "$path" == "~" ]]; then
    printf '%s' "$HOME"
  else
    printf '%s' "$path"
  fi
}

resolve_git_tag_signing() {
  GIT_TAG_SIGN_ARGS=()

  local from_env="${WGW_GIT_SIGNING_PUBLIC_KEY:-}"
  if [[ -n "$from_env" ]]; then
    from_env="$(expand_home "$from_env")"
    if [[ ! -f "$from_env" ]]; then
      echo "error: WGW_GIT_SIGNING_PUBLIC_KEY is set but not a file: ${from_env}" >&2
      exit 1
    fi
    GIT_TAG_SIGN_ARGS=(-c gpg.format=ssh -c "user.signingkey=${from_env}")
    return 0
  fi

  local from_git
  from_git="$(git -C "$ROOT" config --get user.signingkey 2>/dev/null || true)"
  if [[ -n "$from_git" ]]; then
    local format="gpg"
    format="$(git -C "$ROOT" config --get gpg.format 2>/dev/null || echo gpg)"
    GIT_TAG_SIGN_ARGS=(-c "gpg.format=${format}" -c "user.signingkey=${from_git}")
    return 0
  fi

  cat >&2 <<'EOF'
error: Git tag signing is not configured (CI requires signed annotated tags).

Release ZIP signing and Git tag signing use different keys:
  • WGW_RELEASE_SIGNING_PRIVATE_KEY — RSA PEM for manifest.sig (release artifacts)
  • WGW_GIT_SIGNING_PUBLIC_KEY       — SSH public key for git tag -s

Option A — add to repo-root .env (loaded by pnpm release:publish):
  WGW_GIT_SIGNING_PUBLIC_KEY=$HOME/.ssh/id_ed25519.pub

Option B — configure git globally (SSH):
  git config --global gpg.format ssh
  git config --global user.signingkey ~/.ssh/id_ed25519.pub

Option B — GPG:
  git config --global user.signingkey <key-id>
EOF
  exit 1
}

git_tag_sign() {
  git -C "$ROOT" "${GIT_TAG_SIGN_ARGS[@]}" "$@"
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
  local bump="" yes=0 no_push=0 verify=0 skip_build=0 sync_main=0
  [[ $# -gt 0 ]] || usage
  bump="$1"
  shift
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes) yes=1 ;;
      --no-push) no_push=1 ;;
      --verify) verify=1 ;;
      --sync-main) sync_main=1 ;;
      --skip-build) skip_build=1 ;;
      *) usage ;;
    esac
    shift
  done
  [[ $# -eq 0 ]] || usage

  require_clean_tree
  require_main_branch
  sync_main_branch
  resolve_git_tag_signing

  local current new tag
  current="$(read_version)"
  new="$(bump_version "$bump" "$current")"
  tag="v${new}"

  if git -C "$ROOT" rev-parse "$tag" >/dev/null 2>&1; then
    echo "error: tag ${tag} already exists" >&2
    exit 1
  fi

  if [[ "$current" == "$new" && "$bump" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: latest version is already ${new}" >&2
    exit 1
  fi

  echo "Release: ${current} → ${new} (${tag}) on $(git -C "$ROOT" rev-parse --short HEAD)"
  if [[ "$yes" -eq 0 ]]; then
    read -r -p "Continue? [y/N] " reply
    case "$reply" in
      [yY]|[yY][eE][sS]) ;;
      *) echo "Aborted."; exit 0 ;;
    esac
  fi

  export WGW_RELEASE_VERSION="$new"

  if [[ "$verify" -eq 1 ]]; then
    ensure_signing_key
    if [[ "$skip_build" -eq 0 ]]; then
      run_build
    fi
    run_package
  fi

  if [[ "$sync_main" -eq 1 ]]; then
    write_version "$new"
    git -C "$ROOT" add "$VERSION_FILE"
    git -C "$ROOT" commit -m "chore(release): ${tag}"
  fi

  git_tag_sign tag -s "$tag" -m "Release ${tag}"

  echo "→ Created signed tag ${tag}"
  if [[ "$no_push" -eq 1 ]]; then
    echo "Skipped push (--no-push). When ready:"
    if [[ "$sync_main" -eq 1 ]]; then
      echo "  git push origin main && git push origin ${tag}"
    else
      echo "  git push origin ${tag}"
    fi
    exit 0
  fi

  if [[ "$sync_main" -eq 1 ]]; then
    echo "→ git push origin main"
    git -C "$ROOT" push origin main
  fi
  echo "→ git push origin ${tag}"
  git -C "$ROOT" push origin "$tag"
  echo "Done. GitHub Actions will build and publish release assets for ${tag}."
  if [[ "$sync_main" -eq 0 ]]; then
    echo "Note: apps/wegotworkspace/VERSION on main is unchanged; CI uses the tag version."
    echo "      Pass --sync-main to commit the VERSION bump on main (admin bypass required)."
  fi
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
