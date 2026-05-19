<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class SettingsMailRequest extends FormRequest
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
            'imapUsername' => ['sometimes', 'string', 'max:255'],
            'imapPassword' => ['sometimes', 'nullable', 'string', 'max:4096'],
        ];
    }
}
