<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if (! $this->wgwHasTable('users')) {
            $this->wgw()->create('users', function (Blueprint $table): void {
                $table->id();
                $table->string('username');
                $table->string('digesta1')->default('');
                $table->string('digest');
                $table->unique('username');
            });
        }

        if (! $this->wgwHasTable('principals')) {
            $this->wgw()->create('principals', function (Blueprint $table): void {
                $table->id();
                $table->string('uri');
                $table->string('email')->nullable();
                $table->string('displayname')->nullable();
                $table->unique('uri');
            });
        }

        if (! $this->wgwHasTable('groupmembers')) {
            $this->wgw()->create('groupmembers', function (Blueprint $table): void {
                $table->id();
                $table->unsignedBigInteger('principal_id');
                $table->unsignedBigInteger('member_id');
                $table->unique(['principal_id', 'member_id']);
            });
        }
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('groupmembers');
        $this->wgw()->dropIfExists('principals');
        $this->wgw()->dropIfExists('users');
    }
};
