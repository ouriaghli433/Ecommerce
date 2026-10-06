<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->String('key')->unique();
            $table->String('endpoint');
            $table->String('request_hash');
            $table->integer('response_status');
            $table->jsonb('response_body');
            $table->timestamp('expires_at');

            $table->foreignUuid('user_id')->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->unique(['user_id', 'key']); // user cant use same key but others can

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
