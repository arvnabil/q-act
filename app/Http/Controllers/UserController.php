<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $users = User::with('roles')->orderBy('name')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'sales_code' => $user->sales_code,
                'mobile' => $user->mobile,
                'role' => $user->roles->first()?->name ?? 'Sales',
            ];
        });

        return Inertia::render('Users', [
            'users' => $users,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'string', 'min:6'],
            'sales_code' => ['required', 'string', 'max:50'],
            'mobile' => ['nullable', 'string', 'max:50'],
            'role' => ['required', 'string'],
        ]);

        $user = clone(new User);
        $user->fill([
            'name' => trim($validated['name']) ?: explode('@', $validated['email'])[0],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'sales_code' => strtoupper($validated['sales_code']),
            'mobile' => $validated['mobile'] ?? null,
            'is_active' => true,
        ]);
        $user->save();

        // Assign Spatie Role
        $user->assignRole($validated['role']);

        return back()->with('message', 'User berhasil ditambahkan!');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'sales_code' => ['required', 'string', 'max:50'],
            'mobile' => ['nullable', 'string', 'max:50'],
            'role' => ['required', 'string'],
        ]);

        $user->update([
            'name' => trim($validated['name']),
            'sales_code' => strtoupper($validated['sales_code']),
            'mobile' => $validated['mobile'] ?? null,
        ]);

        // Sync Spatie Role
        $user->syncRoles([$validated['role']]);

        return back()->with('message', 'User berhasil diperbarui!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        // Prevent deleting if they have quotations
        if ($user->quotations()->exists()) {
            return back()->with('error', 'User tidak dapat dihapus karena memiliki data quotation yang terikat.');
        }

        $user->delete();

        return back()->with('message', 'User berhasil dihapus.');
    }
}
