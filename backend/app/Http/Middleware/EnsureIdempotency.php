<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Makes a POST safe to repeat.
 *
 * The client sends a header it invents once, for example:
 *     Idempotency-Key: 9f1c...   (any string, one per user action)
 *
 * If the answer never arrives (lost network, mobile app retry), the client
 * sends the SAME request again with the SAME key. Then:
 *
 * - same key + same body  -> the stored answer is returned, the action does
 *   NOT run a second time (no second order, no second payment);
 * - same key + other body -> 409, because that key already means something else;
 * - key still running     -> 409, so two parallel copies never both execute.
 *
 * Without the header, nothing changes: the request runs normally.
 */
class EnsureIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $key) {
            return $next($request);
        }

        $userId = $request->user()?->id;

        // path() has no leading slash, e.g. "api/checkout".
        $path = $request->path();

        // What the request IS: same body = same hash.
        $hash = hash('sha256', $request->getContent());

        // Try to claim the key. The unique index (user_id, key, method, path)
        // means only ONE request can insert this row, even if ten arrive at
        // the same moment. ON CONFLICT DO NOTHING keeps the transaction clean.
        $claimed = IdempotencyKey::insertOrIgnore([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'key' => $key,
            'request_method' => $request->method(),
            'request_path' => $path,
            'request_hash' => $hash,
            'expires_at' => now()->addDay(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($claimed === 0) {
            return $this->replayOrReject($userId, $key, $request->method(), $path, $hash);
        }

        $response = $next($request);

        $this->remember($userId, $key, $request->method(), $path, $response);

        return $response;
    }

    /**
     * The key already exists: either we answer like last time, or we refuse.
     */
    private function replayOrReject(?string $userId, string $key, string $method, string $path, string $hash): Response
    {
        $record = IdempotencyKey::where('user_id', $userId)
            ->where('key', $key)
            ->where('request_method', $method)
            ->where('request_path', $path)
            ->first();

        if (! $record) {
            // Extremely rare: the row was pruned between the two queries.
            return response()->json(['message' => 'Please retry this request.'], 409);
        }

        if ($record->request_hash !== $hash) {
            return response()->json([
                'message' => 'This Idempotency-Key was already used with a different request.',
            ], 409);
        }

        if ($record->response_status === null) {
            return response()->json([
                'message' => 'A request with this Idempotency-Key is still running.',
            ], 409);
        }

        return response()
            ->json($record->response_body, $record->response_status)
            ->header('Idempotency-Replayed', 'true');
    }

    /**
     * Store the answer so the next copy of this request can replay it.
     *
     * A server error (5xx) is NOT stored: the key row is deleted instead, so
     * the client may really try again after the problem is fixed.
     */
    private function remember(?string $userId, string $key, string $method, string $path, Response $response): void
    {
        $record = IdempotencyKey::where('user_id', $userId)
            ->where('key', $key)
            ->where('request_method', $method)
            ->where('request_path', $path)
            ->first();

        if (! $record) {
            return;
        }

        if ($response->getStatusCode() >= 500) {
            $record->delete();

            return;
        }

        $record->update([
            'response_status' => $response->getStatusCode(),
            'response_body' => json_decode($response->getContent(), true),
        ]);
    }
}
