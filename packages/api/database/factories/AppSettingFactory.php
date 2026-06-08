<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AppSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AppSetting>
 */
class AppSettingFactory extends Factory
{
    protected $model = AppSetting::class;

    private static int $sequence = 0;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        self::$sequence++;

        return [
            'name' => 'setting_'.self::$sequence,
            'value' => AppSetting::encodeValue('value_'.self::$sequence),
        ];
    }

    public function named(string $name): static
    {
        return $this->state(fn (): array => [
            'name' => $name,
        ]);
    }

    public function withValue(mixed $value): static
    {
        return $this->state(fn (): array => [
            'value' => AppSetting::encodeValue($value),
        ]);
    }
}
