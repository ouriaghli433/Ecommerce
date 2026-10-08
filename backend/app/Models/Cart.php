<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Cart extends Model
{
    use HasFactory, HasUuids;
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
