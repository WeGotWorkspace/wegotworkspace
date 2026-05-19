<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class AdminGroupCreateRequest extends FormRequest
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
            'slug' => ['sometimes', 'nullable', 'string', 'max:63'],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'displayName' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    public function slugValue(): string
    {
        $slug = trim((string) ($this->input('slug') ?? ''));
        if ($slug !== '') {
            return $slug;
        }

        $name = trim((string) ($this->input('name') ?? ''));
        if ($name !== '') {
            return $name;
        }

        return trim((string) ($this->input('displayName') ?? ''));
    }

    public function displayNameValue(): string
    {
        $displayName = trim((string) ($this->input('displayName') ?? ''));
        if ($displayName !== '') {
            return $displayName;
        }

        return trim((string) ($this->input('name') ?? ''));
    }
}
