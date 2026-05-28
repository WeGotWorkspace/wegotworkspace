<?php

declare(strict_types=1);

namespace App\Services\Search;

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
        $allowedSources = array_values(array_intersect(['file', 'caldav', 'carddav'], $sources));
        $normalizedFilters = $this->normalizeFilters($filters);
        $tokens = $this->tokens->tokenize($query);
        if ($query === '' || $tokens === []) {
            return [
                'query' => $query,
                'limit' => $limit,
                'sources' => $allowedSources === [] ? ['file', 'caldav', 'carddav'] : $allowedSources,
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
            'sources' => $allowedSources === [] ? ['file', 'caldav', 'carddav'] : $allowedSources,
            'filters' => $normalizedFilters,
            'results' => $results,
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
}
