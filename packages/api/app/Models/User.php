<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;

/**
 * SabreDAV HTTP Basic user ({@code users} table).
 */
final class User extends Model
{
    use UsesWgwConnection;

    protected $table = 'users';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'username',
        'digest',
        'digesta1',
    ];

    /** @var list<string> */
    protected $hidden = [
        'digest',
        'digesta1',
    ];

    public function principalUri(): string
    {
        return 'principals/'.$this->username;
    }

    public function principal(): ?Principal
    {
        return Principal::forUsername((string) $this->username);
    }
}
