<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Http\Requests\Webhook\PaymentWebhookRequest;
use App\Services\Webhook\WebhookService;
use Illuminate\Http\JsonResponse;

class PaymentWebhookController extends Controller
{
    /**
     * POST /api/webhooks/payments/{provider}
     *
     * Called by the payment provider, not by a user. It always answers 200
     * when the event was understood or was a duplicate: an error code would
     * make the provider send the same event again and again.
     */
    public function store(PaymentWebhookRequest $request, string $provider, WebhookService $webhooks): JsonResponse
    {
        $result = $webhooks->handle($provider, $request->validated());

        return response()->json($result);
    }
}
