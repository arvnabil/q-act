<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\QuotationSalesNote;
use Illuminate\Http\Request;

class QuotationSalesNoteController extends Controller
{
    public function upsert(Request $request, Quotation $quotation)
    {
        $request->validate([
            'adjustments'   => 'nullable|array',
            'adjustments.*.id'     => 'required|string',
            'adjustments.*.label'  => 'nullable|string|max:255',
            'adjustments.*.amount' => 'nullable|numeric',
        ]);

        $note = QuotationSalesNote::updateOrCreate(
            ['quotation_id' => $quotation->id],
            ['adjustments'  => $request->input('adjustments', [])]
        );

        return response()->json([
            'adjustments' => $note->adjustments,
        ]);
    }

    public function show(Quotation $quotation)
    {
        $note = QuotationSalesNote::where('quotation_id', $quotation->id)->first();

        return response()->json([
            'adjustments' => $note?->adjustments ?? [],
        ]);
    }
}
