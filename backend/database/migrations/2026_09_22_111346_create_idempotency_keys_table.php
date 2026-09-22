<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('user_id')->nullable();

            $table->string('key', 255);

            $table->string('request_method', 10);

            $table->string('request_path', 255);

            $table->string('request_hash', 64);

            $table->unsignedSmallInteger('response_status')->nullable();

            $table->jsonb('response_body')->nullable();

            $table->timestamp('expires_at');

            $table->timestamps();

            $table->unique([
                'user_id',
                'key',
                'request_method',
                'request_path',
            ]);

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};