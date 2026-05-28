<?php

declare(strict_types=1);

namespace App\Services\Search;

use Illuminate\Support\Facades\DB;

final class SearchDocumentStore
{
    /**
     * @param  array<string, mixed>  $document
     * @param  array<string, list<string>>  $tokensByField
     */
    public function upsert(string $sourceType, string $sourceKey, array $document, array $tokensByField): void
    {
        $now = date('c');
        $payload = [
            'source_type' => $sourceType,
            'source_subtype' => $this->nullableString($document['source_subtype'] ?? null),
            'source_key' => $sourceKey,
            'owner_username' => $this->nullableString($document['owner_username'] ?? null),
            'group_slug' => $this->nullableString($document['group_slug'] ?? null),
            'title' => $this->nullableString($document['title'] ?? null),
            'extension' => $this->nullableString($document['extension'] ?? null),
            'category' => $this->nullableString($document['category'] ?? null),
            'content_type' => $this->nullableString($document['content_type'] ?? null),
            'size' => $this->nullableInt($document['size'] ?? null),
            'created_at_ts' => $this->nullableInt($document['created_at_ts'] ?? null),
            'modified_at_ts' => $this->nullableInt($document['modified_at_ts'] ?? null),
            'body_text' => $this->nullableString($document['body_text'] ?? null),
            'metadata_json' => $this->encodeJson($document['metadata'] ?? null),
            'updated_at' => $now,
        ];

        DB::connection('wgw')->table('search_documents')->updateOrInsert(
            ['source_type' => $sourceType, 'source_key' => $sourceKey],
            array_merge($payload, ['created_at' => $now])
        );

        $documentId = DB::connection('wgw')->table('search_documents')
            ->where('source_type', $sourceType)
            ->where('source_key', $sourceKey)
            ->value('id');
        if (! is_int($documentId) && ! ctype_digit((string) $documentId)) {
            return;
        }
        $this->replaceTokens((int) $documentId, $tokensByField);
    }

    public function delete(string $sourceType, string $sourceKey): void
    {
        DB::connection('wgw')->table('search_documents')
            ->where('source_type', $sourceType)
            ->where('source_key', $sourceKey)
            ->delete();
    }

    public function deletePrefix(string $sourceType, string $sourceKeyPrefix): void
    {
        DB::connection('wgw')->table('search_documents')
            ->where('source_type', $sourceType)
            ->where('source_key', 'like', $sourceKeyPrefix.'/%')
            ->delete();
    }

    public function clearAll(): void
    {
        DB::connection('wgw')->table('search_terms')->delete();
        DB::connection('wgw')->table('search_documents')->delete();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function search(
        string $username,
        array $groupSlugs,
        array $tokens,
        int $limit,
        array $sources,
    ): array {
        $query = DB::connection('wgw')
            ->table('search_documents as d')
            ->select('d.*');

        if ($tokens !== []) {
            $scoreParts = [];
            $bindings = [];
            foreach ($tokens as $token) {
                $scoreParts[] = '(SELECT COALESCE(SUM(st.weight), 0) FROM search_terms st WHERE st.document_id = d.id AND st.token LIKE ?)';
                $bindings[] = $token.'%';
            }
            $query->selectRaw(implode(' + ', $scoreParts).' AS token_score', $bindings);
        } else {
            $query->selectRaw('0 AS token_score');
        }

        $query->where(function ($auth) use ($username, $groupSlugs): void {
            $auth->where(function ($q) use ($username): void {
                $q->where('d.source_type', 'file')
                    ->where('d.owner_username', $username);
            });

            if ($groupSlugs !== []) {
                $auth->orWhere(function ($q) use ($groupSlugs): void {
                    $q->where('d.source_type', 'file')
                        ->whereIn('d.group_slug', $groupSlugs);
                });
            }

            $auth->orWhere(function ($q) use ($username): void {
                $q->whereIn('d.source_type', ['caldav', 'carddav'])
                    ->where('d.owner_username', $username);
            });
        });

        if ($sources !== []) {
            $query->whereIn('d.source_type', $sources);
        }

        if ($tokens !== []) {
            $query->where(function ($match) use ($tokens): void {
                foreach ($tokens as $token) {
                    $match->orWhere('d.title', 'like', '%'.$token.'%')
                        ->orWhere('d.body_text', 'like', '%'.$token.'%')
                        ->orWhereExists(function ($sub) use ($token): void {
                            $sub->selectRaw('1')
                                ->from('search_terms as st')
                                ->whereColumn('st.document_id', 'd.id')
                                ->where('st.token', 'like', $token.'%');
                        });
                }
            });
        }

        /** @var list<array<string, mixed>> $rows */
        $rows = $query
            ->orderByDesc('token_score')
            ->orderByDesc('d.modified_at_ts')
            ->limit(max(1, min(100, $limit)))
            ->get()
            ->map(static fn ($row): array => (array) $row)
            ->all();

        return $rows;
    }

    /**
     * @param  array<string, list<string>>  $tokensByField
     */
    private function replaceTokens(int $documentId, array $tokensByField): void
    {
        DB::connection('wgw')->table('search_terms')
            ->where('document_id', $documentId)
            ->delete();

        $rows = [];
        $now = date('c');
        foreach ($tokensByField as $field => $tokens) {
            $weight = $field === 'title' ? 8 : ($field === 'meta' ? 4 : 2);
            foreach ($tokens as $token) {
                $rows[] = [
                    'document_id' => $documentId,
                    'token' => $token,
                    'field' => $field,
                    'weight' => $weight,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }
        if ($rows !== []) {
            DB::connection('wgw')->table('search_terms')->insert($rows);
        }
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function nullableInt(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }

    private function encodeJson(mixed $value): ?string
    {
        if (! is_array($value)) {
            return null;
        }

        return json_encode($value, JSON_UNESCAPED_SLASHES);
    }
}
