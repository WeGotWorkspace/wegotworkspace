<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    private static int $sequence = 0;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        self::$sequence++;

        return [
            'username' => 'user_'.self::$sequence,
            'digesta1' => '',
            'digest' => password_hash('secret', PASSWORD_DEFAULT),
        ];
    }

    public function named(string $username): static
    {
        return $this->state(fn (): array => [
            'username' => $username,
        ]);
    }

    public function withPassword(string $password): static
    {
        return $this->state(fn (): array => [
            'digest' => password_hash($password, PASSWORD_DEFAULT),
        ]);
    }
}
