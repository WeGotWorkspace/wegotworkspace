<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Calendar extends Model
{
    use UsesWgwConnection;

    protected $table = 'calendars';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'synctoken',
        'components',
    ];

    /** @return HasMany<CalendarInstance, $this> */
    public function instances(): HasMany
    {
        return $this->hasMany(CalendarInstance::class, 'calendarid');
    }

    /** @return HasMany<CalendarObject, $this> */
    public function objects(): HasMany
    {
        return $this->hasMany(CalendarObject::class, 'calendarid');
    }

    public function supportsVtodo(): bool
    {
        $components = (string) ($this->components ?? '');

        return str_contains($components, 'VTODO');
    }

    /**
     * Calendars whose supported component set includes VTODO (legacy mixed or VTODO-only).
     *
     * @param  Builder<Calendar>  $query
     */
    public function scopeSupportsVtodo(Builder $query): void
    {
        $query->where('components', 'like', '%VTODO%');
    }
}
