<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Notes;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\NotebookCreateRequest;
use App\Http\Requests\Api\V1\NotebookDeleteRequest;
use App\Http\Requests\Api\V1\NotebookRenameRequest;
use App\Services\Notes\NoteRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class NotebooksController
{
    public function __construct(private NoteRepository $notes)
    {
    }

    public function index(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->notes->listNotebooks($principal['username']));
    }

    public function store(NotebookCreateRequest $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->notes->createNotebook($principal['username'], $request->validated()),
            201
        );
    }

    public function update(NotebookRenameRequest $request, string $name): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->notes->renameNotebook($principal['username'], rawurldecode($name), $request->validated())
        );
    }

    public function destroy(NotebookDeleteRequest $request, string $name): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->notes->deleteNotebook($principal['username'], rawurldecode($name), $request->validated())
        );
    }
}
