<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Collab;

use App\Services\Collab\DocCollabDocumentService;
use App\Services\Collab\DocCollabSignalingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CollabController
{
    public function __construct(
        private DocCollabSignalingService $collab,
        private DocCollabDocumentService $documents,
    ) {}

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

    public function rtc(): JsonResponse
    {
        return response()->json(['rtc' => $this->collab->rtcSettings()]);
    }

    public function getDocument(Request $request): Response
    {
        $room = $request->query('room');
        if ($request->query('format') === 'yjs') {
            $binary = $this->documents->getYjsBinary($request, $room);
            if ($binary === null) {
                return response('', 204);
            }

            return response($binary, 200, [
                'Content-Type' => 'application/octet-stream',
            ]);
        }

        return response(
            $this->documents->getMarkdown($request, $room),
            200,
            ['Content-Type' => 'text/markdown; charset=utf-8']
        );
    }

    public function putDocument(Request $request): JsonResponse
    {
        return response()->json($this->documents->put($request, $request->json()->all()));
    }
}
