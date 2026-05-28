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
            'sources.*' => ['string', Rule::in(['file', 'note', 'caldav', 'carddav'])],
            'categories' => ['sometimes', 'array'],
            'categories.*' => ['string', 'min:1', 'max:64'],
            'extensions' => ['sometimes', 'array'],
            'extensions.*' => ['string', 'min:1', 'max:32'],
            'modified_from' => ['sometimes', 'string', 'date'],
            'modified_to' => ['sometimes', 'string', 'date'],
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

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $fromRaw = $this->input('modified_from');
            $toRaw = $this->input('modified_to');
            if (! is_string($fromRaw) || ! is_string($toRaw)) {
                return;
            }
            $from = strtotime($fromRaw);
            $to = strtotime($toRaw);
            if (! is_int($from) || ! is_int($to)) {
                return;
            }
            if ($to < $from) {
                $validator->errors()->add('modified_to', 'The modified_to must be greater than or equal to modified_from.');
            }
        });
    }
}
