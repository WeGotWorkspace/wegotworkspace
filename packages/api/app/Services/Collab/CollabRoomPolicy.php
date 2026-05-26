<?php

declare(strict_types=1);

namespace App\Services\Collab;

/**
 * Room id validation for collab signaling and document persistence.
 */
final class CollabRoomPolicy
{
    public function cleanRoom(mixed $room): string
    {
        if (! is_string($room) || ! preg_match('/^[A-Za-z0-9._~\/ -]{4,190}$/', $room)) {
            $this->fail('invalid_room');
        }

        return $room;
    }

    /**
     * Drive virtual path to a markdown or plain-text document.
     */
    public function cleanDocumentPath(mixed $room): string
    {
        $room = $this->cleanRoom($room);
        if (! preg_match('/\.(md|txt)$/i', $room)) {
            $this->fail('invalid_document_path');
        }

        return $room;
    }

    private function fail(string $error, int $status = 400, ?string $message = null): never
    {
        $payload = ['error' => $error];
        if ($message !== null) {
            $payload['message'] = $message;
        }
        throw new CollabResponseException($status, $payload);
    }
}
