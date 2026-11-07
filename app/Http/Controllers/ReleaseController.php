<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ReleaseController extends Controller
{
    /**
     * Display the version info and detailed weekly release notes.
     */
    public function index(Request $request)
    {
        $releaseData = config('releases');

        return Inertia::render('ReleaseNotes', [
            'currentVersion' => $releaseData['current_version'] ?? 'v2.4.0',
            'lastUpdated' => $releaseData['last_updated'] ?? '2026-11-07',
            'releases' => $releaseData['releases'] ?? [],
        ]);
    }
}
