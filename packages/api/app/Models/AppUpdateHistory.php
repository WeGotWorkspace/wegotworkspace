<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;

final class AppUpdateHistory extends Model
{
    use UsesWgwConnection;

    protected $table = 'app_update_history';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'from_version',
        'to_version',
        'status',
        'message',
        'created_at',
    ];
}
