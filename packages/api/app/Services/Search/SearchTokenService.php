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
        $normalized = $this->normalizeToken(mb_strtolower(trim($text)));
        if ($normalized === '') {
            return [];
        }

        $parts = preg_split('/[^\\pL\\pN]+/u', $normalized) ?: [];
        $tokens = [];
        foreach ($parts as $part) {
            $token = $this->normalizeToken(trim($part));
            if ($token === '' || mb_strlen($token) < 2) {
                continue;
            }
            $tokens[$token] = true;
        }

        return array_keys($tokens);
    }

    public function normalizeToken(string $value): string
    {
        if ($value === '' || ! class_exists(\Normalizer::class)) {
            return $value;
        }

        $normalized = \Normalizer::normalize($value, \Normalizer::FORM_C);

        return is_string($normalized) && $normalized !== '' ? $normalized : $value;
    }
}
