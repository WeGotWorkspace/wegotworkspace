#!/bin/bash

# =============================================================================
# scripts/macos/setup-homebrew-apache-ssl.sh
# Runtime macOS Apache preview: writes vhosts/docroot/certs and starts Homebrew httpd.
# Prerequisites must be installed via scripts/macos/install-homebrew-apache-ssl.sh.
#
# Run via `pnpm preview:macos` or `pnpm macos:preview` from the repo root (do not wrap in `turbo run`:
# sudo needs a real TTY for the password prompt).
#
# Env vars:
#   WEBROOT      — document root override (auto-detects runtime/repo public dir when unset)
#   VHOST_DOMAIN — optional custom local domain (e.g. mysite.test)
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()    { echo -e "${BLUE}==>${NC} ${BOLD}$1${NC}"; }
success(){ echo -e "${GREEN}✔${NC}  $1"; }
warn()   { echo -e "${YELLOW}⚠${NC}  $1"; }
error()  { echo -e "${RED}✘${NC}  $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

echo ""
echo -e "${BOLD}==============================================================${NC}"
echo -e "${BOLD}   macOS Apache (Homebrew) SSL Preview Runtime${NC}"
echo -e "${BOLD}==============================================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# 0. Detect architecture
# -----------------------------------------------------------------------------
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  HOMEBREW_PREFIX="/opt/homebrew"
else
  HOMEBREW_PREFIX="/usr/local"
fi
log "Detected architecture: $ARCH (Homebrew prefix: $HOMEBREW_PREFIX)"

# -----------------------------------------------------------------------------
# Webroot — set via WEBROOT env var, falls back to Homebrew default
# -----------------------------------------------------------------------------
if [ -f "$WORKSPACE_ROOT/.env" ]; then
  log "Loading runtime variables from $WORKSPACE_ROOT/.env..."
  set -a
  # shellcheck disable=SC1090
  . "$WORKSPACE_ROOT/.env"
  set +a
fi

DEFAULT_DOCROOT="$HOMEBREW_PREFIX/var/www"

RUNTIME_ROOT="$APP_ROOT"
if [ -n "${SABRE_BUILD_DIR:-}" ]; then
  SABRE_BUILD_DIR="${SABRE_BUILD_DIR%/}"
  if [[ "$SABRE_BUILD_DIR" == *".."* ]]; then
    warn "Ignoring SABRE_BUILD_DIR with '..' segments: $SABRE_BUILD_DIR"
  elif [[ "$SABRE_BUILD_DIR" == /* ]]; then
    RUNTIME_ROOT="$SABRE_BUILD_DIR"
  else
    RUNTIME_ROOT="$APP_ROOT/$SABRE_BUILD_DIR"
  fi
fi

PUBLIC_DIR_NAME="${SABRE_PUBLIC_DIR_NAME:-.}"
if [[ ! "$PUBLIC_DIR_NAME" =~ ^([A-Za-z0-9._-]+|\.)$ ]]; then
  warn "Invalid SABRE_PUBLIC_DIR_NAME '$PUBLIC_DIR_NAME' in environment; using '.'"
  PUBLIC_DIR_NAME="."
fi

RUNTIME_PUBLIC_DIR="$RUNTIME_ROOT"
if [ "$PUBLIC_DIR_NAME" != "." ]; then
  RUNTIME_PUBLIC_DIR="$RUNTIME_ROOT/$PUBLIC_DIR_NAME"
fi
APP_PUBLIC_DIR="$APP_ROOT"

if [ -z "${WEBROOT:-}" ]; then
  if [ -d "$RUNTIME_PUBLIC_DIR" ]; then
    DEFAULT_DOCROOT="$RUNTIME_PUBLIC_DIR"
    log "Using runtime document root: $DEFAULT_DOCROOT"
  elif [ -d "$APP_PUBLIC_DIR" ]; then
    DEFAULT_DOCROOT="$APP_PUBLIC_DIR"
    log "Runtime document root missing, using app root: $DEFAULT_DOCROOT"
  else
    log "No runtime/app public dir detected, using Homebrew default: $DEFAULT_DOCROOT"
  fi
fi

DOCROOT="${WEBROOT:-$DEFAULT_DOCROOT}"
DOCROOT="$(cd "$(dirname "$DOCROOT")" 2>/dev/null && pwd)/$(basename "$DOCROOT")" 2>/dev/null || DOCROOT="$DOCROOT"

if [ -n "$WEBROOT" ]; then
  log "Custom webroot specified: $DOCROOT"
  if [ ! -d "$DOCROOT" ]; then
	warn "Webroot directory does not exist — creating it: $DOCROOT"
	mkdir -p "$DOCROOT"
  fi
else
  log "No WEBROOT set, using default: $DOCROOT"
fi

APACHE_SETENV_BLOCK=""
append_setenv() {
  local key="$1"
  local value="$2"
  if [ -n "$value" ]; then
    local escaped
    escaped=$(printf '%s' "$value" | sed 's/[\\"]/\\&/g')
    APACHE_SETENV_BLOCK="${APACHE_SETENV_BLOCK}
	SetEnv ${key} \"${escaped}\""
  fi
}

append_setenv "SABRE_BUILD_DIR" "${SABRE_BUILD_DIR:-}"
append_setenv "SABRE_PUBLIC_DIR_NAME" "${SABRE_PUBLIC_DIR_NAME:-}"
append_setenv "SABRE_PRIVATE_DIR_NAME" "${SABRE_PRIVATE_DIR_NAME:-}"
append_setenv "SABRE_DATA_DIR_NAME" "${SABRE_DATA_DIR_NAME:-}"
append_setenv "SABRE_DATA_DIR" "${SABRE_DATA_DIR:-}"

if [ -n "$APACHE_SETENV_BLOCK" ]; then
  log "Will pass SABRE_* runtime variables to Apache vhosts"
fi

# -----------------------------------------------------------------------------
# Vhost domain — set via VHOST_DOMAIN env var (optional)
# -----------------------------------------------------------------------------
if [ -n "$VHOST_DOMAIN" ]; then
  log "Custom vhost domain: $VHOST_DOMAIN"
else
  log "No VHOST_DOMAIN set — localhost only"
fi

# -----------------------------------------------------------------------------
# 1. Validate prerequisites (installed by setup:macos)
# -----------------------------------------------------------------------------
log "Checking Homebrew runtime prerequisites..."
if ! command -v brew >/dev/null 2>&1; then
  error "Homebrew not found. Run: pnpm --filter @wgw/wegotworkspace setup:macos"
fi
if [ ! -f "$HOMEBREW_PREFIX/etc/httpd/httpd.conf" ]; then
  error "Homebrew httpd config missing. Run: pnpm --filter @wgw/wegotworkspace setup:macos"
fi
if ! command -v mkcert >/dev/null 2>&1; then
  error "mkcert not found. Run: pnpm --filter @wgw/wegotworkspace setup:macos"
fi
if ! command -v php >/dev/null 2>&1; then
  error "PHP not found. Run: pnpm --filter @wgw/wegotworkspace setup:macos"
fi
success "Prerequisites detected"

# -----------------------------------------------------------------------------
# 2. Generate trusted SSL certificate
# -----------------------------------------------------------------------------
HTTPD_PREFIX="$HOMEBREW_PREFIX/etc/httpd"
SSL_DIR="$HTTPD_PREFIX/ssl"
mkdir -p "$SSL_DIR"

if [ -n "$VHOST_DOMAIN" ]; then
  VHOST_DOMAIN="${VHOST_DOMAIN#http://}"
  VHOST_DOMAIN="${VHOST_DOMAIN#https://}"
  VHOST_DOMAIN="${VHOST_DOMAIN%%/*}"
  if [[ "$VHOST_DOMAIN" == *:* ]]; then
    warn "VHOST_DOMAIN contains a port; stripping it: $VHOST_DOMAIN"
    VHOST_DOMAIN="${VHOST_DOMAIN%%:*}"
  fi
  [ -n "$VHOST_DOMAIN" ] || error "VHOST_DOMAIN is invalid after normalization"
  log "Generating SSL certificate for localhost + $VHOST_DOMAIN..."
  TMPDIR_CERT=$(mktemp -d)
  pushd "$TMPDIR_CERT" > /dev/null
  mkcert localhost 127.0.0.1 ::1 "$VHOST_DOMAIN"
  mv "localhost+3.pem"     "$SSL_DIR/server.crt"
  mv "localhost+3-key.pem" "$SSL_DIR/server.key"
  popd > /dev/null
  rm -rf "$TMPDIR_CERT"
else
  log "Generating SSL certificate for localhost..."
  TMPDIR_CERT=$(mktemp -d)
  pushd "$TMPDIR_CERT" > /dev/null
  mkcert localhost 127.0.0.1 ::1
  mv localhost+2.pem     "$SSL_DIR/server.crt"
  mv localhost+2-key.pem "$SSL_DIR/server.key"
  popd > /dev/null
  rm -rf "$TMPDIR_CERT"
fi
success "SSL certificate generated at $SSL_DIR"

# -----------------------------------------------------------------------------
# 3. Configure Homebrew Apache (httpd.conf)
# -----------------------------------------------------------------------------
HTTPD_CONF="$HTTPD_PREFIX/httpd.conf"
log "Configuring Homebrew Apache ($HTTPD_CONF)..."

# Enable SSL modules
sed -i '' 's|#LoadModule ssl_module|LoadModule ssl_module|' "$HTTPD_CONF"
sed -i '' 's|#LoadModule socache_shmcb_module|LoadModule socache_shmcb_module|' "$HTTPD_CONF"

# Enable rewrite + vhost modules
sed -i '' 's|#LoadModule rewrite_module|LoadModule rewrite_module|' "$HTTPD_CONF"
sed -i '' 's|#LoadModule vhost_alias_module|LoadModule vhost_alias_module|' "$HTTPD_CONF"

# Enable SSL vhost include
sed -i '' "s|#Include $HTTPD_PREFIX/extra/httpd-ssl.conf|Include $HTTPD_PREFIX/extra/httpd-ssl.conf|" "$HTTPD_CONF"

# Enable httpd-vhosts include
sed -i '' 's|#Include .*/extra/httpd-vhosts.conf|Include '"$HTTPD_PREFIX"'/extra/httpd-vhosts.conf|' "$HTTPD_CONF"

# Add PHP module
PHP_MODULE_PATH="$HOMEBREW_PREFIX/lib/httpd/modules/libphp.so"
if ! grep -q "libphp.so" "$HTTPD_CONF"; then
  echo "" >> "$HTTPD_CONF"
  echo "# PHP Module (added by setup script)" >> "$HTTPD_CONF"
  echo "LoadModule php_module $PHP_MODULE_PATH" >> "$HTTPD_CONF"
else
  sed -i '' "s|LoadModule php_module .*|LoadModule php_module $PHP_MODULE_PATH|" "$HTTPD_CONF"
fi

# Add PHP MIME type
if ! grep -q "application/x-httpd-php" "$HTTPD_CONF"; then
  echo "" >> "$HTTPD_CONF"
  echo "# PHP MIME type" >> "$HTTPD_CONF"
  echo "AddType application/x-httpd-php .php" >> "$HTTPD_CONF"
fi

# Update DirectoryIndex
sed -i '' 's|DirectoryIndex index.html|DirectoryIndex index.php index.html|' "$HTTPD_CONF"

# Set DocumentRoot
sed -i '' "s|^DocumentRoot .*|DocumentRoot \"$DOCROOT\"|" "$HTTPD_CONF"
sed -i '' "s|^<Directory \"$HOMEBREW_PREFIX/var/www\">|<Directory \"$DOCROOT\">|" "$HTTPD_CONF"

success "httpd.conf configured"

# -----------------------------------------------------------------------------
# 4. Configure SSL virtual host (httpd-ssl.conf)
# -----------------------------------------------------------------------------
SSL_CONF="$HTTPD_PREFIX/extra/httpd-ssl.conf"
log "Configuring SSL virtual host..."

sed -i '' "s|SSLCertificateFile .*|SSLCertificateFile \"$SSL_DIR/server.crt\"|" "$SSL_CONF"
sed -i '' "s|SSLCertificateKeyFile .*|SSLCertificateKeyFile \"$SSL_DIR/server.key\"|" "$SSL_CONF"
sed -i '' "s|DocumentRoot .*|DocumentRoot \"$DOCROOT\"|" "$SSL_CONF"

# Fix default ServerName so SNI routing works for named vhosts
sed -i '' 's|ServerName www.example.com:8443|ServerName localhost:8443|' "$SSL_CONF"

success "SSL config updated"

# -----------------------------------------------------------------------------
# 5. Write vhosts config (httpd-vhosts.conf)
# -----------------------------------------------------------------------------
VHOSTS_CONF="$HTTPD_PREFIX/extra/httpd-vhosts.conf"
log "Writing vhosts config..."

# Always write a localhost vhost as the default catch-all
cat > "$VHOSTS_CONF" << EOF
# Generated by setup script — do not edit manually

# Default HTTP vhost (localhost)
<VirtualHost *:8080>
	ServerName localhost
	DocumentRoot "$DOCROOT"
	<Directory "$DOCROOT">
		Options Indexes FollowSymLinks
		AllowOverride All
		Require all granted
	</Directory>
${APACHE_SETENV_BLOCK}
</VirtualHost>
EOF

# If VHOST_DOMAIN is set, add a named vhost for HTTP and HTTPS
if [ -n "$VHOST_DOMAIN" ]; then
  cat >> "$VHOSTS_CONF" << EOF

# Custom domain vhost — HTTP (redirects to HTTPS)
<VirtualHost *:8080>
	ServerName $VHOST_DOMAIN
	Redirect permanent / https://$VHOST_DOMAIN:8443/
</VirtualHost>

# Custom domain vhost — HTTPS
<VirtualHost *:8443>
	ServerName $VHOST_DOMAIN
	DocumentRoot "$DOCROOT"
	SSLEngine on
	SSLCertificateFile "$SSL_DIR/server.crt"
	SSLCertificateKeyFile "$SSL_DIR/server.key"
	<Directory "$DOCROOT">
		Options Indexes FollowSymLinks
		AllowOverride All
		Require all granted
	</Directory>
${APACHE_SETENV_BLOCK}
</VirtualHost>
EOF

  # Add to /etc/hosts if not already there
  if ! grep -q "$VHOST_DOMAIN" /etc/hosts; then
	log "Adding $VHOST_DOMAIN to /etc/hosts..."
	echo "127.0.0.1  $VHOST_DOMAIN" | sudo tee -a /etc/hosts > /dev/null
	success "$VHOST_DOMAIN added to /etc/hosts"
  else
	success "$VHOST_DOMAIN already in /etc/hosts"
  fi
fi

success "Vhosts config written"

# -----------------------------------------------------------------------------
# 6. Validate and start Homebrew Apache
# -----------------------------------------------------------------------------
APACHECTL="$HOMEBREW_PREFIX/bin/apachectl"
PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')

log "Validating Apache configuration..."
if "$APACHECTL" configtest 2>&1 | grep -q "Syntax OK"; then
  success "Apache config syntax OK"
else
  "$APACHECTL" configtest
  error "Apache config has errors — check output above"
fi

log "Starting Homebrew Apache..."
brew services stop httpd 2>/dev/null || true
sleep 1
brew services start httpd
success "Homebrew Apache started (runs on login automatically)"

# -----------------------------------------------------------------------------
# 7. Test PHP file
# -----------------------------------------------------------------------------
TEST_FILE="$DOCROOT/info.php"
log "Creating test PHP file..."
echo "<?php phpinfo();" > "$TEST_FILE"
success "Test file created at $TEST_FILE"

# -----------------------------------------------------------------------------
# Done!
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}==============================================================${NC}"
echo -e "${GREEN}${BOLD}   All done!${NC}"
echo -e "${GREEN}${BOLD}==============================================================${NC}"
echo ""
echo -e "  ${BOLD}HTTP:${NC}      http://localhost:8080"
echo -e "  ${BOLD}HTTPS:${NC}     https://localhost:8443"
if [ -n "$VHOST_DOMAIN" ]; then
echo -e "  ${BOLD}Vhost:${NC}     https://$VHOST_DOMAIN:8443"
fi
echo -e "  ${BOLD}PHP info:${NC}  https://localhost:8443/info.php"
echo ""
echo -e "  ${BOLD}Document root:${NC} $DOCROOT"
echo -e "  ${BOLD}Apache config:${NC} $HTTPD_CONF"
echo -e "  ${BOLD}Vhosts config:${NC} $VHOSTS_CONF"
echo -e "  ${BOLD}PHP version:${NC}   $PHP_VERSION"
if php -m 2>/dev/null | grep -qi '^imap$'; then
  echo -e "  ${BOLD}PHP IMAP:${NC}     enabled (ext-imap — used by /mail)"
else
  echo -e "  ${YELLOW}PHP IMAP:${NC}     not loaded — run ${BOLD}pnpm enable-php-imap${NC} then ${BOLD}brew services restart httpd${NC}"
fi
echo -e "  ${BOLD}SSL certs:${NC}     $SSL_DIR"
echo ""
echo -e "  ${YELLOW}Note:${NC} Homebrew Apache runs on ports 8080/8443 (no sudo needed)"
echo -e "  ${YELLOW}Tip:${NC}  Remove test file when done → ${BOLD}rm $TEST_FILE${NC}"
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo -e "    brew services restart httpd      # restart"
echo -e "    brew services stop httpd         # stop"
echo -e "    $APACHECTL configtest            # validate config"
echo ""