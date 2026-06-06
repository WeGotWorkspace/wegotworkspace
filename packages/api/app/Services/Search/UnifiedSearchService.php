<?php

declare(strict_types=1);

namespace App\Services\Search;

use App\Models\CalendarObject;
use App\Models\Card;
use App\Services\Drive\DriveGroupResolver;

final class UnifiedSearchService
{
    public function __construct(
        private DriveGroupResolver $groups,
        private SearchTokenService $tokens,
        private SearchDocumentStore $store,
    ) {}

    /**
     * @param  list<string>  $sources
     * @param  array{
     *   categories?: list<string>,
     *   extensions?: list<string>,
     *   modified_from?: string|int|null,
     *   modified_to?: string|int|null
     * }  $filters
     * @return array{
     *   query: string,
     *   limit: int,
     *   sources: list<string>,
     *   filters: array<string, mixed>,
     *   results: list<array<string, mixed>>
     * }
     */
    public function search(string $username, string $query, int $limit, array $sources, array $filters = []): array
    {
        $query = trim($query);
        $limit = max(1, min(100, $limit));
        $allowedSources = array_values(array_intersect(['file', 'note', 'caldav', 'carddav'], $sources));
        $normalizedFilters = $this->normalizeFilters($filters);
        $tokens = $this->tokens->tokenize($query);
        if ($query === '' || $tokens === []) {
            return [
                'query' => $query,
                'limit' => $limit,
                'sources' => $allowedSources === [] ? ['file', 'note', 'caldav', 'carddav'] : $allowedSources,
                'filters' => $normalizedFilters,
                'results' => [],
            ];
        }

        $rows = $this->store->search(
            $username,
            $this->groups->allowedGroupSlugs($username),
            $tokens,
            $limit,
            $allowedSources,
            $normalizedFilters
        );

        $results = [];
        foreach ($rows as $row) {
            $metadata = [];
            if (is_string($row['metadata_json'] ?? null) && trim((string) $row['metadata_json']) !== '') {
                $decoded = json_decode((string) $row['metadata_json'], true);
                if (is_array($decoded)) {
                    $metadata = $decoded;
                }
            }
            $title = is_string($row['title'] ?? null) ? $row['title'] : '';
            $body = is_string($row['body_text'] ?? null) ? $row['body_text'] : '';
            $snippet = $this->snippetForTokens($body, $tokens);
            $results[] = [
                'id' => (int) ($row['id'] ?? 0),
                'sourceType' => (string) ($row['source_type'] ?? ''),
                'sourceSubtype' => $row['source_subtype'] ?? null,
                'sourceKey' => (string) ($row['source_key'] ?? ''),
                'title' => $title,
                'extension' => $row['extension'] ?? null,
                'category' => $row['category'] ?? null,
                'contentType' => $row['content_type'] ?? null,
                'size' => (int) ($row['size'] ?? 0),
                'modifiedAt' => (int) ($row['modified_at_ts'] ?? 0),
                'snippet' => $snippet,
                'tokenScore' => (int) ($row['token_score'] ?? 0),
                'metadata' => $metadata,
            ];
        }

        return [
            'query' => $query,
            'limit' => $limit,
            'sources' => $allowedSources === [] ? ['file', 'note', 'caldav', 'carddav'] : $allowedSources,
            'filters' => $normalizedFilters,
            'results' => $results,
        ];
    }

