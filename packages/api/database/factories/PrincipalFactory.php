<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Principal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Principal>
 */
class PrincipalFactory extends Factory
{
    protected $model = Principal::class;

    private static int $sequence = 0;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        self::$sequence++;
        $username = 'user_'.self::$sequence;

        return [
            'uri' => 'principals/'.$username,
            'email' => $username.'@example.test',
            'displayname' => 'User '.self::$sequence,
        ];
    }

    public function forUsername(string $username, ?string $displayName = null, ?string $email = null): static
    {
        return $this->state(fn (): array => [
            'uri' => 'principals/'.$username,
            'email' => $email ?? $username.'@example.test',
            'displayname' => $displayName ?? ucfirst($username),
        ]);
    }

    public function forGroup(string $slug, ?string $displayName = null): static
    {
        return $this->state(fn (): array => [
            'uri' => 'principals/groups/'.$slug,
            'email' => null,
            'displayname' => $displayName ?? ucfirst($slug),
        ]);
    }
}
