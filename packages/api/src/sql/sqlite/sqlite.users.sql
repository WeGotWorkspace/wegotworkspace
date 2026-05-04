-- SabreDAV users table with HTTP Basic (bcrypt) via digest column.
-- digesta1 kept for compatibility with Digest auth backends (unused here).
CREATE TABLE users (
	id integer primary key asc NOT NULL,
	username TEXT NOT NULL,
	digesta1 TEXT NOT NULL DEFAULT '',
	digest TEXT NOT NULL,
	UNIQUE(username)
);
