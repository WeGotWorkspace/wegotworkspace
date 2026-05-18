<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class NoteUpsertRequest extends FormRequest
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
            'id' => ['sometimes', 'string', 'max:120'],
            'notebook' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:4096'],
            'body' => ['required', 'string'],
            'tags' => ['required', 'array'],
            'tags.*' => ['string', 'max:120'],
            'starred' => ['sometimes', 'boolean'],
            'archived' => ['required', 'boolean'],
        ];
    }
}
