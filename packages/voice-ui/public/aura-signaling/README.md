# Aura Voice — LAMP signaling

A single PHP file (`rooms.php`) that lets the Aura Voice app coordinate
WebRTC peers via a SQLite-backed message relay.

## Install

1. Copy `rooms.php` to your LAMP server, e.g.
   `/var/www/html/aura-signaling/rooms.php`
2. Ensure the directory is writable by the web user
   (`chown www-data:www-data /var/www/html/aura-signaling`).
3. PHP needs `pdo_sqlite` (Debian/Ubuntu: `apt install php-sqlite3`).
4. Serve over **HTTPS** — WebRTC requires a secure context.
5. In the app, open **Settings** and set **Signaling URL** to
   `https://your-host/aura-signaling/rooms.php`.

## Notes

- Rooms are capped at 4 participants (mesh becomes painful beyond that).
- Anything older than 10 minutes is auto-pruned.
- Anyone with a room code can join — use long, unguessable codes.
