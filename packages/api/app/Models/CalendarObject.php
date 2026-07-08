<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /** @return BelongsTo<Calendar, $this> */
    public function calendar(): BelongsTo
    {
        return $this->belongsTo(Calendar::class, 'calendarid');
    }
}
