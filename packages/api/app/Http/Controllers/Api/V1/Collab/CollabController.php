<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Collab;

use App\Services\Collab\DocCollabSignalingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CollabController
{
    public function __construct(private DocCollabSignalingService $collab) {}

    public function join(Request $request): JsonResponse
    {
        return response()->json($this->collab->join($request, $request->json()->all()));
    }

    public function poll(Request $request): JsonResponse
    {
        return response()->json($this->collab->poll($request, $request->json()->all()));
    }

    public function send(Request $request): JsonResponse
    {
        return response()->json($this->collab->send($request, $request->json()->all()));
    }

    public function leave(Request $request): JsonResponse
    {
        return response()->json($this->collab->leave($request, $request->json()->all()));
    }
}
