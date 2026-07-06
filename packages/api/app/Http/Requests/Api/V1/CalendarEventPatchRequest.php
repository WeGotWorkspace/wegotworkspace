<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/** PATCH body for partial CalendarEvent updates. */
final class CalendarEventPatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            '@type' => ['prohibited'],
            'id' => ['prohibited'],
            'calendarIds' => ['sometimes', 'array', 'min:1'],
            'uid' => ['sometimes', 'string', 'max:255'],
            'title' => ['sometimes', 'string', 'max:4096'],
            'description' => ['sometimes', 'string', 'max:8192'],
            'start' => ['sometimes', 'string'],
            'end' => ['sometimes', 'string'],
            'duration' => ['sometimes', 'string', 'max:64'],
            'showWithoutTime' => ['sometimes', 'boolean'],
            'timeZone' => ['sometimes', 'string', 'max:128'],
            'locations' => ['sometimes', 'array'],
            'recurrenceRules' => ['sometimes', 'array'],
            'excludedRecurrenceDates' => ['sometimes', 'array'],
            'recurrenceOverrides' => ['sometimes', 'array'],
            'freeBusyStatus' => ['sometimes', 'string', 'in:busy,free,tentative'],
            'privacy' => ['sometimes', 'string', 'in:public,private,secret'],
            'status' => ['sometimes', 'string', 'in:confirmed,cancelled,tentative'],
            'participants' => ['sometimes', 'array'],
            'alerts' => ['sometimes', 'array'],
            'categories' => ['sometimes', 'array'],
            'priority' => ['sometimes', 'integer', 'min:0', 'max:9'],
            'sequence' => ['sometimes', 'integer', 'min:0'],
            'created' => ['sometimes', 'string'],
            'updated' => ['sometimes', 'string'],
            'icsProps' => ['sometimes', 'array'],
        ];
    }
}
