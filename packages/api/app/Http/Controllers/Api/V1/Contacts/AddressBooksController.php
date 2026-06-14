<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Contacts;

use App\Http\Middleware\AuthenticateWgwApi;
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
}
