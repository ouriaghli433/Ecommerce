<?php

namespace App\Http\Controllers\Address;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\StoreAddressRequest;
use App\Http\Requests\Address\UpdateAddressRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $user = $request->user();

        $address = DB::transaction(function () use ($user, $validated) {

            // Lock user to prevent concurrent default-address changes
            $user = $user->newQuery()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $addresses = $user->addresses();

            $hasDefault = $addresses
                ->where('is_default', true)
                ->exists();

            // First address automatically becomes default
            $makeDefault = ($validated['is_default'] ?? false) || !$hasDefault;

            if ($makeDefault) {
                $addresses->update([
                    'is_default' => false,
                ]);
            }

            $validated['is_default'] = $makeDefault;

            return $addresses->create($validated);
        });

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
        $validated = $request->validated();
        $user = $request->user();

        $address = DB::transaction(function () use ($user, $addressId, $validated) {

            $user = $user->newQuery()
                ->whereKey($user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $addresses = $user->addresses();

            $address = $addresses->findOrFail($addressId);

            $makeDefault = $validated['is_default'] ?? $address->is_default;

            if ($makeDefault) {

                $addresses
                    ->where('id', '!=', $address->id)
                    ->update([
                        'is_default' => false,
                    ]);

                $validated['is_default'] = true;

            } else {

                $otherDefaultExists = $addresses
                    ->where('id', '!=', $address->id)
                    ->where('is_default', true)
                    ->exists();

                // Never allow a user with addresses to have zero defaults
                $validated['is_default'] = !$otherDefaultExists;
            }

            $address->update($validated);

            return $address->fresh();
        });

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

        $wasDefault = $address->is_default;

        DB::transaction(function () use ($request, $address, $wasDefault) {

            $address->delete();

            if ($wasDefault) {
                $replacement = $request->user()
                    ->addresses()
                    ->orderBy('created_at')
                    ->first();

                $replacement?->update([
                    'is_default' => true,
                ]);
            }
        });

        return response()->json([
            'message' => 'Address deleted successfully.',
        ], 200);
    }
}
