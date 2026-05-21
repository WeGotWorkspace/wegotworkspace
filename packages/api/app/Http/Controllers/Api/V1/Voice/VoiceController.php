<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Voice;

use App\Services\Voice\VoiceSignalingRouter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class VoiceController
{
    public function __construct(private VoiceSignalingRouter $voice)
    {
    }

    public function room(Request $request): JsonResponse
    {
        return response()->json($this->voice->room($request->json()->all()));
    }

    public function join(Request $request): JsonResponse
    {
        return response()->json($this->voice->join($request, $request->json()->all()));
    }

    public function poll(Request $request): JsonResponse
    {
        return response()->json($this->voice->poll($request, $request->json()->all()));
    }

    public function send(Request $request): JsonResponse
    {
        return response()->json($this->voice->send($request, $request->json()->all()));
    }

    public function leave(Request $request): JsonResponse
    {
        return response()->json($this->voice->leave($request, $request->json()->all()));
    }

    public function chat(Request $request): JsonResponse
    {
        return response()->json($this->voice->chat($request, $request->json()->all()));
    }
}