    /**
     * @return array{content:string,content_type:string,filename:string}|null
     */
    public function downloadRecord(string $username, string $sourceType, string $sourceKey): ?array
    {
        if (! in_array($sourceType, ['caldav', 'carddav'], true)) {
            return null;
        }

        $doc = $this->store->findAccessibleDocument(
            $username,
            $this->groups->allowedGroupSlugs($username),
            $sourceType,
            $sourceKey
        );
        if ($doc === null) {
            return null;
        }

        if ($sourceType === 'caldav') {
            [$principal, $calendarUri, $objectUri] = explode('|', $sourceKey, 3);
            $row = CalendarObject::query()
                ->from('calendarobjects as o')
                ->join('calendarinstances as i', 'i.calendarid', '=', 'o.calendarid')
                ->where('i.principaluri', 'principals/'.$principal)
                ->where('i.uri', $calendarUri)
                ->where('o.uri', $objectUri)
                ->select(['o.calendardata', 'o.uri'])
                ->first();
            if ($row === null) {
                return null;
            }
            $filename = $this->downloadName((string) ($row->uri ?? $objectUri), 'ics');

            return [
                'content' => (string) ($row->calendardata ?? ''),
                'content_type' => 'text/calendar; charset=utf-8',
                'filename' => $filename,
            ];
        }

        [$principal, $bookUri, $cardUri] = explode('|', $sourceKey, 3);
        $row = Card::query()
            ->from('cards as c')
            ->join('addressbooks as a', 'a.id', '=', 'c.addressbookid')
            ->where('a.principaluri', 'principals/'.$principal)
            ->where('a.uri', $bookUri)
            ->where('c.uri', $cardUri)
            ->select(['c.carddata', 'c.uri'])
            ->first();
        if ($row === null) {
            return null;
        }

        $filename = $this->downloadName((string) ($row->uri ?? $cardUri), 'vcf');

        return [
            'content' => (string) ($row->carddata ?? ''),
            'content_type' => 'text/vcard; charset=utf-8',
            'filename' => $filename,
        ];
    }

    /**
     * @param  array{
     *   categories?: list<string>,
     *   extensions?: list<string>,
     *   modified_from?: string|int|null,
     *   modified_to?: string|int|null
     * }  $filters
     * @return array{
     *   categories: list<string>,
     *   extensions: list<string>,
     *   modified_from: int|null,
     *   modified_to: int|null
     * }
     */
    private function normalizeFilters(array $filters): array
    {
        $categories = isset($filters['categories']) && is_array($filters['categories'])
            ? array_values(array_unique(array_values(array_filter(
                array_map(static fn (mixed $v): string => is_string($v) ? trim($v) : '', $filters['categories']),
                static fn (string $v): bool => $v !== ''
            ))))
            : [];
        $extensions = isset($filters['extensions']) && is_array($filters['extensions'])
            ? array_values(array_unique(array_values(array_filter(
                array_map(static fn (mixed $v): string => is_string($v) ? strtolower(trim($v)) : '', $filters['extensions']),
                static fn (string $v): bool => $v !== ''
            ))))
            : [];
        $modifiedFrom = $this->normalizeTimestampFilter($filters['modified_from'] ?? null);
        $modifiedTo = $this->normalizeTimestampFilter($filters['modified_to'] ?? null);

        return [
            'categories' => $categories,
            'extensions' => $extensions,
            'modified_from' => $modifiedFrom,
            'modified_to' => $modifiedTo,
        ];
    }

    private function normalizeTimestampFilter(mixed $value): ?int
    {
        if (is_int($value)) {
            return max(0, $value);
        }
        if (is_string($value)) {
            $parsed = strtotime($value);
            if (is_int($parsed) && $parsed >= 0) {
                return $parsed;
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $tokens
     */
    private function snippetForTokens(string $body, array $tokens): ?string
    {
        $trimmed = trim($body);
        if ($trimmed === '') {
            return null;
        }

        $lower = mb_strtolower($trimmed);
        foreach ($tokens as $token) {
            $pos = mb_strpos($lower, mb_strtolower($token));
            if ($pos === false) {
                continue;
            }
            $start = max(0, $pos - 60);
            $snippet = mb_substr($trimmed, $start, 160);

            return trim(($start > 0 ? '... ' : '').$snippet.(mb_strlen($trimmed) > $start + 160 ? ' ...' : ''));
        }

        return mb_substr($trimmed, 0, 160);
    }

    private function downloadName(string $name, string $extension): string
    {
        $trimmed = trim($name);
        if ($trimmed === '') {
            return 'record.'.$extension;
        }
        if (str_contains($trimmed, '.')) {
            return $trimmed;
        }

        return $trimmed.'.'.$extension;
    }
}
