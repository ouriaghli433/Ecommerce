<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CartLine extends Model
{
    protected $fillable = [
        'quantity',
        'unit_price',
    ];

    public function cart()
    {
        return $this->belongsTo(Cart::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
