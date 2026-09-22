<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('order_id')
                ->constrained('orders');

            $table->enum('status', [
                'pending',
                'processing',
                'succeeded',
                'failed',
            ])->default('pending');

            $table->unsignedInteger('amount');

            $table->char('currency', 3);

            $table->string('provider', 30);

            $table->string('provider_ref', 255)->unique();

            $table->string('failure_reason', 50)->nullable();

            $table->timestamp('succeeded_at')->nullable();
        });

        // Only one active payment per order.
        DB::statement("
            CREATE UNIQUE INDEX payments_one_active_per_order
            ON payments (order_id)
            WHERE status IN ('pending', 'processing')
        ");

        // Only one successful payment per order.
        DB::statement("
            CREATE UNIQUE INDEX payments_one_succeeded_per_order
            ON payments (order_id)
            WHERE status = 'succeeded'
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
