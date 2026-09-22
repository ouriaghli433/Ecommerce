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
                'PENDING',
                'SUCCEEDED',
                'FAILED',
            ]);

            $table->enum('reason', [
                'LATE_PAYMENT',
                'ORDER_CANCELLED',
                'CUSTOMER_REQUEST',
                'ADMIN',
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