<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Database\Factories\GroupMemberFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class GroupMember extends Model
{
    /** @use HasFactory<GroupMemberFactory> */
    use HasFactory;

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
