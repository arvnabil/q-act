<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user()?->load('roles');

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    ...$user->toArray(),
                    'spatie_role' => $user->roles->first()?->name ?? $user->role ?? null,
                ] : null,
                'permissions' => $user ? $user->getAllPermissions()->pluck('name')->toArray() : [],
            ],
            'flash' => [
                'message' => fn () => $request->session()->get('message'),
                'error'   => fn () => $request->session()->get('error'),
            ],
            'notifications' => fn () => $user ? \App\Models\Notification::where('user_id', $user->id)->orderByDesc('created_at')->limit(30)->get() : [],
            'unread_count' => fn () => $user ? \App\Models\Notification::where('user_id', $user->id)->where('is_read', false)->count() : 0,
        ];
    }
}
