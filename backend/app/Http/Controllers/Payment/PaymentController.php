<?php

namespace App\Http\Controllers\Payment;

use App\Models\Inventory;
use App\Services\InventoryService;
use App\Models\IdempotencyKey;
use Carbon\Carbon;
use App\Services\IdempotencyService;
use Illuminate\Support\Str;
use Stripe\Exception\ApiErrorException;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\WebhookEvent;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Stripe\Checkout\Session;
use Stripe\Stripe;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Webhook;
use App\Services\RefundService;
use Stripe\Exception\SignatureVerificationException;
use UnexpectedValueException;
use Stripe\Exception\ApiConnectionException;
use Stripe\Exception\AuthenticationException;
use Stripe\Exception\InvalidRequestException;
use Stripe\Exception\PermissionException;
use Stripe\Exception\RateLimitException;
use Stripe\Exception\IdempotencyException;

class PaymentController extends Controller
{
    public function createCheckoutSession(
        Request $request,
        IdempotencyService $idempotencyService
    ) {
        $validated = $request->validate([
            'order_id' => ['required', 'uuid'],
        ]);

        $user = $request->user();

        $idempotencyKey = $request->header('Idempotency-Key');

        if (
            !is_string($idempotencyKey) ||
            trim($idempotencyKey) === ''
        ) {
            throw ValidationException::withMessages([
                'Idempotency-Key' => [
                    'The Idempotency-Key header is required.',
                ],
            ]);
        }

        if (strlen($idempotencyKey) > 255) {
            throw ValidationException::withMessages([
                'Idempotency-Key' => [
                    'The Idempotency-Key must not exceed 255 characters.',
                ],
            ]);
        }

        $idempotencyKey = trim($idempotencyKey);

        $endpoint = 'POST:/payments/checkout';

        $requestHash = $idempotencyService->makeRequestHash(
            $endpoint,
            $validated // order_id
        );

        // find or register this idempotency request.
        $idempotencyRecord = $idempotencyService->findOrCreate(
            $user->id,
            $idempotencyKey,
            $endpoint,
            $requestHash
        );

        
        // Return the saved response for a completed request.
        if ($idempotencyRecord->status === 'completed') {
            return response()->json(
                $idempotencyRecord->response_body,
                $idempotencyRecord->response_status
            );
        }

        // Do not reuse a failed key
        if ($idempotencyRecord->status === 'failed') {
            return response()->json([
                'message' => 'This idempotency request has failed. Use a new key.',
            ], 409);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        /*
        * Create or recover the local Payment attempt.
        *
        * The Order and IdempotencyKey rows are locked to protect
        * concurrent requests from creating duplicate attempts.
        */
        $payment = DB::transaction(function () use (
            $user,
            $validated,
            $idempotencyRecord
        ) {
            // get user's order 
            $order = Order::where('user_id', $user->id)
                ->where('id', $validated['order_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status !== 'pending_payment') {
                throw ValidationException::withMessages([
                    'order' => 'This order cannot be paid.',
                ]);
            }

            if ($order->expires_at && $order->expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'order' => 'This order has expired.',
                ]);
            }

            $record = IdempotencyKey::whereKey($idempotencyRecord->id)
                ->lockForUpdate()
                ->firstOrFail();

            // This idempotency record already points to a Payment.
            // Reuse that attempt for retries.
            if ($record->payment_id) {
                return Payment::whereKey($record->payment_id)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            /*
            * Reuse an existing pending Payment attempt for this Order,
            * if one exists.
            * if paiment exist but not connected with this record 
            */
            $payment = Payment::where('order_id', $order->id)
                ->where('provider', 'stripe')
                ->where('status', 'pending')
                ->latest()
                ->lockForUpdate()
                ->first();

            // Otherwise, create a new Payment attempt.
            if (!$payment) {
                $payment = Payment::create([
                    'order_id' => $order->id,
                    'status' => 'pending',
                    'amount' => $order->total_amount,
                    'currency' => strtolower($order->currency),
                    'provider' => 'stripe',
                    'provider_ref' => null,
                    'checkout_expires_at' => null,
                ]);
            }

            // link the idempotency record to this Payment.
            $record->update([
                'payment_id' => $payment->id,
            ]);

            return $payment;
        });

        /*
        * If this Payment already has a Stripe Checkout Session,
        * try to return that existing Session.
        */
        if ($payment->provider_ref) {
            try {
                $existingSession = Session::retrieve(
                    $payment->provider_ref
                );
            } catch (
                IdempotencyException |
                InvalidRequestException |
                AuthenticationException |
                PermissionException $e
            ) {
                $payment->update([
                    'status' => 'failed',
                    'failure_reason' => 'Unable to retrieve the Stripe checkout session.',
                ]);

                $idempotencyService->fail($idempotencyRecord);

                report($e);

                return response()->json([
                    'message' => 'Unable to start payment checkout. Use a new Idempotency-Key after the issue is corrected.',
                ], 502);
            } catch (ApiConnectionException | RateLimitException $e) {
                report($e);

                return response()->json([
                    'message' => 'Payment provider is temporarily unavailable. Retry with the same Idempotency-Key.',
                ], 503);
            } catch (ApiErrorException $e) {
                report($e);

                return response()->json([
                    'message' => 'Payment provider is temporarily unavailable. Retry with the same Idempotency-Key.',
                ], 503);
            }

            if (
                $existingSession->status === 'open' &&
                $existingSession->url
            ) {
                $body = [
                    'checkout_url' => $existingSession->url,
                    'payment_id' => $payment->id,
                ];

                $idempotencyService->complete(
                    $idempotencyRecord,
                    200,
                    $body
                );

                return response()->json($body, 200);
            }

            /*
            * The previous Checkout Session is no longer open.
            * Mark the Payment attempt expired.
            */
            $payment->update([
                'status' => 'expired',
            ]);

            $idempotencyService->fail($idempotencyRecord);

            return response()->json([
                'message' => 'This checkout session has expired. Start a new checkout with a new Idempotency-Key.',
            ], 409);
        }

        /*
        * Create the Stripe Checkout Session.
        *
        * The Stripe idempotency key is stable for this Payment attempt.
        * If the request is retried, Stripe can return the same Session.
        */
        try {
            $session = Session::create([

                'line_items' => [
                    [
                        'price_data' => [
                            'currency' => strtolower($payment->currency),
                            'unit_amount' => $payment->amount,
                            'product_data' => [
                                'name' => 'Order ' . $payment->order_id,
                            ],
                        ],
                        'quantity' => 1,
                    ],
                ],

                'mode' => 'payment',

                'success_url' => config('app.frontend_url')
                    . '/checkout/success?session_id={CHECKOUT_SESSION_ID}',

                'cancel_url' => config('app.frontend_url')
                    . '/checkout/cancel',

                'metadata' => [
                    'order_id' => $payment->order_id,
                    'payment_id' => $payment->id,
                ],
            ], [
                'idempotency_key' => 'checkout-session:' . $payment->id,
            ]);
        } catch (IdempotencyException | InvalidRequestException | AuthenticationException | PermissionException $e) {
            // Permanent: invalid Stripe payload, invalid key, or bad permissions.
            $payment->update([
                'status' => 'failed',
                'failure_reason' => 'Stripe checkout configuration failed.',
            ]);

            $idempotencyService->fail($idempotencyRecord);

            report($e);

            return response()->json([
                'message' => 'Unable to start payment checkout. Please use a new idempotency key after the issue is corrected.',
            ], 502);
        } catch (ApiConnectionException | RateLimitException $e) {
            // Transient: Stripe might still have created the session.
            // Keep payment pending and idempotency status as processing.
            // Client must retry using the SAME key.
            report($e);

            return response()->json([
                'message' => 'Payment provider is temporarily unavailable. Retry with the same Idempotency-Key.',
            ], 503);
        }catch (ApiErrorException $e) {
            report($e);

            return response()->json([
                'message' => 'Payment provider is temporarily unavailable. Retry with the same Idempotency-Key.',
            ], 503);
        }
        /*
        * Save the Stripe Session reference and expiry.
        */
        $payment->update([
            'provider_ref' => $session->id,
            'checkout_expires_at' => Carbon::createFromTimestamp(
                $session->expires_at
            ),
        ]);

        /*
        * Save the response for future retries with the same key.
        */
        $body = [
            'checkout_url' => $session->url,
            'payment_id' => $payment->id,
        ];

        $idempotencyService->complete(
            $idempotencyRecord,
            201,
            $body
        );

        return response()->json($body, 201);
    }
    public function handleWebhook(Request $request, InventoryService $inventoryService, RefundService $refundService)
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        $webhookSecret = config('services.stripe.webhook_secret');

        // Verify Stripe signature and parse the event.
        try {
            $event = Webhook::constructEvent(
                $payload,
                $signature,
                $webhookSecret
            );
        } catch (UnexpectedValueException | SignatureVerificationException $e) {
            return response()->json([
                'message' => 'Invalid webhook signature or payload.',
            ], 400);
        }

        // Register the verified event.
        $webhookEvent = WebhookEvent::firstOrCreate(
            ['event_id' => $event->id],
            [
                'provider' => 'stripe',
                'status' => 'pending',
                'payload' => json_decode($payload, true),
            ]
        );

        // Do not process an event that was already completed.
        if ($webhookEvent->status === 'processed') {
            return response()->json([
                'message' => 'Event already processed.',
            ], 200);
        }

        try {
            /*
            * Successful or completed Checkout Session.
            */
            
            if (in_array($event->type, [
                'checkout.session.completed',
                'checkout.session.async_payment_succeeded',
            ], true)) {
                $session = $event->data->object;

                if ($session->payment_status !== 'paid') {
                    $webhookEvent->update([
                        'status' => 'processed',
                        'processed_at' => now(),
                        'error_message' => null,
                    ]);

                    return response()->json([
                        'message' => 'Checkout completed, payment not confirmed yet.',
                    ], 200);
                }

                [$payment, $isLatePayment] = DB::transaction(
                    function () use ($session, $inventoryService) {
                        $payment = Payment::where('provider', 'stripe')
                            ->where('provider_ref', $session->id)
                            ->lockForUpdate()
                            ->first();

                        if ($payment === null) {
                            throw new \RuntimeException(
                                'No local payment found for Stripe Checkout Session.'
                            );
                        }

                        $order = Order::where('id', $payment->order_id)
                            ->lockForUpdate()
                            ->first();

                        if ($order === null) {
                            throw new \RuntimeException(
                                'No local order found for Stripe payment.'
                            );
                        }

                        // Verify amount and currency.
                        if (
                            $session->amount_total !== $payment->amount ||
                            strtolower($session->currency) !==
                            strtolower($payment->currency)
                        ) {
                            throw new \RuntimeException(
                                'Stripe payment amount or currency mismatch.'
                            );
                        }

                        // Payment was already processed.
                        if ($payment->status === 'succeeded') {
                            return [
                                $payment,
                                $order->status === 'expired',
                            ];
                        }

                        // The order expired before the payment was confirmed.
                        // Do not sell inventory; refund the payment instead.
                        if ($order->status === 'expired') {
                            $payment->update([
                                'status' => 'succeeded',
                                'succeeded_at' => now(),
                            ]);

                            return [$payment, true];
                        }

                        if ($order->status !== 'pending_payment') {
                            throw new \RuntimeException(
                                'Order is not in pending_payment status.'
                            );
                        }

                        foreach ($order->orderLines as $orderLine) {
                            $inventory = Inventory::where(
                                'product_id',
                                $orderLine->product_id
                            )
                                ->lockForUpdate()
                                ->first();

                            if (! $inventory) {
                                throw new \RuntimeException(
                                    "No inventory found for product {$orderLine->product_id}."
                                );
                            }

                            $inventoryService->recordMovement(
                                inventory: $inventory,
                                type: 'sale',
                                quantity: $orderLine->quantity,
                                reason: 'Paid order',
                                referenceType: 'order',
                                referenceId: $order->id,
                            );
                        }

                        $payment->update([
                            'status' => 'succeeded',
                            'succeeded_at' => now(),
                        ]);

                        $order->update([
                            'status' => 'paid',
                            'paid_at' => now(),
                        ]);

                        return [$payment, false];
                    }
                );

                // Late payment: issue a full refund outside the DB transaction.
                if ($isLatePayment) {
                    $refund = $refundService->create(
                        $payment,
                        null,
                        'late_payment'
                    );

                    if ($refund->status === 'failed') {
                        throw new \RuntimeException(
                            'Late payment refund failed and requires manual review.'
                        );
                    }
                }
            }

            elseif ($event->type === 'checkout.session.expired') {
                $session = $event->data->object;

                DB::transaction(function () use ($session) {
                    $payment = Payment::where('provider', 'stripe')
                        ->where('provider_ref', $session->id)
                        ->lockForUpdate()
                        ->first();

                    if ($payment === null) {
                        throw new \RuntimeException(
                            'No local payment found for expired Stripe Checkout Session.'
                        );
                    }

                    // Never overwrite a successful payment.
                    if ($payment->status === 'succeeded') {
                        return;
                    }

                    $payment->update([
                        'status' => 'expired',
                        'failure_reason' => 'Stripe Checkout Session expired.',
                    ]);
                });
            }
            /*
            * Asynchronous payment failed.
            * Stripe sends this event when a delayed payment method fails.
            */
            elseif ($event->type === 'checkout.session.async_payment_failed') {
                $session = $event->data->object;

                DB::transaction(function () use ($session) {
                    $payment = Payment::where('provider', 'stripe')
                        ->where('provider_ref', $session->id)
                        ->lockForUpdate()
                        ->first();

                    if ($payment === null) {
                        throw new \RuntimeException(
                            'No local payment found for failed Stripe Checkout Session.'
                        );
                    }

                    // Do not overwrite a successful payment.
                    if ($payment->status === 'succeeded') {
                        return;
                    }

                    $order = Order::where('id', $payment->order_id)
                        ->lockForUpdate()
                        ->first();

                    if ($order === null) {
                        throw new \RuntimeException(
                            'No local order found for failed Stripe payment.'
                        );
                    }

                    $payment->update([
                        'status' => 'failed',
                        'failure_reason' => 'Stripe reported asynchronous payment failure.',
                    ]);

                    // Keep the order pending_payment for now.
                    // Your business rules can decide whether to cancel it.
                });
            }

            /*
            * Other event types are recorded and ignored for now.
            */

            // The event was handled successfully.
            $webhookEvent->update([
                'status' => 'processed',
                'processed_at' => now(),
                'error_message' => null,
            ]);

        } catch (\Throwable $e) {
            // Store the processing failure after any DB transaction rolls back.
            $webhookEvent->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            // Return an error so Stripe can retry the webhook.
            throw $e;
        }

        return response()->json([
            'message' => 'Webhook received.',
        ], 200);
    }
}
