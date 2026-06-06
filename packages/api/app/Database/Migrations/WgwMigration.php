<?php

declare(strict_types=1);

namespace App\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Builder;
use Illuminate\Support\Facades\Schema;

abstract class WgwMigration extends Migration
{
    protected function wgw(): Builder
    {
        return Schema::connection('wgw');
    }

    protected function wgwHasTable(string $table): bool
    {
        return $this->wgw()->hasTable($table);
    }

    protected function wgwHasColumn(string $table, string $column): bool
    {
        return $this->wgw()->hasColumn($table, $column);
    }
}
