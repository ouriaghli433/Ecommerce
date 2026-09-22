<?php

namespace App\Providers;

use App\Services\Payment\FakePaymentProvider;
use App\Services\Payment\PaymentProvider;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Every class that asks for a PaymentProvider gets the one named in
        // config/payment.php (PAYMENT_PROVIDER in .env). Adding a real
        // provider later means writing one class and one line here.
        $this->app->bind(PaymentProvider::class, function () {
            return match (config('payment.provider')) {
                'fake' => new FakePaymentProvider,
                default => throw new InvalidArgumentException('Unknown payment provider: '.config('payment.provider')),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
