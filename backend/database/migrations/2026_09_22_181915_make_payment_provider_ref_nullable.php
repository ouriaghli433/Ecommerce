<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A payment row is created BEFORE we call the payment provider, so the
     * "one active payment per order" index protects us while the provider
     * call is running. At that moment we do not have the provider reference
     * yet, so the column must accept null. It stays unique: Postgres allows
     * many nulls in a unique index.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('provider_ref', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('provider_ref', 255)->nullable(false)->change();
        });
    }
};
