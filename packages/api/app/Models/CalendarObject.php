<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;

final class CalendarObject extends Model
{
    use UsesWgwConnection;

    protected $table = 'calendarobjects';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'calendardata',
        'uri',
        'calendarid',
        'lastmodified',
        'etag',
        'size',
        'componenttype',
        'firstoccurence',
        'lastoccurence',
        'uid',
    ];
}
