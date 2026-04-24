<?php

declare(strict_types=1);

namespace App\Voice;

/**
 * Minimal JSON signaling for Aura Voice (ported from bright-face-connect {@code public/aura-signaling/rooms.php}).
 * SQLite state lives under {@see Paths::data()} {@code /voice-signaling/rooms.sqlite}.
 */
final class VoiceSignaling
{
    private const T_PEERS = 'voice_peers';
    private const T_MESSAGES = 'voice_messages';

    public static function respond(string $dbPath, \PDO $pdo, string $realm): void
    {
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
        /** @var array<string, mixed> $body */
        $body = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];

        $db = self::connectRuntimeDb($dbPath, $pdo);

        switch ($action) {
            case 'join': {
                $room = self::cleanRoom($body['room'] ?? null);
                $peerId = self::cleanPeer($body['peerId'] ?? null);
                $name = mb_substr((string) ($body['name'] ?? ''), 0, 64);

                $countBefore = $db->prepare('SELECT COUNT(*) FROM '.self::T_PEERS.' WHERE room = :r');
                $countBefore->execute([':r' => $room]);
                $n = (int) $countBefore->fetchColumn();
                if ($n === 0) {
                    if (VoiceSabreAuth::tryAuthenticatedUser($pdo, $realm) === null) {
                        VoiceSabreAuth::respondJsonUnauthorized($realm);
                    }
                }

                $stmt = $db->prepare(
                    'INSERT INTO '.self::T_PEERS.'(room, peer_id, name, seen_at)
                     VALUES(:r, :p, :n, :t)
                     ON CONFLICT(room, peer_id) DO UPDATE SET name=:n, seen_at=:t'
                );
                $stmt->execute([':r' => $room, ':p' => $peerId, ':n' => $name, ':t' => time()]);

                $cnt = $db->prepare('SELECT COUNT(*) FROM '.self::T_PEERS.' WHERE room = :r');
                $cnt->execute([':r' => $room]);
                $count = (int) $cnt->fetchColumn();
                if ($count > 4) {
                    $db->prepare('DELETE FROM '.self::T_PEERS.' WHERE room=:r AND peer_id=:p')
                        ->execute([':r' => $room, ':p' => $peerId]);
                    self::bad('room_full', 409);
                }

                $peers = $db->prepare('SELECT peer_id AS id, name FROM '.self::T_PEERS.' WHERE room=:r AND peer_id != :p');
                $peers->execute([':r' => $room, ':p' => $peerId]);
                echo json_encode(['peers' => $peers->fetchAll(\PDO::FETCH_ASSOC)]);
                break;
            }

            case 'poll': {
                $room = self::cleanRoom($body['room'] ?? null);
                $peerId = self::cleanPeer($body['peerId'] ?? null);

                $db->prepare('UPDATE '.self::T_PEERS.' SET seen_at=:t WHERE room=:r AND peer_id=:p')
                    ->execute([':t' => time(), ':r' => $room, ':p' => $peerId]);

                $sel = $db->prepare(
                    'SELECT id, from_peer AS "from", type, payload
                     FROM '.self::T_MESSAGES.' WHERE room=:r AND to_peer=:p ORDER BY id ASC'
                );
                $sel->execute([':r' => $room, ':p' => $peerId]);
                $rows = $sel->fetchAll(\PDO::FETCH_ASSOC);

                if ($rows) {
                    $ids = array_column($rows, 'id');
                    $in = implode(',', array_fill(0, count($ids), '?'));
                    $del = $db->prepare('DELETE FROM '.self::T_MESSAGES." WHERE id IN ($in)");
                    $del->execute($ids);
                    foreach ($rows as &$r) {
                        $r['payload'] = json_decode((string) $r['payload'], true);
                        unset($r['id']);
                    }
                    unset($r);
                }

                $peers = $db->prepare('SELECT peer_id AS id, name FROM '.self::T_PEERS.' WHERE room=:r AND peer_id != :p');
                $peers->execute([':r' => $room, ':p' => $peerId]);

                echo json_encode([
                    'peers' => $peers->fetchAll(\PDO::FETCH_ASSOC),
                    'messages' => $rows,
                ]);
                break;
            }

            case 'send': {
                $room = self::cleanRoom($body['room'] ?? null);
                $from = self::cleanPeer($body['from'] ?? null);
                $to = self::cleanPeer($body['to'] ?? null);
                $type = (string) ($body['type'] ?? '');
                if (!in_array($type, ['offer', 'answer', 'ice', 'bye'], true)) {
                    self::bad('bad_type');
                }

                $payload = json_encode($body['payload'] ?? null);
                if (strlen($payload) > 200_000) {
                    self::bad('payload_too_large', 413);
                }

                $db->prepare(
                    'INSERT INTO '.self::T_MESSAGES.'(room, from_peer, to_peer, type, payload, created_at)
                     VALUES(:r, :f, :t, :ty, :pl, :c)'
                )->execute([
                    ':r' => $room, ':f' => $from, ':t' => $to,
                    ':ty' => $type, ':pl' => $payload, ':c' => time(),
                ]);
                echo json_encode(['ok' => true]);
                break;
            }

            case 'leave': {
                $room = self::cleanRoom($body['room'] ?? null);
                $peerId = self::cleanPeer($body['peerId'] ?? null);
                $db->prepare('DELETE FROM '.self::T_PEERS.' WHERE room=:r AND peer_id=:p')
                    ->execute([':r' => $room, ':p' => $peerId]);
                echo json_encode(['ok' => true]);
                break;
            }

            case 'chat': {
                $room = self::cleanRoom($body['room'] ?? null);
                $from = self::cleanPeer($body['from'] ?? null);
                $text = trim((string) ($body['text'] ?? ''));
                $text = mb_substr($text, 0, 2000);
                if ($text === '') {
                    self::bad('empty_text');
                }

                $live = $db->prepare('SELECT 1 FROM '.self::T_PEERS.' WHERE room=:r AND peer_id=:p');
                $live->execute([':r' => $room, ':p' => $from]);
                if (!$live->fetchColumn()) {
                    self::bad('not_in_room');
                }

                $payload = json_encode(['text' => $text], JSON_THROW_ON_ERROR);
                if (strlen($payload) > 12_000) {
                    self::bad('payload_too_large', 413);
                }

                $others = $db->prepare('SELECT peer_id FROM '.self::T_PEERS.' WHERE room=:r AND peer_id != :p');
                $others->execute([':r' => $room, ':p' => $from]);
                /** @var list<string> $targets */
                $targets = $others->fetchAll(\PDO::FETCH_COLUMN);
                if ($targets === []) {
                    echo json_encode(['ok' => true, 'delivered' => 0]);
                    break;
                }

                $ins = $db->prepare(
                    'INSERT INTO '.self::T_MESSAGES.'(room, from_peer, to_peer, type, payload, created_at)
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
                self::bad('unknown_action');
        }
    }

    private static function bad(string $msg, int $code = 400): never
    {
        http_response_code($code);
        echo json_encode(['error' => $msg]);
        exit;
    }

    private static function connectRuntimeDb(string $dbPath, \PDO $primaryPdo): \PDO
    {
        try {
            $db = self::openSignalingDb($dbPath);
            self::ensureSchema($db);
            self::pruneOldRows($db);

            return $db;
        } catch (\Throwable $e) {
            error_log('Voice signaling: dedicated DB unavailable, falling back to primary DB: '.$e->getMessage());
        }

        try {
            self::ensureSchema($primaryPdo);
            self::pruneOldRows($primaryPdo);

            return $primaryPdo;
        } catch (\Throwable $e) {
            error_log('Voice signaling: primary DB fallback failed: '.$e->getMessage());
            self::bad('signaling_schema_unavailable', 503);
        }
    }

    private static function openSignalingDb(string $dbPath): \PDO
    {
        $dir = dirname($dbPath);
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException('failed to create storage directory: '.$dir);
        }

        if (!is_writable($dir)) {
            throw new \RuntimeException('storage directory is not writable: '.$dir);
        }

        try {
            $db = new \PDO('sqlite:'.$dbPath);
            $db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $db->setAttribute(\PDO::ATTR_DEFAULT_FETCH_MODE, \PDO::FETCH_ASSOC);
            $db->exec('PRAGMA busy_timeout=5000');
            try {
                $db->exec('PRAGMA journal_mode=WAL');
            } catch (\PDOException $e) {
                // Some hosts/storage backends reject WAL; continue with default journal mode.
                error_log('Voice signaling: WAL unavailable, using default journal mode: '.$e->getMessage());
            }

            return $db;
        } catch (\PDOException $e) {
            throw new \RuntimeException('failed to open sqlite DB: '.$e->getMessage(), 0, $e);
        }
    }

