<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST/PUT body for CalendarEvent upsert.
 *
 * POST forbids server-owned root fields `id` and `@type`.
 * PUT forbids `@type`; `id` may be sent but the path parameter wins.
 */
final class CalendarEventUpsertRequest extends FormRequest
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
        return $this->isMethod('POST')
            ? $this->storeRules()
            : $this->updateRules();
    }

    /**
     * @return array<string, mixed>
     */
    private function storeRules(): array
    {
        return array_merge($this->writableFieldRules(), [
            '@type' => ['prohibited'],
            'id' => ['prohibited'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function updateRules(): array
    {
        return array_merge($this->writableFieldRules(), [
            '@type' => ['prohibited'],
            'id' => ['sometimes', 'string', 'max:255'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function writableFieldRules(): array
    {
        return [
            'calendarIds' => ['required', 'array', 'min:1'],
            'uid' => ['sometimes', 'string', 'max:255'],
            'title' => ['sometimes', 'string', 'max:4096'],
            'description' => ['sometimes', 'string', 'max:8192'],
            'start' => ['required', 'string'],
            'end' => ['sometimes', 'string'],
            'duration' => ['sometimes', 'string', 'max:64'],
            'showWithoutTime' => ['sometimes', 'boolean'],
            'timeZone' => ['sometimes', 'string', 'max:128'],
            'locations' => ['sometimes', 'array'],
            'recurrenceRules' => ['sometimes', 'array'],
            'excludedRecurrenceDates' => ['sometimes', 'array'],
            'freeBusyStatus' => ['sometimes', 'string', 'in:busy,free,tentative'],
            'privacy' => ['sometimes', 'string', 'in:public,private,secret'],
            'status' => ['sometimes', 'string', 'in:confirmed,cancelled,tentative'],
            'participants' => ['sometimes', 'array'],
            'categories' => ['sometimes', 'array'],
            'priority' => ['sometimes', 'integer', 'min:0', 'max:9'],
            'sequence' => ['sometimes', 'integer', 'min:0'],
            'created' => ['sometimes', 'string'],
            'updated' => ['sometimes', 'string'],
            'icsProps' => ['sometimes', 'array'],
        ];
    }
}
