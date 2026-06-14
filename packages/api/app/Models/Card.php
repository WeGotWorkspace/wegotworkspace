<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Card extends Model
{
    use UsesWgwConnection;

    protected $table = 'cards';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'addressbookid',
        'carddata',
        'uri',
        'lastmodified',
        'etag',
        'size',
    ];

    /** @return BelongsTo<Addressbook, $this> */
    public function addressbook(): BelongsTo
    {
        return $this->belongsTo(Addressbook::class, 'addressbookid');
    }
}
