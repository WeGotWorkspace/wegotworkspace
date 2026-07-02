<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Support\Facades\DB;

/**
 * Align mail_user_credentials.updated_at with installer MySQL schema (TIMESTAMP).
 * Older greenfield migrations used unsignedBigInteger while legacy installer SQL used TIMESTAMP.
 */
return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('mail_user_credentials') || ! $this->wgwHasColumn('mail_user_credentials', 'updated_at')) {
            return;
        }

        $driver = DB::connection('wgw')->getDriverName();
        if ($driver !== 'mysql') {
            return;
        }

        $type = $this->wgw()->getColumnType('mail_user_credentials', 'updated_at');
        if (! in_array($type, ['bigint', 'integer', 'int'], true)) {
            return;
        }

        DB::connection('wgw')->statement(
            'ALTER TABLE mail_user_credentials MODIFY updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        );
    }

    public function down(): void
    {
        // Repair migration; no down.
    }
};
