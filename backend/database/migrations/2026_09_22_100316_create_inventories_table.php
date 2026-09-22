<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventories', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('product_id')
                ->unique()
                ->constrained('products')
                ->onDelete('restrict');

            $table->unsignedInteger('on_hand');
            $table->unsignedInteger('reserved');

            $table->timestamps();
        });

        DB::statement('
            ALTER TABLE inventories
            ADD CONSTRAINT inventories_reserved_check
            CHECK (reserved <= on_hand)
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};