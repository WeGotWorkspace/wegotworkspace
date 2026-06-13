<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST/PUT body for ContactCard upsert.
 *
 * POST (create) forbids server-owned root fields `id`, `@type`, and `version`.
 * PUT forbids `@type` and `version`; `id` may be sent but the path parameter wins.
 * Nested JSContact map values may omit `@type` per RFC 9553 §1.3.4.
 */
final class ContactCardUpsertRequest extends FormRequest
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
            'version' => ['prohibited'],
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
            'version' => ['prohibited'],
            'id' => ['sometimes', 'string', 'max:255'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function writableFieldRules(): array
    {
        return [
            'addressBookIds' => ['required', 'array', 'min:1'],
            'uid' => ['sometimes', 'string', 'max:255'],
            'name' => ['sometimes', 'array'],
            'name.full' => ['sometimes', 'string', 'max:4096'],
            'emails' => ['sometimes', 'array'],
            'phones' => ['sometimes', 'array'],
            'addresses' => ['sometimes', 'array'],
            'organizations' => ['sometimes', 'array'],
            'notes' => ['sometimes', 'array'],
            'media' => ['sometimes', 'array'],
            'keywords' => ['sometimes', 'array'],
            'members' => ['sometimes', 'array'],
            'nicknames' => ['sometimes', 'array'],
            'titles' => ['sometimes', 'array'],
            'links' => ['sometimes', 'array'],
            'onlineServices' => ['sometimes', 'array'],
            'kind' => ['sometimes', 'string'],
            'language' => ['sometimes', 'string', 'max:64'],
            'prodId' => ['sometimes', 'string', 'max:255'],
            'created' => ['sometimes', 'string'],
            'updated' => ['sometimes', 'string'],
        ];
    }
}
