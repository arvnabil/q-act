<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Services\DocumentVisibility;
use Illuminate\Http\Request;

class HeaderSearchController extends Controller
{
    public function __invoke(Request $request)
    {
        $data = $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $term = trim($data['q'] ?? '');
        $results = [];
        if (mb_strlen($term) >= 2) {
            // Escape LIKE metacharacters so '%' and '_' cannot widen a search.
            $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
            foreach (['quotations' => Quotation::class, 'sales_orders' => SalesOrder::class, 'customers' => Customer::class] as $module => $model) {
                if (!DocumentVisibility::allows($request->user(), $module.'_view')) continue;
                $query = DocumentVisibility::apply($model::query(), $request->user(), $module);
                $query->where(function ($q) use ($module, $like) {
                    $q->whereRaw("id LIKE ? ESCAPE '!'", [$like]);
                    if ($module === 'customers') {
                        $q->orWhereRaw("name LIKE ? ESCAPE '!'", [$like]);
                    } else {
                        $q->orWhereHas('customer', fn ($c) => $c->whereRaw("name LIKE ? ESCAPE '!'", [$like]));
                    }
                });
                if ($module !== 'customers') $query->with('customer:id,name');
                foreach ($query->orderBy('id')->limit(5)->get() as $record) {
                    $results[] = [
                        'key' => $module.':'.$record->id,
                        'type' => ['quotations' => 'Quotation', 'sales_orders' => 'Sales Order', 'customers' => 'Customer'][$module],
                        'title' => $module === 'customers' ? $record->name : $record->id,
                        'subtitle' => $module === 'customers' ? $record->id : $record->customer?->name,
                        'status' => $module === 'customers' ? null : $record->status,
                        'url' => route(str_replace('_', '-', $module).'.show', $record->id, false),
                    ];
                }
            }
        }
        return response()->json(['results' => $results])->header('Cache-Control', 'private, no-store');
    }
}
