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
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->String('name');
            $table->String('slug')->unique();
            $table->String('sku')->unique();
            $table->integer('price');
            $table->String('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->jsonb('attributes')->nullable();
            $table->foreignUuid('category_id')->constrained('categories')
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
        Schema::dropIfExists('products');
    }
};