    private static function ensureSchema(\PDO $db): void
    {
        try {
            $db->exec('CREATE TABLE IF NOT EXISTS '.self::T_PEERS." (
                    room    TEXT NOT NULL,
                    peer_id TEXT NOT NULL,
                    name    TEXT NOT NULL DEFAULT '',
                    seen_at INTEGER NOT NULL,
                    PRIMARY KEY(room, peer_id)
                )");
            $db->exec('CREATE TABLE IF NOT EXISTS '.self::T_MESSAGES." (
                    id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    room      TEXT NOT NULL,
                    from_peer TEXT NOT NULL,
                    to_peer   TEXT NOT NULL,
                    type      TEXT NOT NULL,
                    payload   TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                )");
            $db->exec('CREATE INDEX IF NOT EXISTS idx_voice_msg_target ON '.self::T_MESSAGES.'(room, to_peer, id)');
            $db->exec('CREATE INDEX IF NOT EXISTS idx_voice_peers_room ON '.self::T_PEERS.'(room)');
        } catch (\PDOException $e) {
            throw new \RuntimeException('failed to initialize schema: '.$e->getMessage(), 0, $e);
        }
    }

    private static function pruneOldRows(\PDO $db): void
    {
        $cutoff = time() - 600;
        try {
            $db->prepare('DELETE FROM '.self::T_PEERS.' WHERE seen_at < :c')->execute([':c' => $cutoff]);
            $db->prepare('DELETE FROM '.self::T_MESSAGES.' WHERE created_at < :c')->execute([':c' => $cutoff]);
        } catch (\PDOException $e) {
            throw new \RuntimeException('failed to prune rows: '.$e->getMessage(), 0, $e);
        }
    }

    private static function cleanRoom(mixed $room): string
    {
        if (!is_string($room) || !preg_match('/^[A-Za-z0-9_-]{4,64}$/', $room)) {
            self::bad('invalid_room');
        }

        return $room;
    }

    private static function cleanPeer(mixed $p): string
    {
        if (!is_string($p) || !preg_match('/^[A-Za-z0-9_-]{4,64}$/', $p)) {
            self::bad('invalid_peer');
        }

        return $p;
    }
}
