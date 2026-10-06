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
        Schema::create('refunds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('amount');
            $table->enum('status', ['pending', 'succeeded', 'failed']);
            $table->enum('reason', ['late_payment', 'order_cancelled', 'customer_request', 'admin']);
            $table->string('provider_ref')->unique()->nullable();

            $table->foreignUuid('payment_id')->constrained('payments')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignUuid('created_by')->nullable()->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
