#!/bin/sh
# WeGotWorkspace Docker install lifecycle — install, start, stop, upgrade, backup.
# Published as both `install` (curl|sh default) and `setup.sh` on GitHub Releases.
set -eu

WGW_GITHUB_REPO="${WGW_GITHUB_REPO:-WeGotWorkspace/wegotworkspace}"
WGW_RELEASE_BASE="https://github.com/${WGW_GITHUB_REPO}/releases"
WGW_INSTALL_DIR="${WGW_INSTALL_DIR:-./wgw-app}"
WGW_VERSION="${WGW_VERSION:-latest}"
WGW_HTTP_PORT="${WGW_HTTP_PORT:-}"
WGW_SQLITE=0
WGW_FORCE=0
WGW_UPGRADE=0
WGW_UPGRADE_VERSION=""

COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

usage() {
  cat <<'EOF'
WeGotWorkspace Docker install helper.

Usage:
  curl -fsSL .../install | sh                          Install and start (default)
  curl -fsSL .../install | sh -s -- [options] [cmd]
  bash setup.sh [options] [command]

Commands (default: install):
  install          Create wgw-app/, download assets, pull, up -d, wait for health
  start            docker compose up -d (after stop)
  stop             docker compose down
  restart          docker compose restart
  upgrade [ver]    Backup, update image tag, pull, up -d, health check
  backup           Archive volumes (+ MySQL dump when mysql profile)
  logs             docker compose logs -f
  help             Show this message

Options:
  --sqlite         SQLite-only stack (no MariaDB)
  --version VER    Pin release / image tag (default: latest)
  --upgrade [VER]  Upgrade existing install (same as: upgrade [VER])
  --force          Overwrite existing wgw-app/ on install
  -h, --help       Show this message

Environment:
  WGW_INSTALL_DIR  Install directory (default: ./wgw-app)
  WGW_HTTP_PORT    Host HTTP port (default: 8080)
  WGW_VERSION      Release tag when not passed via --version

Examples:
  curl -fsSL .../install | sh
  WGW_HTTP_PORT=9090 curl -fsSL .../install | sh
  curl -fsSL .../install | sh -s -- --sqlite
  curl -fsSL .../install | sh -s -- --version 1.2.0
  curl -fsSL .../install | sh -s -- --upgrade 1.2.0
  cd wgw-app && bash setup.sh upgrade 1.2.0
EOF
}

log() {
  printf '[wgw-setup] %s\n' "$*"
}

