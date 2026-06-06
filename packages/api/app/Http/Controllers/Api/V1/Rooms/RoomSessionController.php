<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Rooms;

use App\Exceptions\ApiHttpException;
use App\Services\Collab\DocCollabSignalingService;
use App\Services\Meet\MeetSignalingService;
use App\Services\Rtc\RoomIdCodec;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RoomSessionController
{
    public function __construct(
        private RoomIdCodec $roomIds,
        private MeetSignalingService $meet,
        private DocCollabSignalingService $collab,
    ) {}

    public function storeParticipant(Request $request, string $roomId): JsonResponse
    {
        $decoded = $this->decodeRoom($roomId);
        $body = $this->bodyWithRoom($request, $decoded['room']);

        return match ($decoded['channel']) {
            'meet' => response()->json($this->meet->join($request, $body)),
            'collab' => response()->json($this->collab->join($request, $body)),
        };
    }

    public function indexEvents(Request $request, string $roomId): JsonResponse
    {
        $decoded = $this->decodeRoom($roomId);
        $body = $this->bodyWithRoom($request, $decoded['room']);
        $body['peerId'] = $body['peerId'] ?? $request->query('peerId');
        $body['since'] = $body['since'] ?? $request->query('since', 0);
        if ($request->query('sessionKey') !== null) {
            $body['sessionKey'] = $request->query('sessionKey');
        }

        return match ($decoded['channel']) {
            'meet' => response()->json($this->meet->poll($request, $body)),
            'collab' => response()->json($this->collab->poll($request, $body)),
        };
    }

    public function storeEvent(Request $request, string $roomId): JsonResponse
    {
        $decoded = $this->decodeRoom($roomId);
        $body = $this->bodyWithRoom($request, $decoded['room']);

        return match ($decoded['channel']) {
            'meet' => response()->json($this->meet->send($request, $body)),
            'collab' => response()->json($this->collab->send($request, $body)),
        };
    }

    public function destroyParticipant(Request $request, string $roomId, string $participantId): JsonResponse
    {
        $decoded = $this->decodeRoom($roomId);
        $body = $this->bodyWithRoom($request, $decoded['room']);
        $body['peerId'] = $participantId === 'me'
            ? ($body['peerId'] ?? $request->query('peerId'))
            : $participantId;

        return match ($decoded['channel']) {
            'meet' => response()->json($this->meet->leave($request, $body)),
            'collab' => response()->json($this->collab->leave($request, $body)),
        };
    }

    public function configuration(string $roomId): JsonResponse
    {
        $decoded = $this->decodeRoom($roomId);

        return match ($decoded['channel']) {
            'meet' => response()->json(['rtc' => $this->meet->rtcSettings()]),
            'collab' => response()->json(['rtc' => $this->collab->rtcSettings()]),
        };
    }

    public function storeMessage(Request $request, string $roomId): JsonResponse
    {
        $decoded = $this->decodeRoom($roomId);
        if ($decoded['channel'] !== 'meet') {
            throw new ApiHttpException(405, 'Chat is only supported in meeting rooms.', 'method_not_allowed');
        }

        $body = $this->bodyWithRoom($request, $decoded['room']);

        return response()->json($this->meet->chat($request, $body));
    }

    /**
     * @return array{channel: 'meet'|'collab', room: string}
     */
    private function decodeRoom(string $roomId): array
    {
        try {
            return $this->roomIds->decode($roomId);
        } catch (\InvalidArgumentException $e) {
            throw new ApiHttpException(400, $e->getMessage(), 'bad_request');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function bodyWithRoom(Request $request, string $room): array
    {
        $body = $request->json()->all();
        if (! is_array($body)) {
            $body = [];
        }
        $body['room'] = $room;

        return $body;
    }
}
