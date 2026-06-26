<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $share_id
 * @property string $email
 * @property string $permission
 * @property string $status
 * @property string $invite_token
 * @property string|null $access_token
 * @property Carbon|null $confirmed_at
 */
final class FileShareGrant extends Model
{
    use UsesWgwConnection;

    public const PERMISSION_READ = 'read';

    public const PERMISSION_WRITE = 'write';

    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_REVOKED = 'revoked';

    protected $table = 'file_share_grants';

    protected $keyType = 'string';

    public $incrementing = false;

    /** @var list<string> */
    protected $fillable = [
        'id',
        'share_id',
        'email',
        'permission',
        'status',
        'invite_token',
        'access_token',
        'confirmed_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'confirmed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<FileShare, $this> */
    public function share(): BelongsTo
    {
        return $this->belongsTo(FileShare::class, 'share_id');
    }

    public function isConfirmed(): bool
    {
        return $this->status === self::STATUS_CONFIRMED;
    }
}
