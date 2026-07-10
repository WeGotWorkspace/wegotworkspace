<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class DriveShare extends Model
{
    use UsesWgwConnection;

    protected $table = 'drive_shares';

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'id',
        'path',
        'owner_username',
        'kind',
        'default_access',
        'public_token',
        'password_hash',
        'expires_at',
        'revoked_at',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function grants(): HasMany
    {
        return $this->hasMany(DriveShareGrant::class, 'share_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(DriveShareSession::class, 'share_id');
    }
}
