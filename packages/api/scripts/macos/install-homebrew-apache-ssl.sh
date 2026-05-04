#!/bin/bash

# =============================================================================
# scripts/macos/install-homebrew-apache-ssl.sh
# One-time / occasional macOS bootstrap for Homebrew httpd + PHP + mkcert.
# Installs packages and prepares base Apache config for preview:macos runtime.
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

echo ""
echo -e "${BOLD}==============================================================${NC}"
echo -e "${BOLD}   macOS Homebrew Apache/PHP/mkcert Bootstrap${NC}"
echo -e "${BOLD}==============================================================${NC}"
echo ""

if [ "$(uname -s)" != "Darwin" ]; then
  error "setup:macos only supports macOS"
fi

ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  HOMEBREW_PREFIX="/opt/homebrew"
else
  HOMEBREW_PREFIX="/usr/local"
fi
log "Detected architecture: $ARCH (Homebrew prefix: $HOMEBREW_PREFIX)"

log "Checking for Homebrew..."
if ! command -v brew >/dev/null 2>&1; then
  warn "Homebrew not found. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
success "Homebrew is available"

log "Stopping built-in macOS Apache (if running)..."
sudo apachectl stop 2>/dev/null || true
sudo launchctl unload -w /System/Library/LaunchDaemons/org.apache.httpd.plist 2>/dev/null || true
success "Built-in Apache stopped/disabled"

log "Installing Homebrew Apache (httpd)..."
brew install httpd
success "Homebrew Apache installed"

log "Installing PHP via Homebrew..."
brew install php
PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
success "PHP $PHP_VERSION installed"

log "Checking PHP ext-imap..."
if php -m 2>/dev/null | grep -qi '^imap$'; then
  success "PHP ext-imap is already available"
else
  log "ext-imap missing — installing shivammathur/extensions/imap@${PHP_VERSION}..."
  brew tap shivammathur/php
  brew tap shivammathur/extensions
  if brew install "shivammathur/extensions/imap@${PHP_VERSION}"; then
    if php -m 2>/dev/null | grep -qi '^imap$'; then
      success "PHP ext-imap is now available"
    else
      warn "imap formula installed but php -m still has no imap. Check $(brew --prefix)/etc/php/${PHP_VERSION}/conf.d/ and restart httpd after fixing."
    fi
  else
    warn "Could not install imap@${PHP_VERSION}. Mail IMAP needs ext-imap."
  fi
fi

log "Installing mkcert..."
brew install mkcert nss 2>/dev/null || true
mkcert -install
success "mkcert local CA installed and trusted"

HTTPD_PREFIX="$HOMEBREW_PREFIX/etc/httpd"
HTTPD_CONF="$HTTPD_PREFIX/httpd.conf"
if [ ! -f "$HTTPD_CONF" ]; then
  error "Could not find Homebrew Apache config at $HTTPD_CONF"
fi

log "Configuring base Apache modules ($HTTPD_CONF)..."
sed -i '' 's|#LoadModule ssl_module|LoadModule ssl_module|' "$HTTPD_CONF"
sed -i '' 's|#LoadModule socache_shmcb_module|LoadModule socache_shmcb_module|' "$HTTPD_CONF"
sed -i '' 's|#LoadModule rewrite_module|LoadModule rewrite_module|' "$HTTPD_CONF"
sed -i '' 's|#LoadModule vhost_alias_module|LoadModule vhost_alias_module|' "$HTTPD_CONF"
sed -i '' "s|#Include $HTTPD_PREFIX/extra/httpd-ssl.conf|Include $HTTPD_PREFIX/extra/httpd-ssl.conf|" "$HTTPD_CONF"
sed -i '' 's|#Include .*/extra/httpd-vhosts.conf|Include '"$HTTPD_PREFIX"'/extra/httpd-vhosts.conf|' "$HTTPD_CONF"

PHP_MODULE_PATH="$HOMEBREW_PREFIX/lib/httpd/modules/libphp.so"
if ! grep -q "libphp.so" "$HTTPD_CONF"; then
  {
    echo ""
    echo "# PHP Module (added by setup script)"
    echo "LoadModule php_module $PHP_MODULE_PATH"
  } >> "$HTTPD_CONF"
else
  sed -i '' "s|LoadModule php_module .*|LoadModule php_module $PHP_MODULE_PATH|" "$HTTPD_CONF"
fi

if ! grep -q "application/x-httpd-php" "$HTTPD_CONF"; then
  {
    echo ""
    echo "# PHP MIME type"
    echo "AddType application/x-httpd-php .php"
  } >> "$HTTPD_CONF"
fi

sed -i '' 's|DirectoryIndex index.html|DirectoryIndex index.php index.html|' "$HTTPD_CONF"
success "Base Apache configuration updated"

echo ""
echo -e "${GREEN}${BOLD}==============================================================${NC}"
echo -e "${GREEN}${BOLD}   Bootstrap complete${NC}"
echo -e "${GREEN}${BOLD}==============================================================${NC}"
echo ""
echo -e "Run ${BOLD}pnpm --filter @wgw/api preview:macos${NC} to configure vhosts and start Apache."
echo ""
