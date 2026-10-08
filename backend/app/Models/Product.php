<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Product extends Model
{
    use HasFactory, HasUuids;
    protected $fillable = [
        'name',
        'slug',
        'sku',
        'price',
        'description',
        'is_active',
        'attributes',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'attributes' => 'array',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function inventory()
    {
        return $this->hasOne(Inventory::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    public function carts()
    {
        return $this->belongsToMany(Cart::class, 'cart_lines'); // pivot table name
    }

    public function cartLines()
    {
        return $this->hasMany(CartLine::class);
    }

    public function orders()
    {
        return $this->belongsToMany(Order::class, 'order_lines');
    }

    public function orderLines()
    {
        return $this->hasMany(OrderLine::class);
    }
}
