<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Contacts;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\ContactCardPatchRequest;
use App\Http\Requests\Api\V1\ContactCardUpsertRequest;
use App\Services\Contacts\ContactCardRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ContactCardsController
{
    public function __construct(private readonly ContactCardRepository $cards) {}

    public function index(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $addressBookId = $request->query('addressBookId');
        if (! is_string($addressBookId) || trim($addressBookId) === '') {
            throw new ApiHttpException(400, 'addressBookId is required.', 'bad_request');
        }

        return response()->json($this->cards->list($principal['username'], $addressBookId));
    }

    public function show(Request $request, string $cardId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->cards->show($principal['username'], $cardId));
    }

    public function store(ContactCardUpsertRequest $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->cards->create($principal['username'], $request->json()->all()),
            201
        );
    }

    public function update(ContactCardUpsertRequest $request, string $cardId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->cards->update($principal['username'], $cardId, $request->json()->all())
        );
    }

    public function patch(ContactCardPatchRequest $request, string $cardId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->cards->patch($principal['username'], $cardId, $request->json()->all())
        );
    }

    public function destroy(Request $request, string $cardId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->cards->delete($principal['username'], $cardId));
    }
}
