<?php
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$mdPath = __DIR__ . '/document.md';
$yjsPath = __DIR__ . '/document.yjs';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['format']) && $_GET['format'] === 'yjs') {
        header('Content-Type: application/octet-stream');
        if (is_file($yjsPath) && filesize($yjsPath) > 0) {
            readfile($yjsPath);
        } else {
            http_response_code(204);
        }
        exit;
    }

    header('Content-Type: text/markdown; charset=utf-8');
    if (is_file($mdPath)) {
        readfile($mdPath);
    } else {
        echo "# Collaborative document\n\nStart typing…\n";
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($contentType, 'application/json')) {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw ?: '', true);
        if (!is_array($data)) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'invalid json']);
            exit;
        }
        if (isset($data['markdown']) && is_string($data['markdown'])) {
            file_put_contents($mdPath, $data['markdown'], LOCK_EX);
        }
        if (isset($data['yjs']) && is_array($data['yjs'])) {
            $bytes = '';
            foreach ($data['yjs'] as $byte) {
                if (!is_int($byte) || $byte < 0 || $byte > 255) {
                    http_response_code(400);
                    header('Content-Type: application/json');
                    echo json_encode(['error' => 'invalid yjs bytes']);
                    exit;
                }
                $bytes .= chr($byte);
            }
            file_put_contents($yjsPath, $bytes, LOCK_EX);
        }
        header('Content-Type: application/json');
        echo json_encode(['ok' => true]);
        exit;
    }

    $body = file_get_contents('php://input');
    if ($body === false) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'empty body']);
        exit;
    }
    file_put_contents($mdPath, $body, LOCK_EX);
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'bytes' => strlen($body)]);
    exit;
}

http_response_code(405);
header('Content-Type: application/json');
echo json_encode(['error' => 'GET or POST only']);
