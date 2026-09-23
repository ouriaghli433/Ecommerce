<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pictures of a product. A product has zero to many images; an image
     * belongs to exactly one product.
     *
     * Column names follow the rest of the project: the table already says
     * "product_image", so the columns do not repeat it.
     */
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')
                ->constrained('products')
                ->cascadeOnDelete(); // deleting a product deletes its pictures
            $table->string('url', 500);
            $table->string('alt_text', 255)->nullable();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            // The gallery is read by product, in its display order.
            $table->index(['product_id', 'display_order']);
        });

        // One product shows at most one main picture.
        DB::statement('
            CREATE UNIQUE INDEX product_images_one_primary_per_product
            ON product_images (product_id)
            WHERE is_primary = true
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
