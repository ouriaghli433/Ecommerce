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
            $table->String('key');
            $table->String('endpoint');
            $table->enum('status', ['processing', 'completed', 'failed'])
                ->default('processing');
            $table->String('request_hash');
            $table->integer('response_status')->nullable();
            $table->jsonb('response_body')->nullable(); // 
            $table->timestamp('expires_at');

            $table->foreignUuid('user_id')->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
                
            $table->foreignUuid('payment_id')
            ->nullable()
            ->constrained('payments')
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
