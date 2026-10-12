<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request){
        $validated = $request->validate([
            'first_name' => 'required|string|max:50',
            'last_name' => 'required|string|max:50',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|confirmed|min:8',
        ]);
        $first_name = $validated['first_name'];
        $last_name = $validated['last_name'];
        $email = $validated['email'];
        $password = Hash::make($validated['password']);
        $user = User::create([
            'first_name' => $first_name,
            'last_name' => $last_name,
            'email' => $email,
            'password' => $password,
        ]);
        $token = $user->createToken('access-token')->plainTextToken;
        return response()->json([
            'costumer' => $user,
            'token' => $token
        ],201);
    }
    public function login(){
        
    }
    public function me(){
        
    }
    public function logout(){
        
    }
}
