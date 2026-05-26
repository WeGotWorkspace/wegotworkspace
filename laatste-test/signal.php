<?php
declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$stateFile = __DIR__ . '/.signaling-state.json';
const PEER_TIMEOUT = 30;
const MAX_MESSAGES = 1000;

function loadState(string $path): array
{
    if (!is_file($path)) {
        return ['peers' => [], 'messages' => [], 'nextId' => 1];
    }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data)) {
        return ['peers' => [], 'messages' => [], 'nextId' => 1];
    }
    $data['peers'] ??= [];
    $data['messages'] ??= [];
    $data['nextId'] ??= 1;
    return $data;
}

function saveState(string $path, array $state): void
{
    file_put_contents($path, json_encode($state), LOCK_EX);
}

function cleanup(array &$state): void
{
    $now = time();
    foreach ($state['peers'] as $id => $peer) {
        if ($now - (int) ($peer['lastSeen'] ?? 0) > PEER_TIMEOUT) {
            unset($state['peers'][$id]);
        }
    }
    $alive = array_keys($state['peers']);
    $state['messages'] = array_values(array_filter(
        $state['messages'],
        static fn(array $m): bool => in_array($m['from'], $alive, true) && in_array($m['to'], $alive, true)
    ));
}

function peerList(array $state, string $selfId): array
{
    $list = [];
    foreach ($state['peers'] as $id => $peer) {
        if ($id !== $selfId) {
            $list[] = ['id' => $id, 'name' => $peer['name']];
        }
    }
    return $list;
}

$input = json_decode((string) file_get_contents('php://input'), true) ?? [];
$action = $input['action'] ?? ($_GET['action'] ?? '');

$state = loadState($stateFile);
cleanup($state);

switch ($action) {
    case 'join':
        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            http_response_code(400);
            echo json_encode(['error' => 'name required']);
            exit;
        }
        $id = bin2hex(random_bytes(8));
        $state['peers'][$id] = ['name' => $name, 'lastSeen' => time()];
        saveState($stateFile, $state);
        echo json_encode([
            'peerId' => $id,
            'peers' => peerList($state, $id),
        ]);
        break;

    case 'poll':
        $peerId = (string) ($input['peerId'] ?? '');
        if (!isset($state['peers'][$peerId])) {
            http_response_code(404);
            echo json_encode(['error' => 'unknown peer — refresh and join again']);
            exit;
        }
        $state['peers'][$peerId]['lastSeen'] = time();
        $since = (int) ($input['since'] ?? 0);
        $messages = array_values(array_filter(
            $state['messages'],
            static fn(array $m): bool => $m['to'] === $peerId && $m['id'] > $since
        ));
        saveState($stateFile, $state);
        echo json_encode([
            'peers' => peerList($state, $peerId),
            'messages' => $messages,
        ]);
        break;

    case 'signal':
        $from = (string) ($input['peerId'] ?? '');
        $to = (string) ($input['to'] ?? '');
        $type = (string) ($input['type'] ?? '');
        $payload = $input['payload'] ?? null;

        if (!isset($state['peers'][$from], $state['peers'][$to])) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid peer']);
            exit;
        }
        if (!in_array($type, ['offer', 'answer', 'ice'], true)) {
            http_response_code(400);
            echo json_encode(['error' => 'invalid signal type']);
            exit;
        }

        $msgId = (int) $state['nextId'];
        $state['nextId'] = $msgId + 1;
        $state['messages'][] = [
            'id' => $msgId,
            'from' => $from,
            'to' => $to,
            'type' => $type,
            'payload' => $payload,
        ];
        if (count($state['messages']) > MAX_MESSAGES) {
            $state['messages'] = array_slice($state['messages'], -MAX_MESSAGES);
        }
        $state['peers'][$from]['lastSeen'] = time();
        saveState($stateFile, $state);
        echo json_encode(['ok' => true]);
        break;

    case 'leave':
        $peerId = (string) ($input['peerId'] ?? '');
        unset($state['peers'][$peerId]);
        $state['messages'] = array_values(array_filter(
            $state['messages'],
            static fn(array $m): bool => $m['from'] !== $peerId && $m['to'] !== $peerId
        ));
        saveState($stateFile, $state);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'unknown action', 'actions' => ['join', 'poll', 'signal', 'leave']]);
}
