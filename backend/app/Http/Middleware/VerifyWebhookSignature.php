<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Webhooks are public: the payment provider has no user account and no token.
 * Instead, the provider signs the request body with a shared secret, and we
 * check that signature here (RG36). A wrong signature never reaches the app.
 */
class VerifyWebhookSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $signature = $request->header('X-Signature', '');

        // The signature is computed on the EXACT body bytes we received.
        $expected = hash_hmac('sha256', $request->getContent(), config('payment.webhook_secret'));

        // hash_equals compares in constant time, so an attacker cannot guess
        // the signature character by character by measuring the response time.
        if (! is_string($signature) || ! hash_equals($expected, $signature)) {
            Log::warning('Webhook with an invalid signature was rejected', [
                'ip' => $request->ip(),
            ]);

            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        return $next($request);
    }
}
