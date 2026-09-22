<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * True when the request has a valid admin token.
     * Works on public routes too (where auth:sanctum is not applied).
     */
    protected function isAdmin(Request $request): bool
    {
        $user = $request->user('sanctum');

        return $user !== null && $user->isAdmin();
    }
}
