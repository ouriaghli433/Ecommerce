<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InventoryMovement extends Model
{
    use HasFactory, HasUuids;
    protected $fillable = [
        'movement_type',
        'quantity',
        'reason',
        'reference_type',
        'reference_id',
    ];

    public function inventory()
    {
        return $this->belongsTo(Inventory::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
