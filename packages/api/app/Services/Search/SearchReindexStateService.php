<?php

declare(strict_types=1);

namespace App\Services\Search;

final class SearchReindexStateService
{
    public function __construct(private SearchReindexRunner $runner) {}

    /**
     * @return array<string, mixed>
     */
    public function snapshot(): array
    {
        return $this->runner->getState();
    }
}
