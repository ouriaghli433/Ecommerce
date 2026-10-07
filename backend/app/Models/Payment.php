<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'status',
        'amount',
        'currency',
        'provider',
        'provider_ref',
        'failure_reason',
        'succeeded_at',
    ];

    protected function casts(): array
    {
        return [
            'succeeded_at' => 'datetime',
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
}
