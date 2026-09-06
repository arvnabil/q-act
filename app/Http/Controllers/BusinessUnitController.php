<?php

namespace App\Http\Controllers;

use App\Models\BusinessUnit;
use App\Models\BusinessUnitMember;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class BusinessUnitController extends Controller
{
    /**
     * Display a listing of Business Units.
     */
    public function index(): Response
    {
        $businessUnits = BusinessUnit::with(['members' => function ($query) {
            $query->orderByRaw("FIELD(role_in_bu, 'lead', 'member')");
        }])->orderBy('name')->get()->map(function ($bu) {
            return [
                'id'          => $bu->id,
                'name'        => $bu->name,
                'code'        => $bu->code,
                'color'       => $bu->color,
                'description' => $bu->description,
                'is_active'   => $bu->is_active,
                'members'     => $bu->members->map(function ($m) {
                    $u = User::find($m->user_id);
                    return [
                        'id'         => $m->id,
                        'user_id'    => $m->user_id,
                        'role_in_bu' => $m->role_in_bu,
                        'joined_at'  => $m->joined_at,
                        'user'       => $u ? [
                            'id'         => $u->id,
                            'name'       => $u->name,
                            'email'      => $u->email,
                            'role'       => $u->role,
                            'sales_code' => $u->sales_code,
                        ] : null,
                    ];
                })->values()->toArray(),
            ];
        });

        $allUsers = User::orderBy('name')->get(['id', 'name', 'email', 'role', 'sales_code']);

        $assignedUserIds = BusinessUnitMember::pluck('user_id')->toArray();
        $usersWithoutBU = $allUsers->reject(fn($u) => in_array($u->id, $assignedUserIds))->values();

        return Inertia::render('BusinessUnits', [
            'businessUnits'  => $businessUnits,
            'allUsers'       => $allUsers,
            'usersWithoutBU' => $usersWithoutBU,
        ]);
    }

    /**
     * Store a newly created Business Unit.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'code'        => 'required|string|max:10|unique:business_units,code',
            'color'       => 'nullable|string|max:20',
            'description' => 'nullable|string',
        ]);

        BusinessUnit::create([
            'id'          => (string) Str::uuid(),
            'name'        => trim($request->name),
            'code'        => strtoupper(trim($request->code)),
            'color'       => $request->color ?: '#6366f1',
            'description' => $request->description,
            'is_active'   => true,
        ]);

        return back()->with('message', 'Business Unit berhasil dibuat!');
    }

    /**
     * Update the specified Business Unit.
     */
    public function update(Request $request, string $id)
    {
        $bu = BusinessUnit::findOrFail($id);

        $request->validate([
            'name'        => 'required|string|max:255',
            'code'        => 'required|string|max:10|unique:business_units,code,' . $id,
            'color'       => 'nullable|string|max:20',
            'description' => 'nullable|string',
            'is_active'   => 'nullable|boolean',
        ]);

        $bu->update([
            'name'        => trim($request->name),
            'code'        => strtoupper(trim($request->code)),
            'color'       => $request->color ?: $bu->color,
            'description' => $request->description,
            'is_active'   => $request->boolean('is_active', true),
        ]);

        return back()->with('message', 'Business Unit berhasil diperbarui!');
    }

    /**
     * Remove the specified Business Unit.
     */
    public function destroy(string $id)
    {
        $bu = BusinessUnit::findOrFail($id);
        BusinessUnitMember::where('business_unit_id', $id)->delete();
        $bu->delete();

        return back()->with('message', 'Business Unit berhasil dihapus!');
    }

    /**
     * Add a member to a Business Unit.
     */
    public function addMember(Request $request, string $buId)
    {
        $request->validate([
            'user_id'    => 'required|string|exists:users,id',
            'role_in_bu' => 'required|in:member,lead',
        ]);

        BusinessUnitMember::where('user_id', $request->user_id)->delete();

        BusinessUnitMember::create([
            'id'               => (string) Str::uuid(),
            'business_unit_id' => $buId,
            'user_id'          => $request->user_id,
            'role_in_bu'       => $request->role_in_bu,
            'joined_at'        => now(),
        ]);

        return back()->with('message', 'Anggota berhasil ditambahkan ke BU!');
    }

    /**
     * Remove a member from a Business Unit.
     */
    public function removeMember(string $buId, string $userId)
    {
        BusinessUnitMember::where('business_unit_id', $buId)
            ->where('user_id', $userId)
            ->delete();

        return back()->with('message', 'Anggota berhasil dikeluarkan dari BU!');
    }
}
