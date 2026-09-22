<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'product_id',
        'on_hand',
        'reserved',
    ];

    protected function casts(): array
    {
        return [
            'on_hand' => 'integer',
            'reserved' => 'integer',
        ];
    }

    // Available stock is calculated, never stored (RG8).
    public function availableStock(): int
    {
        return $this->on_hand - $this->reserved;
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
