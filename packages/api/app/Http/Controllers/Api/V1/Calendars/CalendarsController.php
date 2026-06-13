<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Calendars;

use App\Http\Middleware\AuthenticateWgwApi;
use App\Services\Calendars\CalendarRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CalendarsController
{
    public function __construct(private readonly CalendarRepository $calendars) {}

    public function index(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->calendars->list($principal['username']));
    }

    public function show(Request $request, string $calendarId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json($this->calendars->show($principal['username'], $calendarId));
    }
}
