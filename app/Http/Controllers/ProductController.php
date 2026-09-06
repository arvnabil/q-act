<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Brand;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::with('brand')->orderBy('name')->get()->map(fn($p) => [
            'id' => $p->sku,
            'sku' => $p->sku,
            'name' => $p->name,
            'description' => $p->description,
            'price' => $p->price,
            'modal' => $p->modal,
            'pricelist_distributor' => $p->pricelist_distributor,
            'diskon_distributor' => $p->diskon_distributor,
            'image_url' => $p->image_url,
            'brand_id' => $p->brand_id,
            'brand' => $p->brand ? ['id' => $p->brand->id, 'name' => $p->brand->name, 'color_hex' => $p->brand->color_hex] : null,
        ]);

        $brands = Brand::orderBy('name')->get()->map(fn($b) => [
            'id' => $b->id,
            'name' => $b->name,
            'color_hex' => $b->color_hex,
        ]);

        return Inertia::render('Products', [
            'products' => $products,
            'brands' => $brands,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:100'],
            'name' => 'required|string|max:255',
            'brand_id' => 'nullable',
            'brand_name' => 'nullable|string',
            'description' => 'nullable|string',
            'price' => 'nullable|numeric|min:0',
            'modal' => 'nullable|numeric|min:0',
            'pricelist_distributor' => 'nullable|numeric|min:0',
            'diskon_distributor' => 'nullable|numeric|min:0|max:100',
            'image_url' => 'nullable|string',
        ]);

        $brandId = $request->input('brand_id');
        if (!$brandId && $request->filled('brand_name')) {
            $brand = Brand::firstOrCreate(
                ['name' => trim($request->input('brand_name'))],
                ['color_hex' => '#6366f1']
            );
            $brandId = $brand->id;
        }

        $price = $validated['price'] ?? 0;
        $modal = $validated['modal'] ?? 0;
        $pricelistDist = $validated['pricelist_distributor'] ?? 0;
        $diskonDist = $validated['diskon_distributor'] ?? 0;
        $imageUrl = $this->processImageUrl($validated['image_url'] ?? null, $validated['sku']);

        $product = Product::updateOrCreate(
            ['sku' => trim($validated['sku'])],
            [
                'name' => $validated['name'],
                'brand_id' => $brandId,
                'description' => $validated['description'] ?? null,
                'price' => $price,
                'modal' => $modal,
                'pricelist_distributor' => $pricelistDist,
                'diskon_distributor' => $diskonDist,
                'image_url' => $imageUrl,
            ]
        );

        NotificationService::notifyUser(
            $request->user()->id,
            'Produk Baru',
            "Anda menambahkan produk baru: {$product->name} ({$product->sku})",
            '/products'
        );

        return back()->with('message', 'Produk berhasil ditambahkan.');
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'sku' => ['required', 'string', 'max:100', \Illuminate\Validation\Rule::unique('products', 'sku')->ignore($product->sku, 'sku')],
            'name' => 'required|string|max:255',
            'brand_id' => 'nullable|exists:brands,id',
            'description' => 'nullable|string',
            'price' => 'nullable|numeric|min:0',
            'modal' => 'nullable|numeric|min:0',
            'pricelist_distributor' => 'nullable|numeric|min:0',
            'diskon_distributor' => 'nullable|numeric|min:0|max:100',
            'image_url' => 'nullable|string',
        ]);

        $validated['price'] = $validated['price'] ?? 0;
        $validated['modal'] = $validated['modal'] ?? 0;
        $validated['pricelist_distributor'] = $validated['pricelist_distributor'] ?? 0;
        $validated['diskon_distributor'] = $validated['diskon_distributor'] ?? 0;

        if (array_key_exists('image_url', $validated)) {
            $validated['image_url'] = $this->processImageUrl($validated['image_url'], $validated['sku']);
        }

        // Hapus file gambar lama jika image_url diganti
        if (array_key_exists('image_url', $validated) && $validated['image_url'] !== $product->image_url) {
            if ($product->image_url && str_contains($product->image_url, '/storage/')) {
                $oldPath = ltrim(str_replace('/storage/', '', parse_url($product->image_url, PHP_URL_PATH)), '/');
                if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }
        }

        $product->update($validated);

        NotificationService::notifyUser(
            $request->user()->id,
            'Produk Diperbarui',
            "Anda memperbarui produk: {$product->name} ({$product->sku})",
            '/products'
        );

        return back()->with('message', 'Produk berhasil diperbarui.');
    }

    private function processImageUrl(?string $imageUrl, string $prefix = 'product'): ?string
    {
        if (!$imageUrl) return null;

        if (!str_starts_with($imageUrl, 'data:image/')) {
            return $imageUrl;
        }

        try {
            preg_match('/^data:image\/(\w+);base64,/', $imageUrl, $type);
            $data = substr($imageUrl, strpos($imageUrl, ',') + 1);
            $data = base64_decode($data);

            if ($data === false) return null;

            $ext = strtolower($type[1] ?? 'png');
            if ($ext === 'jpeg') $ext = 'jpg';

            $filename = time() . '_' . Str::slug($prefix) . '_' . Str::random(6) . '.' . $ext;
            $path = 'images/products/' . $filename;

            Storage::disk('public')->put($path, $data);
            return Storage::url($path);
        } catch (\Throwable $e) {
            return $imageUrl;
        }
    }

    public function destroy(Product $product)
    {
        if ($product->image_url && str_contains($product->image_url, '/storage/')) {
            $oldPath = ltrim(str_replace('/storage/', '', parse_url($product->image_url, PHP_URL_PATH)), '/');
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $sku = $product->sku;
        $name = $product->name;
        $product->delete();

        NotificationService::notifyUser(
            auth()->id(),
            'Produk Dihapus',
            "Anda menghapus produk: {$name} ({$sku})",
            '/products'
        );

        return back()->with('message', 'Produk berhasil dihapus.');
    }

    public function destroyMass(Request $request)
    {
        $skus = $request->input('skus', []);
        if (count($skus) > 0) {
            $products = Product::whereIn('sku', $skus)->get();
            foreach ($products as $p) {
                if ($p->image_url && str_contains($p->image_url, '/storage/')) {
                    $oldPath = ltrim(str_replace('/storage/', '', parse_url($p->image_url, PHP_URL_PATH)), '/');
                    if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }
            }
            Product::whereIn('sku', $skus)->delete();

            NotificationService::notifyUser(
                $request->user()->id,
                'Hapus Masal Produk',
                "Anda menghapus " . count($skus) . " produk",
                '/products'
            );
        }
        return back()->with('message', count($skus) . ' produk berhasil dihapus.');
    }

    public function import(Request $request)
    {
        $products = $request->input('products', []);
        if (empty($products)) {
            return back()->withErrors(['message' => 'Tidak ada data untuk diimport.']);
        }

        $now = now();
        $upsertData = [];
        $existingBrands = Brand::pluck('id', 'name')->mapWithKeys(function ($id, $name) {
            return [strtolower(trim($name)) => $id];
        })->toArray();

        // Increase time limit for large imports
        set_time_limit(300);

        foreach ($products as $p) {
            $brandName = trim($p['brand'] ?? '');
            $brandId = null;

            if ($brandName) {
                $brandKey = strtolower($brandName);
                if (isset($existingBrands[$brandKey])) {
                    $brandId = $existingBrands[$brandKey];
                } else {
                    $newBrand = Brand::create([
                        'name' => $brandName,
                        'color_hex' => '#6366f1' // Default color
                    ]);
                    $existingBrands[$brandKey] = $newBrand->id;
                    $brandId = $newBrand->id;
                }
            }

            $upsertData[] = [
                'sku' => strtoupper(trim($p['sku'])),
                'name' => trim($p['name']),
                'description' => trim($p['description'] ?? ''),
                'price' => (float)($p['price'] ?? 0),
                'pricelist_distributor' => (float)($p['pricelist_distributor'] ?? 0),
                'diskon_distributor' => (float)($p['diskon_distributor'] ?? 0),
                'modal' => (float)($p['modal'] ?? 0),
                'brand_id' => $brandId,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Process in chunks to prevent memory limit and max execution timeouts for large data
        foreach (array_chunk($upsertData, 500) as $chunk) {
            Product::upsert(
                $chunk,
                ['sku'], // unique column to check
                ['name', 'description', 'price', 'pricelist_distributor', 'diskon_distributor', 'modal', 'brand_id', 'updated_at']
            );
        }

        NotificationService::notifyUser(
            $request->user()->id,
            'Import Produk',
            "Anda mengimport " . count($upsertData) . " produk",
            '/products'
        );

        return back()->with('message', count($upsertData) . ' produk berhasil diimport/diperbarui.');
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
            'sku' => 'nullable|string',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time() . '_' . Str::slug($request->input('sku', 'product')) . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('images/products', $filename, 'public');
            $url = Storage::url($path);
            return response()->json(['url' => $url]);
        }

        return response()->json(['error' => 'Gagal mengunggah gambar.'], 400);
    }
}
