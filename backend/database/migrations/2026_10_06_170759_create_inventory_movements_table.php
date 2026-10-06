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
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inventory_id')->constrained('inventories')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignUuid('created_by')->nullable()->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->enum('movement_type', ['purchase', 'reservation', 'release', 'sale', 'return', 'damage', 'adjustment']);
            $table->integer('quantity');
            $table->string('reason')->nullable();
            $table->string('reference_type')->nullable();
            $table->uuid('reference_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
