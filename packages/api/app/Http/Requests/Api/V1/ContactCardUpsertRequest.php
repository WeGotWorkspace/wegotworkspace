<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

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
        return [
            '@type' => ['required', 'string', 'in:Card'],
            'version' => ['required', 'string', 'in:1.0'],
            'uid' => ['required', 'string', 'max:255'],
            'addressBookIds' => ['required', 'array', 'min:1'],
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
