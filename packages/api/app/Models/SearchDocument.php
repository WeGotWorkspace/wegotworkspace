<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\UsesWgwConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class SearchDocument extends Model
{
    use UsesWgwConnection;

    protected $table = 'search_documents';

    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [
        'source_type',
        'source_subtype',
        'source_key',
        'owner_username',
        'group_slug',
        'title',
        'extension',
        'category',
        'content_type',
        'size',
        'created_at_ts',
        'modified_at_ts',
        'body_text',
        'metadata_json',
        'created_at',
        'updated_at',
    ];

    public function terms(): HasMany
    {
        return $this->hasMany(SearchTerm::class, 'document_id');
    }
}
