<?php
/**
 * Aura Voice — Minimal LAMP signaling endpoint.
 *
 * One file. SQLite storage. No dependencies.
 *
 * INSTALL:
 *   1. Drop this file anywhere web-accessible on your LAMP server, e.g.
 *      /var/www/html/aura-signaling/rooms.php
 *   2. Make sure PHP has the `pdo_sqlite` extension (apt: php-sqlite3).
 *   3. The folder containing this file MUST be writable by the web user
 *      (it stores rooms.sqlite next to this script).
 *   4. Point the app at it: in the Aura Voice settings, set
 *      "Signaling URL" to https://your-host/aura-signaling/rooms.php
 *
 * ENDPOINTS  (all POST application/json, action chosen by ?action=…):
 *   ?action=join      { room, peerId, name }   -> { peers:[{id,name}] }
 *   ?action=poll      { room, peerId }         -> { peers:[…], messages:[…] }
 *   ?action=send      { room, to, from, type, payload }  -> { ok:true }
 *   ?action=leave     { room, peerId }         -> { ok:true }
 *   ?action=chat      { room, from, text }     -> { ok:true, delivered:int }  (broadcast to others in room)
 *
 *   Messages are envelopes with `type` in: "offer" | "answer" | "ice" | "bye" | "chat".
 *   Old rooms / peers / messages are auto-pruned (>10 min stale).
 *
 * SECURITY NOTES:
 *   - This is a signaling relay only. Media is peer-to-peer (or via your TURN).
 *   - No authentication. Anyone with a room code can join. Use long room codes.
 *   - Run behind HTTPS in production. WebRTC requires secure context.
 */

declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];

$dbPath = __DIR__ . '/rooms.sqlite';
$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('PRAGMA journal_mode=WAL');

