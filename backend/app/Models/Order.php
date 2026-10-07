<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
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
