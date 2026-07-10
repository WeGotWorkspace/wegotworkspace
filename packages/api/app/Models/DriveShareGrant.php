<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class DriveShareGrant extends Model
{
    use UsesWgwConnection;

    protected $table = 'drive_share_grants';

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = [
        'id',
        'share_id',
        'grantee_type',
        'grantee_user',
        'grantee_email',
        'grantee_group',
        'access',
        'status',
        'invite_token',
    ];

    public function share(): BelongsTo
    {
        return $this->belongsTo(DriveShare::class, 'share_id');
    }
}
