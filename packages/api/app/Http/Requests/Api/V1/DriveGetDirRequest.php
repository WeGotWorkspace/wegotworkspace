<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class DriveGetDirRequest extends FormRequest
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
            'dir' => ['required', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $dir = $this->input('dir');
        if ($dir === null && is_array($this->json()->all())) {
            $dir = $this->json('dir');
        }

        $this->merge([
            'dir' => is_string($dir) ? $dir : '/',
        ]);
    }
}
