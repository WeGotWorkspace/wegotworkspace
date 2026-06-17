<?php

declare(strict_types=1);

use App\Database\Migrations\WgwMigration;
use Illuminate\Database\Schema\Blueprint;

return new class extends WgwMigration
{
    public function up(): void
    {
        if ($this->wgwHasTable('jmap_contact_states')) {
            return;
        }

        $this->wgw()->create('jmap_contact_states', function (Blueprint $table): void {
            $table->id();
            $table->string('username', 255);
            $table->string('card_id', 255);
            $table->string('address_book_uri', 255);
            $table->string('card_uri', 255);
            $table->string('state_token', 64);
            $table->string('etag', 255)->nullable();
            $table->timestamps();

            $table->unique(['username', 'card_id']);
            $table->unique('state_token');
            $table->index(['username', 'address_book_uri']);
        });
    }

    public function down(): void
    {
        $this->wgw()->dropIfExists('jmap_contact_states');
    }
};
