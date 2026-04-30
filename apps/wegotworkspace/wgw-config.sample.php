<?php

declare(strict_types=1);

/**
 * Local bootstrap config (WordPress-style constants).
 *
 * Copy to `wgw-config.php` (the installer creates this file automatically).
 * Everything else—timezone, base_uri, auth_realm, feature toggles, admin users—lives in
 * the `app_settings` table (`/admin` -> Settings).
 */

// Optional instance data directory (default: ./wgw-content).
// Supports relative (./wgw-content, ../shared/wgw-content) and absolute paths.
// SABRE_DATA_DIR still overrides this value when set.
defined('WGW_DATA_DIR') || define('WGW_DATA_DIR', './wgw-content');

// Release feed used by /admin/updates "Check now".
// Can point to manifest.json directly or GitHub releases/latest API URL.
defined('WGW_UPDATE_FEED_URL') || define('WGW_UPDATE_FEED_URL', 'https://github.com/woutervroege/wegotworkspace/releases/latest/download/manifest.json');

// JWT configuration for /api/v1 bearer tokens (RS256).
defined('WGW_API_JWT_ISSUER') || define('WGW_API_JWT_ISSUER', 'wegotworkspace-api');
defined('WGW_API_JWT_AUDIENCE') || define('WGW_API_JWT_AUDIENCE', 'wegotworkspace-clients');
defined('WGW_API_JWT_KID') || define('WGW_API_JWT_KID', 'wgw-rs256-v1');
defined('WGW_API_JWT_PRIVATE_KEY_PATH') || define('WGW_API_JWT_PRIVATE_KEY_PATH', './wgw-content/keys/api-jwt-private.pem');
defined('WGW_API_JWT_PUBLIC_KEY_PATH') || define('WGW_API_JWT_PUBLIC_KEY_PATH', './wgw-content/keys/api-jwt-public.pem');

// SQLite (recommended): optional path relative to runtime root or absolute path.
// If omitted, runtime uses WGW_DATA_DIR + '/db.sqlite'.
defined('WGW_DB_SQLITE_FILE') || define('WGW_DB_SQLITE_FILE', './wgw-content/db.sqlite');

// MySQL / MariaDB: comment out WGW_DB_SQLITE_FILE above and uncomment below.
// define('WGW_DB_DSN', 'mysql:host=127.0.0.1;port=3306;dbname=wegotworkspace;charset=utf8mb4');
// define('WGW_DB_USER', 'db_user');
// define('WGW_DB_PASSWORD', 'db_password');
