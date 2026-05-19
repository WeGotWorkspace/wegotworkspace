<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class InstallerActionRequest extends FormRequest
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
            'action' => [
                'required',
                'string',
                Rule::in([
                    'welcome_next',
                    'requirements_check',
                    'requirements_next',
                    'database_test',
                    'database_next',
                    'site_next',
                    'install',
                ]),
            ],
            'payload' => ['sometimes', 'array'],
        ];
    }
}
