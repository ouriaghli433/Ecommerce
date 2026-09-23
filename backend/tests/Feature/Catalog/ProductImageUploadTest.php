<?php

namespace Tests\Feature\Catalog;

use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProductImageUploadTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        // A fake disk: the test writes real files, but in a temporary place
        // that is thrown away afterwards.
        //
        // The uploads are faked with create(..., 'image/jpeg') rather than
        // image(): drawing a real picture needs the GD extension, which the
        // PHP image does not carry. Validation and storage are the same.
        Storage::fake('public');

        $this->admin = User::factory()->admin()->create();
        $this->product = Product::factory()->create(['name' => 'Desk lamp']);
    }

    public function test_an_admin_can_upload_a_picture_from_their_computer(): void
    {
        $file = UploadedFile::fake()->create('lamp.jpg', 120, 'image/jpeg');

        $response = $this->actingAs($this->admin)
            ->post("/api/products/{$this->product->id}/images", ['file' => $file])
            ->assertCreated()
            ->assertJsonPath('data.is_primary', true);

        // The address points at our own storage...
        $url = $response->json('data.url');
        $this->assertStringContainsString('/storage/products/', $url);

        // ...and the file is really there.
        $path = 'products/'.substr($url, strpos($url, '/storage/products/') + strlen('/storage/products/'));
        Storage::disk('public')->assertExists($path);
    }

    public function test_a_second_upload_does_not_overwrite_the_first(): void
    {
        $url = "/api/products/{$this->product->id}/images";

        // Same file name twice: Laravel gives each one a random name.
        $first = $this->actingAs($this->admin)
            ->post($url, ['file' => UploadedFile::fake()->create('photo.jpg', 120, 'image/jpeg')])
            ->json('data.url');

        $second = $this->actingAs($this->admin)
            ->post($url, ['file' => UploadedFile::fake()->create('photo.jpg', 120, 'image/jpeg')])
            ->json('data.url');

        $this->assertNotSame($first, $second);
        $this->assertCount(2, Storage::disk('public')->allFiles('products/'.$this->product->id));
    }

    public function test_an_address_still_works(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/products/{$this->product->id}/images", [
                'url' => 'https://cdn.example.com/lamp.jpg',
            ])
            ->assertCreated()
            ->assertJsonPath('data.url', 'https://cdn.example.com/lamp.jpg');
    }

    public function test_one_of_the_two_is_required(): void
    {
        $this->actingAs($this->admin)
            ->postJson("/api/products/{$this->product->id}/images", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['file', 'url']);
    }

    public function test_a_file_that_is_not_a_picture_is_refused(): void
    {
        $this->actingAs($this->admin)
            ->post("/api/products/{$this->product->id}/images", [
                'file' => UploadedFile::fake()->create('invoice.pdf', 100, 'application/pdf'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertEmpty(Storage::disk('public')->allFiles('products'));
    }

    public function test_a_picture_heavier_than_4mb_is_refused(): void
    {
        $this->actingAs($this->admin)
            ->post("/api/products/{$this->product->id}/images", [
                'file' => UploadedFile::fake()->create('huge.jpg', 5000, 'image/jpeg'), // 5 MB
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
    }

    public function test_deleting_the_picture_deletes_the_uploaded_file(): void
    {
        $url = $this->actingAs($this->admin)
            ->post("/api/products/{$this->product->id}/images", [
                'file' => UploadedFile::fake()->create('lamp.jpg', 120, 'image/jpeg'),
            ])
            ->json('data.url');

        $image = ProductImage::first();
        $path = 'products/'.substr($url, strpos($url, '/storage/products/') + strlen('/storage/products/'));

        $this->actingAs($this->admin)
            ->deleteJson("/api/products/{$this->product->id}/images/{$image->id}")
            ->assertNoContent();

        Storage::disk('public')->assertMissing($path);
    }

    public function test_deleting_a_picture_taken_from_the_internet_touches_no_file(): void
    {
        $image = ProductImage::factory()->create([
            'product_id' => $this->product->id,
            'url' => 'https://cdn.example.com/lamp.jpg',
        ]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/products/{$this->product->id}/images/{$image->id}")
            ->assertNoContent();

        $this->assertDatabaseCount('product_images', 0);
    }

    public function test_a_customer_cannot_upload(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)
            ->post("/api/products/{$this->product->id}/images", [
                'file' => UploadedFile::fake()->create('lamp.jpg', 120, 'image/jpeg'),
            ])
            ->assertForbidden();
    }
}
