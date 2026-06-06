<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Meet;

use App\Services\Meet\MeetSignalingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class MeetController
{
    public function __construct(private MeetSignalingService $meet) {}

    public function room(Request $request): JsonResponse
    {
        return response()->json($this->meet->roomStatus($request->json()->all()));
    }

    public function rtc(): JsonResponse
    {
        return response()->json(['rtc' => $this->meet->rtcSettings()]);
    }

    public function join(Request $request): JsonResponse
    {
        return response()->json($this->meet->join($request, $request->json()->all()));
    }

    public function poll(Request $request): JsonResponse
    {
        return response()->json($this->meet->poll($request, $request->json()->all()));
    }

    public function send(Request $request): JsonResponse
    {
        return response()->json($this->meet->send($request, $request->json()->all()));
    }

    public function leave(Request $request): JsonResponse
    {
        return response()->json($this->meet->leave($request, $request->json()->all()));
    }

    public function chat(Request $request): JsonResponse
    {
        return response()->json($this->meet->chat($request, $request->json()->all()));
    }
}
