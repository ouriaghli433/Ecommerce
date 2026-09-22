<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('payment_id')
                ->constrained('payments')
                ->onDelete('restrict');

            $table->unsignedInteger('amount');

            $table->enum('status', [
                'pending',
                'succeeded',
                'failed',
            ]);

            $table->enum('reason', [
                'late_payment',
                'order_cancelled',
                'customer_request',
                'admin',
            ]);

            $table->string('provider_ref', 255)->unique()->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
