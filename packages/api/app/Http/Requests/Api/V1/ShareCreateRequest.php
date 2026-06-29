<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class ShareCreateRequest extends FormRequest
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
            'path' => ['required', 'string', 'max:512'],
            'publicAccess' => ['required', 'string', 'in:none,read,write'],
            'expiresAt' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }
}
