<?php

// Shop settings. All amounts are integers in centimes (100 centimes = 1 MAD).
return [

    // How long the customer has to pay after checkout (RG26: 15 to 30 minutes).
    'payment_window_minutes' => (int) env('SHOP_PAYMENT_WINDOW_MINUTES', 20),

    // Extra minutes waited before the expiration job touches an order (RG29).
    'expiration_grace_minutes' => (int) env('SHOP_EXPIRATION_GRACE_MINUTES', 2),

    // Flat delivery price, and the order amount above which delivery is free.
    'shipping_amount' => (int) env('SHOP_SHIPPING_AMOUNT', 3000),
    'free_shipping_from' => (int) env('SHOP_FREE_SHIPPING_FROM', 50000),

    // Tax percent applied to (subtotal - discount). 0 keeps prices tax included.
    'tax_percent' => (int) env('SHOP_TAX_PERCENT', 0),

    'currency' => 'MAD',
];
