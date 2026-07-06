<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class CalendarInstance extends Model
{
    use UsesWgwConnection;

    protected $table = 'calendarinstances';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'calendarid',
        'principaluri',
        'access',
        'displayname',
        'uri',
        'description',
        'calendarorder',
        'calendarcolor',
        'timezone',
        'transparent',
        'share_href',
        'share_displayname',
        'share_invitestatus',
    ];

    /** @return BelongsTo<Calendar, $this> */
    public function calendar(): BelongsTo
    {
        return $this->belongsTo(Calendar::class, 'calendarid');
    }

    /** @return HasMany<CalendarObject, $this> */
    public function objects(): HasMany
    {
        return $this->hasMany(CalendarObject::class, 'calendarid', 'calendarid');
    }
}
