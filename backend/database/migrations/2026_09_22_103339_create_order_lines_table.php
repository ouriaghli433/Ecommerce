<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('order_id')
                ->constrained('orders')
                ->onDelete('cascade');

            $table->foreignUuid('product_id')
                ->constrained('products')
                ->onDelete('restrict');

            $table->unsignedInteger('quantity');

            $table->unsignedInteger('unit_price');

            $table->unique(['order_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_lines');
    }
};