<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')
                ->constrained('products')
                ->onDelete('restrict');

            $table->enum('type', [
                'PURCHASE',
                'RESERVATION',
                'RELEASE',
                'SALE',
                'RETURN',
                'DAMAGE',
                'ADJUSTMENT',
            ]);

            $table->integer('quantity');

            $table->string('reason', 255)->nullable();

            $table->string('reference_type', 50)->nullable();
            $table->uuid('reference_id')->nullable();

            $table->timestamp('created_at');

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};