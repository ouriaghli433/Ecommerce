<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory, HasUuids;
    protected $fillable = [
        'user_id',
        'coupon_id',
        'shipping_address_id',
        'status',
        'subtotal',
        'discount_amount',
        'shipping_amount',
        'tax_amount',
        'total_amount',
        'expires_at',
        'shipping_full_name',
        'shipping_phone',
        'shipping_address_line',
        'shipping_city',
        'shipping_postal_code',
        'shipping_country',
    ];
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'order_lines');
    }

    public function orderLines()
    {
        return $this->hasMany(OrderLine::class);
    }

    public function address()
    {
        return $this->belongsTo(Address::class, 'shipping_address_id');
    }

    public function coupon()
    {
        return $this->belongsTo(Coupon::class);
    }
}
