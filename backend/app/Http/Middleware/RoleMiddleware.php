<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $userRole = $request->user()->role;
        if ($userRole !== $role) {
            return response()->json([
                'message' => 'You are not authorized for this action',
            ], 403);
        }

        return $next($request);
    }
}
