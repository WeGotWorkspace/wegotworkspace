<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class GroupMember extends Model
{
    use UsesWgwConnection;

    protected $table = 'groupmembers';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'principal_id',
        'member_id',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(Principal::class, 'principal_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Principal::class, 'member_id');
    }
}
