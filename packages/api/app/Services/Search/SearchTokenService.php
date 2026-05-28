<?php

declare(strict_types=1);

namespace App\Services\Search;

final class SearchTokenService
{
    /**
     * @return list<string>
     */
    public function tokenize(string $text): array
    {
        $normalized = mb_strtolower(trim($text));
        if ($normalized === '') {
            return [];
        }

        $parts = preg_split('/[^\\pL\\pN]+/u', $normalized) ?: [];
        $tokens = [];
        foreach ($parts as $part) {
            $token = trim($part);
            if ($token === '' || mb_strlen($token) < 2) {
                continue;
            }
            $tokens[$token] = true;
        }

        return array_keys($tokens);
    }
}
