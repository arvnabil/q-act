<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    public function index(): Response
    {
        $brands = Brand::withCount('products')->orderBy('name')->get()->map(fn($b) => [
            'id' => $b->id,
            'name' => $b->name,
            'color_hex' => $b->color_hex ?? '#6366f1',
            'products_count' => $b->products_count,
        ]);

        return Inertia::render('Brands', [
            'brands' => $brands,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:brands,name',
            'color_hex' => 'nullable|string|max:20',
        ]);

        $brand = Brand::create([
            'name' => $validated['name'],
            'color_hex' => $validated['color_hex'] ?? '#6366f1',
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Brand berhasil ditambahkan.', 'brand' => $brand]);
        }

        return back()->with('message', 'Brand berhasil ditambahkan.');
    }

    public function update(Request $request, Brand $brand)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:brands,name,' . $brand->id,
            'color_hex' => 'nullable|string|max:20',
        ]);

        $brand->update($validated);

        return back()->with('message', 'Brand berhasil diperbarui.');
    }

    public function destroy(Brand $brand)
    {
        if ($brand->products()->count() > 0) {
            return back()->with('error', "Brand \"{$brand->name}\" tidak dapat dihapus karena masih memiliki produk terkait.");
        }

        $brand->delete();

        return back()->with('message', 'Brand berhasil dihapus.');
    }
}
