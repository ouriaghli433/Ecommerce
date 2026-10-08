<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Refund extends Model
{
    use HasFactory, HasUuids;
    protected $fillable = [
        'amount',
        'status',
        'reason',
        'provider_ref',
    ];

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
