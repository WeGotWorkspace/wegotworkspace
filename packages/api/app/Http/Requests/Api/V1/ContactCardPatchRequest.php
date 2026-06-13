<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * PATCH body for partial ContactCard updates (deep merge semantics).
 *
 * Forbids server-owned root fields `id`, `@type`, and `version` (same as POST).
 * All contact fields are optional; omit fields to leave them unchanged.
 */
final class ContactCardPatchRequest extends FormRequest
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
        return array_merge($this->writableFieldRules(), [
            '@type' => ['prohibited'],
            'version' => ['prohibited'],
            'id' => ['prohibited'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function writableFieldRules(): array
    {
        return [
            'addressBookIds' => ['sometimes', 'array'],
            'addressBookIds.*' => ['nullable', 'boolean'],
            'uid' => ['sometimes', 'string', 'max:255'],
            'name' => ['sometimes', 'array'],
            'name.full' => ['sometimes', 'string', 'max:4096'],
            'emails' => ['sometimes', 'array'],
            'emails.*' => ['nullable', 'array'],
            'phones' => ['sometimes', 'array'],
            'phones.*' => ['nullable', 'array'],
            'addresses' => ['sometimes', 'array'],
            'addresses.*' => ['nullable', 'array'],
            'organizations' => ['sometimes', 'array'],
            'organizations.*' => ['nullable', 'array'],
            'notes' => ['sometimes', 'array'],
            'notes.*' => ['nullable', 'array'],
            'media' => ['sometimes', 'array'],
            'media.*' => ['nullable', 'array'],
            'keywords' => ['sometimes', 'array'],
            'keywords.*' => ['nullable', 'boolean'],
            'members' => ['sometimes', 'array'],
            'members.*' => ['nullable', 'boolean'],
            'nicknames' => ['sometimes', 'array'],
            'nicknames.*' => ['nullable', 'array'],
            'titles' => ['sometimes', 'array'],
            'titles.*' => ['nullable', 'array'],
            'links' => ['sometimes', 'array'],
            'links.*' => ['nullable', 'array'],
            'onlineServices' => ['sometimes', 'array'],
            'onlineServices.*' => ['nullable', 'array'],
            'kind' => ['sometimes', 'string'],
            'language' => ['sometimes', 'string', 'max:64'],
            'prodId' => ['sometimes', 'string', 'max:255'],
            'created' => ['sometimes', 'string'],
            'updated' => ['sometimes', 'string'],
        ];
    }
}
