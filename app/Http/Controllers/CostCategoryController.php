<?php

namespace App\Http\Controllers;

use App\Models\CostCategory;
use Illuminate\Http\Request;

class CostCategoryController extends Controller
{
    public function index()
    {
        $categories = CostCategory::orderBy('sort_order')->orderBy('name')->get();
        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:cost_categories,name',
        ]);

        $category = CostCategory::create([
            'name'       => trim($validated['name']),
            'is_default' => false,
            'sort_order' => 99,
        ]);

        if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json(['message' => 'Kategori biaya berhasil ditambahkan.', 'category' => $category]);
        }

        return back()->with('message', 'Kategori biaya berhasil ditambahkan.');
    }

    public function update(Request $request, CostCategory $costCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:cost_categories,name,' . $costCategory->id,
        ]);

        $oldName = $costCategory->name;
        $newName = trim($validated['name']);

        $costCategory->update(['name' => $newName]);

        // Sync existing costs using this category
        \App\Models\SalesOrderCost::where('cost_category_id', $costCategory->id)
            ->orWhere('category_name', $oldName)
            ->update(['category_name' => $newName, 'cost_category_id' => $costCategory->id]);

        if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json(['message' => 'Kategori biaya berhasil diperbarui.', 'category' => $costCategory]);
        }

        return back()->with('message', 'Kategori biaya berhasil diperbarui.');
    }

    public function destroy(CostCategory $costCategory, Request $request)
    {
        $costCategory->delete();

        if ($request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest') {
            return response()->json(['message' => 'Kategori biaya berhasil dihapus.']);
        }

        return back()->with('message', 'Kategori biaya berhasil dihapus.');
    }
}
