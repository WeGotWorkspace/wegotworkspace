<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $token
 * @property string $owner_username
 * @property string $target_path
 * @property string $target_type
 * @property string $public_access
 * @property Carbon|null $expires_at
 */
final class FileShare extends Model
{
    use UsesWgwConnection;

    public const PUBLIC_NONE = 'none';

    public const PUBLIC_READ = 'read';

    public const PUBLIC_WRITE = 'write';

    public const TYPE_FILE = 'file';

    public const TYPE_DIR = 'dir';

    protected $table = 'file_shares';

    protected $keyType = 'string';

    public $incrementing = false;

    /** @var list<string> */
    protected $fillable = [
        'id',
        'token',
        'owner_username',
        'target_path',
        'target_type',
        'public_access',
        'expires_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    /** @return HasMany<FileShareGrant, $this> */
    public function grants(): HasMany
    {
        return $this->hasMany(FileShareGrant::class, 'share_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
