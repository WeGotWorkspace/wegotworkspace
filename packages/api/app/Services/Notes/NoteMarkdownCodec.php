<?php

declare(strict_types=1);

namespace App\Services\Notes;

/**
 * Frontmatter + body codec for note markdown files (pure PHP, no I/O).
 */
final class NoteMarkdownCodec
{
    public function isNoteFilename(string $filename): bool
    {
        if (! str_ends_with(strtolower($filename), '.md')) {
            return false;
        }

        return ! str_starts_with($filename, '._');
    }

    /**
     * @return array{0: string, 1: list<string>, 2: bool|null, 3: string}
     */
    public function parse(string $markdown, string $fallbackTitle): array
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $markdown);
        $token = "\n----\n";
        $idx = strpos($normalized, $token);
        $headerText = $idx !== false ? substr($normalized, 0, $idx) : '';
        $body = $idx !== false ? substr($normalized, $idx + strlen($token)) : $normalized;
        $title = $fallbackTitle;
        $tags = [];
        $starred = null;
        foreach (array_filter(array_map('trim', explode("\n", $headerText))) as $line) {
            $sep = strpos($line, ':');
            if ($sep === false || $sep <= 0) {
                continue;
            }
            $key = strtolower(trim(substr($line, 0, $sep)));
            $value = trim(substr($line, $sep + 1));
            if ($key === 'title') {
                $title = $value !== '' ? $value : $fallbackTitle;

                continue;
            }
            if ($key === 'tags') {
                $tags = $this->normalizeTags(explode(',', $value));

                continue;
            }
            if ($key === 'starred') {
                $starred = $this->toBool($value);
            }
        }

        return [$title, $tags, $starred, $body];
    }

    /**
     * @param  list<string>  $tags
     */
    public function serialize(string $title, array $tags, ?bool $starred, string $body): string
    {
        $lines = [
            'title: '.trim(str_replace("\n", ' ', $title)),
            'tags: '.implode(', ', $tags),
        ];
        if ($starred !== null) {
            $lines[] = 'starred: '.($starred ? 'true' : 'false');
        }
        $normalizedBody = str_replace(["\r\n", "\r"], "\n", $body);

        return implode("\n", $lines)."\n----\n".$normalizedBody;
    }

    /**
     * @return list<string>
     */
    public function normalizeTags(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $tag) {
            if (! is_string($tag)) {
                continue;
            }
            $normalized = strtolower(trim(str_replace(["\r", "\n"], ' ', $tag)));
            if ($normalized === '') {
                continue;
            }
            $out[$normalized] = true;
        }

        return array_keys($out);
    }

    public function toBool(mixed $value): ?bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_string($value)) {
            $lower = strtolower(trim($value));
            if (in_array($lower, ['1', 'true', 'yes', 'on'], true)) {
                return true;
            }
            if (in_array($lower, ['0', 'false', 'no', 'off'], true)) {
                return false;
            }
        }
        if (is_int($value)) {
            return $value === 1 ? true : ($value === 0 ? false : null);
        }

        return null;
    }
}
