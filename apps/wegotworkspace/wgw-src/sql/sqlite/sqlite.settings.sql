CREATE TABLE IF NOT EXISTS app_settings (
    name TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_user_credentials (
    username TEXT NOT NULL PRIMARY KEY,
    imap_username TEXT NOT NULL DEFAULT '',
    password_enc TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
