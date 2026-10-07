<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $fillable = [
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cartLines()
    {
        return $this->hasMany(CartLine::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'cart_lines');
    }
}