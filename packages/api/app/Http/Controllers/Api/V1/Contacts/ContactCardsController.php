<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Contacts;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\ContactCardPatchRequest;
use App\Http\Requests\Api\V1\ContactCardQueryRequest;
use App\Http\Requests\Api\V1\ContactCardUpsertRequest;
use App\Http\Support\JmapResourceResponse;
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

        $uid = $request->query('uid');
        $uidFilter = is_string($uid) && trim($uid) !== '' ? trim($uid) : null;

        return response()->json($this->cards->list($principal['username'], $addressBookId, $uidFilter));
    }

    public function query(ContactCardQueryRequest $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $validated = $request->validated();
        $filter = is_array($validated['filter'] ?? null) ? $validated['filter'] : [];
        $limit = isset($validated['limit']) ? (int) $validated['limit'] : null;

        return response()->json(
            $this->cards->query($principal['username'], $filter, $limit),
        );
    }

    public function changes(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $addressBookId = $request->query('addressBookId');
        if (! is_string($addressBookId) || trim($addressBookId) === '') {
            throw new ApiHttpException(400, 'addressBookId is required.', 'bad_request');
        }

        $since = $request->query('since');
        $sinceToken = is_string($since) ? $since : null;

        return response()->json(
            $this->cards->changes($principal['username'], $addressBookId, $sinceToken),
        );
    }

    public function show(Request $request, string $cardId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return JmapResourceResponse::json($this->cards->show($principal['username'], $cardId));
    }

    public function store(ContactCardUpsertRequest $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return JmapResourceResponse::json(
            $this->cards->create($principal['username'], $request->json()->all()),
            201,
        );
    }

    public function update(ContactCardUpsertRequest $request, string $cardId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return JmapResourceResponse::json(
            $this->cards->update(
                $principal['username'],
                $cardId,
                $request->json()->all(),
                $this->ifMatch($request),
                $this->ifUnmodifiedSince($request),
            )
        );
    }

    public function patch(ContactCardPatchRequest $request, string $cardId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return JmapResourceResponse::json(
            $this->cards->patch(
                $principal['username'],
                $cardId,
                $request->json()->all(),
                $this->ifMatch($request),
                $this->ifUnmodifiedSince($request),
            )
        );
    }

    public function destroy(Request $request, string $cardId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->cards->delete(
                $principal['username'],
                $cardId,
                $this->ifMatch($request),
                $this->ifUnmodifiedSince($request),
            )
        );
    }

    private function ifMatch(Request $request): ?string
    {
        $value = $request->header('If-Match');

        return is_string($value) && $value !== '' ? $value : null;
    }

    private function ifUnmodifiedSince(Request $request): ?string
    {
        $value = $request->header('If-Unmodified-Since');

        return is_string($value) && $value !== '' ? $value : null;
    }
}
