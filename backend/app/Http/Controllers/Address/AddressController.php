<?php

namespace App\Http\Controllers\Address;

use App\Http\Controllers\Controller;
use App\Http\Requests\Address\StoreAddressRequest;
use App\Http\Requests\Address\UpdateAddressRequest;
use App\Http\Resources\Address\AddressResource;
use App\Models\Address;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class AddressController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $addresses = $request->user()->addresses()->orderByDesc('is_default')->get();

        return AddressResource::collection($addresses);
    }

    public function show(Address $address): AddressResource
    {
        Gate::authorize('view', $address);

        return new AddressResource($address);
    }

    public function store(StoreAddressRequest $request): AddressResource
    {
        $user = $request->user();

        $address = DB::transaction(function () use ($request, $user) {
            if ($request->boolean('is_default')) {
                $this->removeOtherDefaults($user);
            }

            return $user->addresses()->create($request->validated());
        });

        return new AddressResource($address);
    }

    public function update(UpdateAddressRequest $request, Address $address): AddressResource
    {
        DB::transaction(function () use ($request, $address) {
            if ($request->boolean('is_default')) {
                $this->removeOtherDefaults($request->user());
            }

            $address->update($request->validated());
        });

        return new AddressResource($address);
    }

    /**
     * Past orders keep their own copy of the address (RG20):
     * their shipping_address_id just becomes null.
     */
    public function destroy(Address $address): Response
    {
        Gate::authorize('delete', $address);

        $address->delete();

        return response()->noContent();
    }

    // A customer has at most one default address (RG18).
    private function removeOtherDefaults(User $user): void
    {
        $user->addresses()->update(['is_default' => false]);
    }
}
