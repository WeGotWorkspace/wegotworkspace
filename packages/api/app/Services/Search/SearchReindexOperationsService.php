<?php

declare(strict_types=1);

namespace App\Services\Search;

final class SearchReindexOperationsService
{
    public function __construct(private SearchReindexRunner $runner) {}

    /**
     * @return array<string, mixed>
     */
    public function run(): array
    {
        return $this->runner->run();
    }

    /**
     * @return array<string, mixed>
     */
    public function cancel(): array
    {
        return $this->runner->cancel();
    }
}
