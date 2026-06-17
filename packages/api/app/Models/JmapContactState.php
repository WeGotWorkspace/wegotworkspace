<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;

final class JmapContactState extends Model
{
    use UsesWgwConnection;

    protected $table = 'jmap_contact_states';

    protected $fillable = [
        'username',
        'card_id',
        'address_book_uri',
        'card_uri',
        'state_token',
        'etag',
    ];
}
