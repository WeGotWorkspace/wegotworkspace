<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;

final class DriveStarredItem extends Model
{
    use UsesWgwConnection;

    protected $table = 'drive_starred_items';

    public $incrementing = false;

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'username',
        'path',
        'created_at',
    ];
}
