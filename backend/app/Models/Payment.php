<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'order_id',
        'status',
        'amount',
        'currency',
        'provider',
        'provider_ref',
        'failure_reason',
        'succeeded_at',
        'checkout_expires_at'
    ];

    protected function casts(): array
    {
        return [
            'succeeded_at' => 'datetime',
            'checkout_expires_at' => 'datetime'
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }
    public function idempotencyKeys()
    {
        return $this->hasMany(IdempotencyKey::class);
    }
}