die() {
  printf '[wgw-setup] Error: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

check_docker() {
  need_cmd docker
  if ! docker info >/dev/null 2>&1; then
    die "Docker is not running. Start Docker Engine and try again."
  fi
  if ! docker compose version >/dev/null 2>&1; then
    die "Docker Compose v2 is required (docker compose). Install Docker Desktop or the compose plugin."
  fi
}

resolve_install_dir() {
  parent=$(dirname "$WGW_INSTALL_DIR")
  base=$(basename "$WGW_INSTALL_DIR")
  if parent=$(cd "$parent" 2>/dev/null && pwd); then
    WGW_INSTALL_DIR="${parent}/${base}"
  fi
}

install_dir_from_cwd() {
  if [ -f "./${COMPOSE_FILE}" ] && [ -f "./${ENV_FILE}" ]; then
    WGW_INSTALL_DIR=$(pwd)
  fi
}

download_url() {
  asset=$1
  if [ "$WGW_VERSION" = "latest" ]; then
    printf '%s/latest/download/%s' "$WGW_RELEASE_BASE" "$asset"
  else
    printf '%s/download/v%s/%s' "$WGW_RELEASE_BASE" "$WGW_VERSION" "$asset"
  fi
}

fetch_asset() {
  asset=$1
  dest=$2
  url=$(download_url "$asset")
  log "Downloading ${asset} from ${url}"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$dest" "$url"
  else
    die "curl or wget is required to download release assets."
  fi
}

sed_inplace() {
  expr=$1
  file=$2
  tmp="${file}.wgw-setup.tmp"
  sed "$expr" "$file" >"$tmp" && mv "$tmp" "$file"
}

write_env_from_example() {
  path=$1
  example=$2
  cp "$example" "$path"
  if grep -q '^# WGW_IMAGE=' "$path"; then
    sed_inplace "s|^# WGW_IMAGE=.*|WGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:${WGW_VERSION}|" "$path"
  elif ! grep -q '^WGW_IMAGE=' "$path"; then
    printf '\nWGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:%s\n' "$WGW_VERSION" >>"$path"
  fi
}

apply_sqlite_profile() {
  env_path=$1
  if [ "$WGW_SQLITE" -eq 1 ]; then
    sed_inplace 's/^COMPOSE_PROFILES=.*/COMPOSE_PROFILES=sqlite/' "$env_path"
    sed_inplace 's/^WGW_WAIT_FOR_DB=.*/WGW_WAIT_FOR_DB=0/' "$env_path"
    sed_inplace 's/^WGW_DB_HOST=.*/WGW_DB_HOST=/' "$env_path"
  fi
}

apply_http_port() {
  env_path=$1
  if [ -n "$WGW_HTTP_PORT" ]; then
    if grep -q '^WGW_HTTP_PORT=' "$env_path"; then
      sed_inplace "s/^WGW_HTTP_PORT=.*/WGW_HTTP_PORT=${WGW_HTTP_PORT}/" "$env_path"
    else
      printf '\nWGW_HTTP_PORT=%s\n' "$WGW_HTTP_PORT" >>"$env_path"
    fi
  fi
}

compose() {
  docker compose -f "${WGW_INSTALL_DIR}/${COMPOSE_FILE}" --env-file "${WGW_INSTALL_DIR}/${ENV_FILE}" "$@"
}

load_env() {
  if [ -f "${WGW_INSTALL_DIR}/${ENV_FILE}" ]; then
    # shellcheck disable=SC1090
    . "${WGW_INSTALL_DIR}/${ENV_FILE}"
  fi
}

read_http_port() {
  load_env
  printf '%s' "${WGW_HTTP_PORT:-8080}"
}

wait_for_health() {
  port=$1
  url="http://127.0.0.1:${port}/api/v1/health"
  log "Waiting for health at ${url} ..."
  i=0
  while [ "$i" -lt 60 ]; do
    if curl -fsS "$url" 2>/dev/null | grep -q '"status":"ok"'; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  die "Health check timed out after 120s. Run: cd ${WGW_INSTALL_DIR} && sh setup.sh logs"
}

print_success() {
  port=$(read_http_port)
  load_env
  profiles="${COMPOSE_PROFILES:-mysql}"
  printf '\nWeGotWorkspace is running.\n'
  printf 'Open http://localhost:%s/install/ to finish setup.\n' "$port"
  if [ "$profiles" = "mysql" ]; then
    printf 'MySQL wizard defaults: host db, database/user/password wgw (see %s/%s)\n' "$WGW_INSTALL_DIR" "$ENV_FILE"
  else
    printf 'SQLite mode: choose SQLite in the installer wizard.\n'
  fi
}

cmd_install() {
  check_docker
  resolve_install_dir

  if [ -d "$WGW_INSTALL_DIR" ] && [ -n "$(ls -A "$WGW_INSTALL_DIR" 2>/dev/null || true)" ]; then
    if [ "$WGW_FORCE" -ne 1 ]; then
      die "Install directory already exists: ${WGW_INSTALL_DIR}. Use --force to overwrite or run upgrade."
    fi
    log "Removing existing ${WGW_INSTALL_DIR} (--force)"
    rm -rf "$WGW_INSTALL_DIR"
  fi

  mkdir -p "$WGW_INSTALL_DIR"

  fetch_asset "docker-compose.yml" "${WGW_INSTALL_DIR}/${COMPOSE_FILE}"
  fetch_asset ".env.example" "${WGW_INSTALL_DIR}/${ENV_FILE}.example"

  write_env_from_example "${WGW_INSTALL_DIR}/${ENV_FILE}" "${WGW_INSTALL_DIR}/${ENV_FILE}.example"
  apply_sqlite_profile "${WGW_INSTALL_DIR}/${ENV_FILE}"
  apply_http_port "${WGW_INSTALL_DIR}/${ENV_FILE}"

  log "Pulling images..."
  compose pull

  log "Starting stack..."
  compose up -d

  wait_for_health "$(read_http_port)"
  print_success
}

cmd_start() {
  check_docker
  install_dir_from_cwd
  [ -f "${WGW_INSTALL_DIR}/${COMPOSE_FILE}" ] || die "Not installed. Run install first."
  compose up -d
  wait_for_health "$(read_http_port)"
  print_success
}

cmd_stop() {
  check_docker
  install_dir_from_cwd
  [ -f "${WGW_INSTALL_DIR}/${COMPOSE_FILE}" ] || die "Not installed."
  compose down
  log "Stopped."
}

cmd_restart() {
  check_docker
  install_dir_from_cwd
  [ -f "${WGW_INSTALL_DIR}/${COMPOSE_FILE}" ] || die "Not installed."
  compose restart
  wait_for_health "$(read_http_port)"
  print_success
}

cmd_backup() {
  check_docker
  install_dir_from_cwd
  [ -f "${WGW_INSTALL_DIR}/${COMPOSE_FILE}" ] || die "Not installed."

  stamp=$(date +%Y%m%d-%H%M%S)
  backup_dir="${WGW_INSTALL_DIR}/backups/${stamp}"
  mkdir -p "$backup_dir"

  log "Backing up volumes to ${backup_dir}..."
  cp "${WGW_INSTALL_DIR}/${ENV_FILE}" "${backup_dir}/env.backup" 2>/dev/null || true
  cp "${WGW_INSTALL_DIR}/${COMPOSE_FILE}" "${backup_dir}/docker-compose.yml" 2>/dev/null || true

  project=$(basename "$(cd "$WGW_INSTALL_DIR" && pwd)")
  load_env
  project="${COMPOSE_PROJECT_NAME:-${project}}"

  for vol in wgw-content wgw-api-storage wgw-install-config wgw-db; do
    full="${project}_${vol}"
    if docker volume inspect "$full" >/dev/null 2>&1; then
      docker run --rm \
        -v "${full}:/data:ro" \
        -v "${backup_dir}:/backup" \
        alpine:3.20 \
        tar czf "/backup/${vol}.tar.gz" -C /data .
      log "  ${vol} -> ${backup_dir}/${vol}.tar.gz"
    fi
  done

  load_env
  if [ "${COMPOSE_PROFILES:-mysql}" = "mysql" ]; then
    log "Dumping MySQL database..."
    compose exec -T db mariadb-dump \
      -u root \
      -p"${MARIADB_ROOT_PASSWORD:-wgw-root}" \
      "${MARIADB_DATABASE:-wgw}" >"${backup_dir}/wgw-database.sql" || \
      log "Warning: MySQL dump failed (is db running?)"
  fi

  log "Backup complete: ${backup_dir}"
}

cmd_upgrade() {
  check_docker
  install_dir_from_cwd
  [ -f "${WGW_INSTALL_DIR}/${COMPOSE_FILE}" ] || die "Not installed. Run install first."

  target="${WGW_UPGRADE_VERSION:-$WGW_VERSION}"
  if [ -z "$target" ] || [ "$target" = "latest" ]; then
    die "Specify upgrade version: setup.sh upgrade 1.2.0"
  fi

  log "Upgrading to ${target}..."
  cmd_backup

  env_path="${WGW_INSTALL_DIR}/${ENV_FILE}"
  if grep -q '^WGW_IMAGE=' "$env_path"; then
    sed_inplace "s|^WGW_IMAGE=.*|WGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:${target}|" "$env_path"
  else
    printf '\nWGW_IMAGE=ghcr.io/wegotworkspace/wegotworkspace:%s\n' "$target" >>"$env_path"
  fi

  WGW_VERSION="$target"
  fetch_asset "docker-compose.yml" "${WGW_INSTALL_DIR}/${COMPOSE_FILE}"

  log "Pulling images..."
  compose pull

  log "Recreating stack (migrator runs before web)..."
  compose up -d

  wait_for_health "$(read_http_port)"
  log "Upgrade to ${target} complete."
  print_success
}

cmd_logs() {
  check_docker
  install_dir_from_cwd
  [ -f "${WGW_INSTALL_DIR}/${COMPOSE_FILE}" ] || die "Not installed."
  compose logs -f
}

is_command() {
  case "$1" in
    install | start | stop | restart | upgrade | backup | logs | help) return 0 ;;
    *) return 1 ;;
  esac
}

