<?php

namespace App\Services;

use App\Models\IdempotencyKey;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class IdempotencyService
{
    public function makeRequestHash(
        string $endpoint,
        array $data
    ): string {
        ksort($data); // sort array by key 

        return hash(
            'sha256',
            $endpoint . '|' . json_encode($data, JSON_THROW_ON_ERROR)
        );
    }
    // check if the key already exist, if not create it.
    public function findOrCreate(
        int|string $userId,
        string $key,
        string $endpoint,
        string $requestHash
    ): IdempotencyKey {
        $record = IdempotencyKey::where('user_id', $userId)
            ->where('key', $key)
            ->first();

        if ($record) {
            // validate the key have same body request
            return $this->validateExisting(
                $record,
                $endpoint,
                $requestHash
            );
        }

        try {
            // create a record for this new key 
            return IdempotencyKey::create([
                'user_id' => $userId,
                'key' => $key,
                'endpoint' => $endpoint,
                'request_hash' => $requestHash,
                'status' => 'processing',
                'expires_at' => now()->addDay(),
            ]);
        } catch (QueryException $e) {
            
        
            //Another concurrent request may have inserted
            //this user's key first.
            $record = IdempotencyKey::where('user_id', $userId)
                ->where('key', $key)
                ->first();

            if (!$record) {
                throw $e;
            }

            return $this->validateExisting(
                $record,
                $endpoint,
                $requestHash
            );
        }
    }

    private function validateExisting(
        IdempotencyKey $record,
        string $endpoint,
        string $requestHash
    ): IdempotencyKey {
        // validate the existing record have same endpoint and body request 
        if (
            $record->endpoint !== $endpoint ||
            $record->request_hash !== $requestHash
        ) {
            throw ValidationException::withMessages([
                'Idempotency-Key' => [
                    'This key was already used with different request data.',
                ],
            ]);
        }

        if ($record->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'Idempotency-Key' => [
                    'This idempotency key has expired. Use a new key.',
                ],
            ]);
        }

        return $record;
    }

    public function complete(
        IdempotencyKey $record,
        int $status,
        array $body
    ): void {
        $record->update([
            'status' => 'completed',
            'response_status' => $status,
            'response_body' => $body, // store checkout session url and paiment Id
        ]);
    }

    public function fail(IdempotencyKey $record): void
    {
        $record->update([
            'status' => 'failed',
        ]);
    }
}