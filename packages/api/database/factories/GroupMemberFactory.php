<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\GroupMember;
use App\Models\Principal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GroupMember>
 */
class GroupMemberFactory extends Factory
{
    protected $model = GroupMember::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'principal_id' => Principal::factory(),
            'member_id' => Principal::factory(),
        ];
    }

    public function forGroupAndMember(Principal $group, Principal $member): static
    {
        return $this->state(fn (): array => [
            'principal_id' => $group->id,
            'member_id' => $member->id,
        ]);
    }
}
