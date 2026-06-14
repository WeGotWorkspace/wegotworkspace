<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Contacts;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\AddressBookCreateRequest;
use App\Http\Requests\Api\V1\AddressBookDeleteRequest;
use App\Http\Requests\Api\V1\AddressBookPatchRequest;
use App\Services\Contacts\AddressBookRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AddressBooksController
{
    public function __construct(private readonly AddressBookRepository $addressBooks) {}

    public function index(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->addressBooks->list($principal['username']));
    }

    public function show(Request $request, string $addressBookId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->addressBooks->show($principal['username'], $addressBookId));
    }

    public function store(AddressBookCreateRequest $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->addressBooks->create($principal['username'], $request->validated()),
            201,
        );
    }

    public function update(AddressBookPatchRequest $request, string $addressBookId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->addressBooks->update($principal['username'], $addressBookId, $request->validated()),
        );
    }

    public function destroy(AddressBookDeleteRequest $request, string $addressBookId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->addressBooks->delete($principal['username'], $addressBookId, $request->validated()),
        );
    }

    public function changes(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $since = $request->query('since');
        $sinceToken = is_string($since) ? $since : null;

        return response()->json(
            $this->addressBooks->changes($principal['username'], $sinceToken),
        );
    }
}
