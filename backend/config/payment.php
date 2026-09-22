<?php

return [

    // Which provider class handles payments. "fake" is a local provider that
    // never calls the internet; it is used in development and in tests.
    'provider' => env('PAYMENT_PROVIDER', 'fake'),

    // Secret used to check the signature of incoming webhooks (RG36).
    'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET', 'local-webhook-secret'),

];
