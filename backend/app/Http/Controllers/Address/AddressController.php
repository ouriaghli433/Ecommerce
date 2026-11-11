<?php

namespace App\Http\Controllers\Address;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\StoreAddressRequest;
use App\Http\Requests\Address\UpdateAddressRequest;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request)
    {
        $addresses = $request->user()
            ->addresses()
            ->get();

        return response()->json([
            'addresses' => $addresses,
        ], 200);
    }

    public function store(StoreAddressRequest $request)
    {
        $validated = $request->validated();

        if ($request->boolean('is_default')) {
            $request->user()->addresses()->update([
                'is_default' => false,
            ]);
        }

        $address = $request->user()
            ->addresses()
            ->create($validated);

        return response()->json([
            'message' => 'Address created successfully.',
            'address' => $address,
        ], 201);
    }

    public function show(Request $request, string $addressId)
    {
        $address = $request->user()
            ->addresses()
            ->findOrFail($addressId);

        return response()->json([
            'address' => $address,
        ], 200);
    }

    public function update(
        UpdateAddressRequest $request,
        string $addressId
    ) {
        $address = $request->user()
            ->addresses()
            ->findOrFail($addressId);

        $validated = $request->validated();

        if ($request->boolean('is_default')) {
            $request->user()->addresses()
                ->where('id', '!=', $address->id)
                ->update([
                    'is_default' => false,
                ]);
        }

        $address->update($validated);

        return response()->json([
            'message' => 'Address updated successfully.',
            'address' => $address,
        ], 200);
    }

    public function destroy(Request $request, string $addressId)
    {
        $address = $request->user()
            ->addresses()
            ->findOrFail($addressId);

        if ($address->orders()->exists()) {
            return response()->json([
                'message' => 'This address is linked to an order and cannot be deleted.',
            ], 409);
        }

        $address->delete();

        return response()->json([
            'message' => 'Address deleted successfully.',
        ], 200);
    }
}
