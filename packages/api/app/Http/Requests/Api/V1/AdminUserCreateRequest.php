<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class AdminUserCreateRequest extends FormRequest
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
            'username' => ['required', 'string', 'max:63', 'regex:/^[a-z0-9][a-z0-9_-]{1,62}$/'],
            'password' => ['required', 'string', 'min:10', 'max:4096'],
            'displayName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'string', 'max:255'],
            'groups' => ['sometimes', 'array'],
            'groups.*' => ['string', 'max:255'],
        ];
    }
}
