-- SabreDAV users table with HTTP Basic (bcrypt) via digest column.
CREATE TABLE users (
    id INTEGER UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
    username VARBINARY(50),
    digesta1 VARBINARY(32) NOT NULL DEFAULT '',
    digest VARCHAR(255) NOT NULL,
    UNIQUE(username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
