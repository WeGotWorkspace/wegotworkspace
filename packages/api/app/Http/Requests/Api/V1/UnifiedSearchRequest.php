<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UnifiedSearchRequest extends FormRequest
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
            'q' => ['required', 'string', 'min:2', 'max:512'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sources' => ['sometimes', 'array'],
            'sources.*' => ['string', Rule::in(['file', 'caldav', 'carddav'])],
        ];
    }
}
