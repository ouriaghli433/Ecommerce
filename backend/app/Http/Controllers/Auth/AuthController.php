<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $validated = $request->validated();
        $first_name = $validated['first_name'];
        $last_name = $validated['last_name'];
        $email = $validated['email'];
        $password = Hash::make($validated['password']);
        $user = User::create([
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email' => $email,
            'password' => $password,
            'role' => 'customer',
        ]);
        $token = $user->createToken('access-token')->plainTextToken;

        return response()->json([
            'customer' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $validated = $request->validated();
        $user = User::where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'email or password is incorrect',
            ], 401);
        }
        if (! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'email or password is incorrect',
            ], 401);
        }
        $token = $user->createToken('access-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 200);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
        ], 200);

    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'logout succesfully',
        ]);
    }
}
