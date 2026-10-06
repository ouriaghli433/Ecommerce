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
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('status', ['pending_payment','paid','processing','shipped','delivered','cancelled','expired']);
            $table->integer('subtotal');
            $table->integer('discount_amount');
            $table->integer('shipping_amount');
            $table->integer('tax_amount');
            $table->integer('total_amount');
            $table->string('currency')->default('MAD');
            $table->timestamp('expires_at');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->string('shipping_full_name');
            $table->string('shipping_phone');
            $table->string('shipping_address_line');
            $table->string('shipping_city');
            $table->string('shipping_postal_code')->nullable();
            $table->string('shipping_country');
            
            $table->foreignUuid('user_id')->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignUuid('coupon_id')->nullable()->constrained('coupons')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->foreignUuid('shipping_address_id')->nullable()->constrained('addresses')
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
        Schema::dropIfExists('orders');
    }
};
