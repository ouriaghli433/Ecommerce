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
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('status', ['pending', 'processing', 'succeeded', 'failed']);
            $table->integer('amount');
            $table->string('currency');
            $table->string('provider');
            $table->string('provider_ref')->unique();
            $table->string('failure_reason')->nullable();
            $table->timestamp('succeeded_at')->nullable();
            $table->foreignUuid('order_id')->constrained('orders')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
