<?php

namespace App\Console\Commands;

use App\Models\IdempotencyKey;
use Illuminate\Console\Command;

/**
 * Old idempotency keys are useless: a client will not retry a request from
 * yesterday. This keeps the table small.
 */
class PruneIdempotencyKeysCommand extends Command
{
    protected $signature = 'idempotency:prune';

    protected $description = 'Delete idempotency keys that have expired';

    public function handle(): int
    {
        $deleted = IdempotencyKey::where('expires_at', '<', now())->delete();

        $this->info("Deleted {$deleted} expired idempotency key(s).");

        return self::SUCCESS;
    }
}