is_version_arg() {
  case "$1" in
    "" | --*) return 1 ;;
    install | start | stop | restart | upgrade | backup | logs | help) return 1 ;;
    *) return 0 ;;
  esac
}

parse_args() {
  cmd="install"
  while [ $# -gt 0 ]; do
    case "$1" in
      --sqlite)
        WGW_SQLITE=1
        shift
        ;;
      --version)
        [ $# -ge 2 ] || die "--version requires a value"
        WGW_VERSION=$2
        shift 2
        ;;
      --upgrade)
        WGW_UPGRADE=1
        if is_version_arg "${2:-}"; then
          WGW_UPGRADE_VERSION=$2
          shift
        fi
        shift
        ;;
      --force)
        WGW_FORCE=1
        shift
        ;;
      -h | --help | help)
        usage
        exit 0
        ;;
      *)
        if is_command "$1"; then
          cmd=$1
          shift
          if [ "$cmd" = "upgrade" ] && is_version_arg "${1:-}"; then
            WGW_UPGRADE_VERSION=$1
            shift
          fi
        else
          die "Unknown argument: $1 (try --help)"
        fi
        ;;
    esac
  done

  if [ "$WGW_UPGRADE" -eq 1 ]; then
    cmd="upgrade"
  fi

  case "$cmd" in
    install) cmd_install ;;
    start) cmd_start ;;
    stop) cmd_stop ;;
    restart) cmd_restart ;;
    upgrade) cmd_upgrade ;;
    backup) cmd_backup ;;
    logs) cmd_logs ;;
    *) usage; exit 1 ;;
  esac
}

parse_args "$@"
