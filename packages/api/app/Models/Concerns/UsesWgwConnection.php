<?php

declare(strict_types=1);

namespace App\Models\Concerns;

trait UsesWgwConnection
{
    public function getConnectionName(): ?string
    {
        return 'wgw';
    }
}
