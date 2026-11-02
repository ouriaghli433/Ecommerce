<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class shippingPrice extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'shipping_prices';

    protected $fillable = [
        'city',
        'cost',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
