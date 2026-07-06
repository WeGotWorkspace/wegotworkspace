<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Calendars;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\CalendarCreateRequest;
use App\Http\Requests\Api\V1\CalendarDeleteRequest;
use App\Http\Requests\Api\V1\CalendarPatchRequest;
use App\Services\Calendars\CalendarRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CalendarsController
{
    public function __construct(private readonly CalendarRepository $calendars) {}

    public function index(Request $request): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->calendars->list($principal['username']));
    }

    public function show(Request $request, string $calendarId): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->calendars->show($principal['username'], $calendarId));
    }

    public function store(CalendarCreateRequest $request): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->calendars->create($principal['username'], $request->validated()), 201);
    }

    public function update(CalendarPatchRequest $request, string $calendarId): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->calendars->update($principal['username'], $calendarId, $request->validated()));
    }

    public function destroy(CalendarDeleteRequest $request, string $calendarId): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->calendars->delete($principal['username'], $calendarId, $request->validated()));
    }

    public function changes(Request $request): JsonResponse
    {
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);
        $since = $request->query('since');

        return response()->json($this->calendars->changes($principal['username'], is_string($since) ? $since : null));
    }
}
