<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('user_id')
                ->constrained('users');

            $table->string('full_name', 150);
            $table->string('phone', 30);
            $table->string('address_line', 255);
            $table->string('city', 100);
            $table->string('postal_code', 20)->nullable();
            $table->char('country', 2);

            $table->boolean('is_default')->default(false);
        });

        // One default address maximum per customer.
        DB::statement("
            CREATE UNIQUE INDEX addresses_one_default_per_user
            ON addresses (user_id)
            WHERE is_default = true
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};