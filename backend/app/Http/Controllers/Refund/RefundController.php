<?php

namespace App\Http\Controllers\Refund;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\RefundService;
use Illuminate\Http\Request;

class RefundController extends Controller
{
    public function store(
        Request $request,
        Payment $payment,
        RefundService $refundService
    ) {
        $validated = $request->validate([
            'reason' => [
                'required',
                'in:late_payment,order_cancelled,customer_request,admin',
            ],
        ]);

        $refund = $refundService->create(
            $payment,
            $request->user(),
            $validated['reason']
        );

        return response()->json([
            'message' => 'Refund request created successfully.',
            'refund' => $refund,
        ], 201);
    }
}
