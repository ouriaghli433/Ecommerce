<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Orders that were not paid in time are expired and their stock released.
// Needs the scheduler running: php artisan schedule:work (see the README).
Schedule::command('orders:expire')
    ->everyMinute()
    ->withoutOverlapping();

// Keeps the idempotency_keys table small.
Schedule::command('idempotency:prune')->daily();
