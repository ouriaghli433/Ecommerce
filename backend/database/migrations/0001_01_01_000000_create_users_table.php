<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('first_name', 100);
            $table->string('last_name', 100);

            $table->string('email', 255)->unique();
            $table->string('password', 255);

            $table->enum('role', ['customer', 'admin'])
                ->default('customer');

            $table->timestamp('email_verified_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