$db->exec("
    CREATE TABLE IF NOT EXISTS peers (
        room    TEXT NOT NULL,
        peer_id TEXT NOT NULL,
        name    TEXT NOT NULL DEFAULT '',
        seen_at INTEGER NOT NULL,
        PRIMARY KEY(room, peer_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        room      TEXT NOT NULL,
        from_peer TEXT NOT NULL,
        to_peer   TEXT NOT NULL,
        type      TEXT NOT NULL,
        payload   TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_msg_target ON messages(room, to_peer, id);
    CREATE INDEX IF NOT EXISTS idx_peers_room ON peers(room);
");

// Garbage collect anything older than 10 minutes.
$cutoff = time() - 600;
$db->prepare('DELETE FROM peers WHERE seen_at < :c')->execute([':c' => $cutoff]);
$db->prepare('DELETE FROM messages WHERE created_at < :c')->execute([':c' => $cutoff]);

function bad(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function clean_room(?string $room): string {
    if (!is_string($room) || !preg_match('/^[A-Za-z0-9_-]{4,64}$/', $room)) {
        bad('invalid_room');
    }
    return $room;
}
function clean_peer(?string $p): string {
    if (!is_string($p) || !preg_match('/^[A-Za-z0-9_-]{4,64}$/', $p)) {
        bad('invalid_peer');
    }
    return $p;
}

switch ($action) {
    case 'join': {
        $room   = clean_room($body['room']   ?? null);
        $peerId = clean_peer($body['peerId'] ?? null);
        $name   = mb_substr((string)($body['name'] ?? ''), 0, 64);

        $stmt = $db->prepare(
            'INSERT INTO peers(room, peer_id, name, seen_at)
             VALUES(:r, :p, :n, :t)
             ON CONFLICT(room, peer_id) DO UPDATE SET name=:n, seen_at=:t'
        );
        $stmt->execute([':r' => $room, ':p' => $peerId, ':n' => $name, ':t' => time()]);

        // Cap room size at 4 participants for mesh sanity.
        $cnt = $db->prepare('SELECT COUNT(*) FROM peers WHERE room = :r');
        $cnt->execute([':r' => $room]);
        $count = (int)$cnt->fetchColumn();
        if ($count > 4) {
            $db->prepare('DELETE FROM peers WHERE room=:r AND peer_id=:p')
               ->execute([':r' => $room, ':p' => $peerId]);
            bad('room_full', 409);
        }

        $peers = $db->prepare('SELECT peer_id AS id, name FROM peers WHERE room=:r AND peer_id != :p');
        $peers->execute([':r' => $room, ':p' => $peerId]);
        echo json_encode(['peers' => $peers->fetchAll(PDO::FETCH_ASSOC)]);
        break;
    }

    case 'poll': {
        $room   = clean_room($body['room']   ?? null);
        $peerId = clean_peer($body['peerId'] ?? null);

        // touch presence
        $db->prepare('UPDATE peers SET seen_at=:t WHERE room=:r AND peer_id=:p')
           ->execute([':t' => time(), ':r' => $room, ':p' => $peerId]);

        // pull all messages addressed to this peer, then delete them
        $sel = $db->prepare(
            'SELECT id, from_peer AS "from", type, payload
             FROM messages WHERE room=:r AND to_peer=:p ORDER BY id ASC'
        );
        $sel->execute([':r' => $room, ':p' => $peerId]);
        $rows = $sel->fetchAll(PDO::FETCH_ASSOC);

        if ($rows) {
            $ids = array_column($rows, 'id');
            $in  = implode(',', array_fill(0, count($ids), '?'));
            $del = $db->prepare("DELETE FROM messages WHERE id IN ($in)");
            $del->execute($ids);
            // decode payload JSON
            foreach ($rows as &$r) {
                $r['payload'] = json_decode($r['payload'], true);
                unset($r['id']);
            }
        }

        // current peer roster (excluding self)
        $peers = $db->prepare('SELECT peer_id AS id, name FROM peers WHERE room=:r AND peer_id != :p');
        $peers->execute([':r' => $room, ':p' => $peerId]);

        echo json_encode([
            'peers'    => $peers->fetchAll(PDO::FETCH_ASSOC),
            'messages' => $rows,
        ]);
        break;
    }

    case 'send': {
        $room   = clean_room($body['room']   ?? null);
        $from   = clean_peer($body['from']   ?? null);
        $to     = clean_peer($body['to']     ?? null);
        $type   = (string)($body['type']    ?? '');
        if (!in_array($type, ['offer', 'answer', 'ice', 'bye'], true)) bad('bad_type');

        $payload = json_encode($body['payload'] ?? null);
        if (strlen($payload) > 200_000) bad('payload_too_large', 413);

        $db->prepare(
            'INSERT INTO messages(room, from_peer, to_peer, type, payload, created_at)
             VALUES(:r, :f, :t, :ty, :pl, :c)'
        )->execute([
            ':r' => $room, ':f' => $from, ':t' => $to,
            ':ty' => $type, ':pl' => $payload, ':c' => time(),
        ]);
        echo json_encode(['ok' => true]);
        break;
    }

    case 'leave': {
        $room   = clean_room($body['room']   ?? null);
        $peerId = clean_peer($body['peerId'] ?? null);
        $db->prepare('DELETE FROM peers WHERE room=:r AND peer_id=:p')
           ->execute([':r' => $room, ':p' => $peerId]);
        echo json_encode(['ok' => true]);
        break;
    }

    case 'chat': {
        $room = clean_room($body['room'] ?? null);
        $from = clean_peer($body['from'] ?? null);
        $text = trim((string) ($body['text'] ?? ''));
        $text = mb_substr($text, 0, 2000);
        if ($text === '') {
            bad('empty_text');
        }

        $live = $db->prepare('SELECT 1 FROM peers WHERE room=:r AND peer_id=:p');
        $live->execute([':r' => $room, ':p' => $from]);
        if (!$live->fetchColumn()) {
            bad('not_in_room');
        }

        $payload = json_encode(['text' => $text], JSON_THROW_ON_ERROR);
        if (strlen($payload) > 12000) {
            bad('payload_too_large', 413);
        }

        $others = $db->prepare('SELECT peer_id FROM peers WHERE room=:r AND peer_id != :p');
        $others->execute([':r' => $room, ':p' => $from]);
        /** @var list<string> $targets */
        $targets = $others->fetchAll(PDO::FETCH_COLUMN);
        if ($targets === []) {
            echo json_encode(['ok' => true, 'delivered' => 0]);
            break;
        }

        $ins = $db->prepare(
            'INSERT INTO messages(room, from_peer, to_peer, type, payload, created_at)
             VALUES(:r, :f, :t, :ty, :pl, :c)'
        );
        $now = time();
        foreach ($targets as $target) {
            $ins->execute([
                ':r' => $room,
                ':f' => $from,
                ':t' => (string) $target,
                ':ty' => 'chat',
                ':pl' => $payload,
                ':c' => $now,
            ]);
        }
        echo json_encode(['ok' => true, 'delivered' => count($targets)]);
        break;
    }

    default:
        bad('unknown_action');
}
