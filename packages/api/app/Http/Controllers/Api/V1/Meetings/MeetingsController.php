<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Services\Meet\MeetSignalingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class MeetingsController
{
    public function __construct(private MeetSignalingService $meet) {}

    public function store(Request $request): JsonResponse
    {
        $body = $request->json()->all();
        $roomId = is_string($body['room'] ?? null) && $body['room'] !== ''
            ? $body['room']
            : bin2hex(random_bytes(8));

        $status = $this->meet->roomStatus(['room' => $roomId]);

        return response()->json([
            'roomId' => $roomId,
            'active' => $status['active'],
        ], 201);
    }

    public function show(string $roomId): JsonResponse
    {
        $status = $this->meet->roomStatus(['room' => $roomId]);

        return response()->json($status);
    }
}
