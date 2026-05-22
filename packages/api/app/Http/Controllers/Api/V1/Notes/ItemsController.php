<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Notes;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\NoteUpsertRequest;
use App\Services\Notes\NoteRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ItemsController
{
    public function __construct(private NoteRepository $notes) {}

    public function index(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->notes->list($principal['username'], $request->query()));
    }

    public function store(NoteUpsertRequest $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->notes->upsert($principal['username'], null, $request->validated()),
            201
        );
    }

    public function update(NoteUpsertRequest $request, string $id): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->notes->upsert($principal['username'], $id, $request->validated())
        );
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->notes->delete($principal['username'], $id, $request->json()->all())
        );
    }

    public function archive(Request $request, string $id): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->notes->setArchived($principal['username'], $id, true)
        );
    }

    public function restore(Request $request, string $id): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->notes->setArchived($principal['username'], $id, false)
        );
    }
}
