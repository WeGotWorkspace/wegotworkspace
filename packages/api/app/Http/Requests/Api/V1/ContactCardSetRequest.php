<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/** JMAP Contact/set body (RFC 9610). */
final class ContactCardSetRequest extends FormRequest
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
            'create' => ['sometimes', 'array'],
            'update' => ['sometimes', 'array'],
            'destroy' => ['sometimes', 'array'],
        ];
    }
}
