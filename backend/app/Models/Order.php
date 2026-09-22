<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Order extends Model
{
    use HasFactory, HasUuids;

    /**
     * Allowed status changes (RG23). delivered, cancelled and expired
     * have no next status: they are terminal (RG24).
     */
    const TRANSITIONS = [
        'pending_payment' => ['paid', 'cancelled', 'expired'],
        'paid' => ['processing', 'cancelled'],
        'processing' => ['shipped', 'cancelled'],
        'shipped' => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
        'expired' => [],
    ];

    protected $fillable = [
        'user_id',
        'coupon_id',
        'shipping_address_id',
        'status',
        'subtotal',
        'discount_amount',
        'shipping_amount',
        'tax_amount',
        'total_amount',
        'currency',
        'expires_at',
        'paid_at',
        'cancelled_at',
        'cancel_reason',
        'shipping_full_name',
        'shipping_phone',
        'shipping_address_line',
        'shipping_city',
        'shipping_postal_code',
        'shipping_country',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'integer',
            'discount_amount' => 'integer',
            'shipping_amount' => 'integer',
            'tax_amount' => 'integer',
            'total_amount' => 'integer',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? []);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    /**
     * Null once the saved address is deleted; the shipping_* snapshot stays (RG20).
     */
    public function shippingAddress(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'shipping_address_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(OrderLine::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function refunds(): HasManyThrough
    {
        return $this->hasManyThrough(Refund::class, Payment::class);
    }
}
