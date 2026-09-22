<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * RG13: a customer has at most one ACTIVE cart.
     *
     * The code already looks for an existing cart before creating one, but
     * two requests arriving at the same millisecond could both find none and
     * both insert. This partial unique index lets the database refuse the
     * second insert. Converted and abandoned carts are not concerned, so the
     * customer can still have many old carts.
     */
    public function up(): void
    {
        DB::statement("
            CREATE UNIQUE INDEX carts_one_active_per_user
            ON carts (user_id)
            WHERE status = 'active'
        ");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS carts_one_active_per_user');
    }
};
