<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('code', 50)->unique();

            $table->enum('type', [
                'percent',
                'fixed',
            ]);

            $table->unsignedInteger('value');

            $table->unsignedInteger('min_order_amount')->default(0);

            $table->unsignedInteger('max_usage')->nullable();

            $table->unsignedInteger('per_user_limit')->nullable();

            $table->timestamp('starts_at')->nullable();

            $table->timestamp('expires_at')->nullable();

            $table->boolean('is_active')->default(true);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
