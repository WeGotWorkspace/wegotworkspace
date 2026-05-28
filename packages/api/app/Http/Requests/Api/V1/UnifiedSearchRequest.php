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
            'categories' => ['sometimes', 'array'],
            'categories.*' => ['string', 'min:1', 'max:64'],
            'extensions' => ['sometimes', 'array'],
            'extensions.*' => ['string', 'min:1', 'max:32'],
            'modified_from' => ['sometimes', 'integer', 'min:0'],
            'modified_to' => ['sometimes', 'integer', 'min:0', 'gte:modified_from'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'sources' => $this->normalizeListParam($this->input('sources')),
            'categories' => $this->normalizeListParam($this->input('categories')),
            'extensions' => array_map(
                static fn (string $value): string => strtolower($value),
                $this->normalizeListParam($this->input('extensions'))
            ),
        ]);
    }

    /**
     * @return list<string>
     */
    private function normalizeListParam(mixed $value): array
    {
        if (is_string($value)) {
            $parts = preg_split('/\s*,\s*/', trim($value)) ?: [];

            return array_values(array_filter(array_map('trim', $parts), static fn (string $v): bool => $v !== ''));
        }
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_filter(
            array_map(static fn (mixed $item): string => is_string($item) ? trim($item) : '', $value),
            static fn (string $v): bool => $v !== ''
        ));
    }
}
