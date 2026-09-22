<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('user_id')
                ->constrained('users');

            $table->foreignUuid('coupon_id')
                ->nullable()
                ->constrained('coupons')
                ->nullOnDelete();

            $table->foreignUuid('shipping_address_id')
                ->nullable()
                ->constrained('addresses')
                ->nullOnDelete();

            $table->enum('status', [
                'pending_payment',
                'paid',
                'processing',
                'shipped',
                'delivered',
                'cancelled',
                'expired',
            ])->default('pending_payment');

            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('discount_amount');
            $table->unsignedInteger('shipping_amount');
            $table->unsignedInteger('tax_amount');
            $table->unsignedInteger('total_amount');

            $table->char('currency', 3)->default('MAD');

            $table->timestamp('expires_at');

            $table->timestamp('paid_at')->nullable();

            $table->timestamp('cancelled_at')->nullable();

            $table->string('cancel_reason', 255)->nullable();

            // Delivery address snapshot at checkout.
            $table->string('shipping_full_name', 150);
            $table->string('shipping_phone', 30);
            $table->string('shipping_address_line', 255);
            $table->string('shipping_city', 100);
            $table->string('shipping_postal_code', 20)->nullable();
            $table->char('shipping_country', 2);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
