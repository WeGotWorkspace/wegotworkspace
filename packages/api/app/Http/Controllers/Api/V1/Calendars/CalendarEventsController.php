<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Calendars;

use App\Exceptions\ApiHttpException;
use App\Http\Middleware\AuthenticateWgwApi;
use App\Http\Requests\Api\V1\CalendarEventPatchRequest;
use App\Http\Requests\Api\V1\CalendarEventUpsertRequest;
use App\Http\Support\JmapResourceResponse;
use App\Services\Calendars\CalendarEventRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CalendarEventsController
{
    public function __construct(private readonly CalendarEventRepository $events) {}

    public function index(Request $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        $calendarId = $request->query('calendarId');
        if (! is_string($calendarId) || trim($calendarId) === '') {
            throw new ApiHttpException(400, 'calendarId is required.', 'bad_request');
        }

        return response()->json($this->events->list($principal['username'], $calendarId));
    }

    public function show(Request $request, string $eventId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return JmapResourceResponse::json($this->events->show($principal['username'], $eventId));
    }

    public function store(CalendarEventUpsertRequest $request): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return JmapResourceResponse::json(
            $this->events->create($principal['username'], $request->json()->all()),
            201,
        );
    }

    public function update(CalendarEventUpsertRequest $request, string $eventId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return JmapResourceResponse::json(
            $this->events->update(
                $principal['username'],
                $eventId,
                $request->json()->all(),
                $this->ifMatch($request),
                $this->ifUnmodifiedSince($request),
            )
        );
    }

    public function patch(CalendarEventPatchRequest $request, string $eventId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return JmapResourceResponse::json(
            $this->events->patch(
                $principal['username'],
                $eventId,
                $request->json()->all(),
                $this->ifMatch($request),
                $this->ifUnmodifiedSince($request),
            )
        );
    }

    public function destroy(Request $request, string $eventId): JsonResponse
    {
        /** @var array{username: string, role: string} $principal */
        $principal = $request->attributes->get(AuthenticateWgwApi::PRINCIPAL_ATTRIBUTE);

        return response()->json(
            $this->events->delete(
                $principal['username'],
                $eventId,
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
