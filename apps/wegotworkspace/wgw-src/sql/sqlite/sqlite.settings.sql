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

CREATE TABLE IF NOT EXISTS voice_peers (
    room TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    seen_at INTEGER NOT NULL,
    PRIMARY KEY(room, peer_id)
);

CREATE TABLE IF NOT EXISTS voice_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room TEXT NOT NULL,
    from_peer TEXT NOT NULL,
    to_peer TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_msg_target ON voice_messages(room, to_peer, id);
CREATE INDEX IF NOT EXISTS idx_voice_peers_room ON voice_peers(room);
