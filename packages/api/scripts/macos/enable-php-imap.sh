#!/bin/bash
# Install PHP ext-imap on macOS when Homebrew PHP does not ship it.
# Usage: bash packages/api/scripts/macos/enable-php-imap.sh
# Then restart your web stack (e.g. brew services restart httpd).

set -e

if ! command -v brew &>/dev/null; then
  echo "Homebrew not found. Install PHP IMAP via your OS package manager instead." >&2
  exit 1
fi

if php -m 2>/dev/null | grep -qi '^imap$'; then
  echo "PHP ext-imap is already loaded."
  php -m | grep -i '^imap$'
  exit 0
fi

PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
echo "PHP ${PHP_VERSION} has no imap — installing shivammathur/extensions/imap@${PHP_VERSION}..."

brew tap shivammathur/php
brew tap shivammathur/extensions
brew install "shivammathur/extensions/imap@${PHP_VERSION}"

if php -m 2>/dev/null | grep -qi '^imap$'; then
  echo "OK: ext-imap is loaded."
  php -m | grep -i '^imap$'
  echo "Restart PHP (e.g. brew services restart httpd) if the web server still shows imap missing."
else
  echo "imap package installed but php -m still has no imap." >&2
  echo "Check: $(brew --prefix)/etc/php/${PHP_VERSION}/conf.d/" >&2
  exit 1
fi
