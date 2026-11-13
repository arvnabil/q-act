<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PrimaryQuotationSync
{
    /** Apply a Sent quotation as the single primary estimate, or flag review. */
    public function sync(Quotation $quotation, ?User $actor = null, bool $createLeadWhenSent = false): ?Lead
    {
        if ($quotation->status === 'sent' && ! $quotation->lead_id && $createLeadWhenSent) {
            return DB::transaction(function () use ($quotation, $actor) {
                $locked = Quotation::whereKey($quotation->id)->lockForUpdate()->firstOrFail();
                if ($locked->lead_id) {
                    return $this->sync($locked, $actor, false);
                }
                if ($locked->status !== 'sent' || $locked->is_deleted) {
                    return null;
                }
                $userId = $actor?->id ?: $locked->sales_id ?: $locked->created_by;
                $lead = Lead::create([
                    'lead_code' => LeadCode::next(),
                    'title' => $locked->customer?->name ?: $locked->id,
                    'customer_id' => $locked->customer_id,
                    'sales_id' => $locked->sales_id ?: $userId,
                    'bu_id' => $locked->bu_id,
                    'created_by' => $userId,
                    'updated_by' => $userId,
                    'stage' => 'lead_masuk',
                    'estimated_value' => $locked->grand_total,
                    'quotation_id' => $locked->id,
                    'estimation_source' => 'primary_quotation',
                ]);
                $locked->update(['lead_id' => $lead->id]);
                WorkflowAccess::fillFromQuotation($lead, $locked, $actor ?: User::findOrFail($userId));
                LeadActivity::create([
                    'lead_id' => $lead->id, 'user_id' => $userId, 'type' => 'primary_quotation_changed',
                    'title' => 'Lead dibuat dari quotation Sent',
                    'metadata' => ['quotation_id' => $locked->id, 'amount' => (float) $locked->grand_total, 'from_quotation' => null, 'to_quotation' => $locked->id],
                ]);

                return $lead;
            });
        }

        if (! $quotation->lead_id) {
            return null;
        }

        return DB::transaction(function () use ($quotation, $actor) {
            $lockedQ = Quotation::whereKey($quotation->id)->lockForUpdate()->firstOrFail();
            $lead = Lead::whereKey($lockedQ->lead_id)->lockForUpdate()->first();
            if (! $lead) {
                return null;
            }

            if ($lockedQ->status === 'sent' && ! $lockedQ->is_deleted) {
                $oldPrimary = $lead->quotation_id;
                $oldEstimate = (float) $lead->estimated_value;
                $wasNeedsReview = $lead->quotation_needs_review;
                $lead->quotation_id = $lockedQ->id;
                $lead->estimated_value = $lockedQ->grand_total;
                $lead->estimation_source = 'primary_quotation';
                $lead->quotation_needs_review = false;
                $lead->updated_by = $actor?->id ?: $lead->updated_by;
                $lead->save();
                if ($oldPrimary !== $lockedQ->id || $oldEstimate !== (float) $lockedQ->grand_total || $wasNeedsReview) {
                    LeadActivity::create([
                        'lead_id' => $lead->id, 'user_id' => $actor?->id, 'type' => 'primary_quotation_changed',
                        'title' => 'Primary quotation dan estimasi diperbarui',
                        'metadata' => ['quotation_id' => $lockedQ->id, 'from_quotation' => $oldPrimary, 'to_quotation' => $lockedQ->id,
                            'previous_estimate' => $oldEstimate, 'estimate' => (float) $lockedQ->grand_total,
                            'cleared_needs_review' => $wasNeedsReview],
                    ]);
                }
            } elseif (in_array($lockedQ->status, ['rejected', 'cancelled', 'expired'], true) && $lead->quotation_id === $lockedQ->id && ! $lead->quotation_needs_review) {
                $lead->quotation_needs_review = true;
                $lead->save();
                LeadActivity::create([
                    'lead_id' => $lead->id, 'user_id' => $actor?->id, 'type' => 'quotation_needs_review',
                    'title' => 'Primary quotation perlu ditinjau',
                    'metadata' => ['quotation_id' => $lockedQ->id, 'status' => $lockedQ->status, 'estimated_value' => (float) $lead->estimated_value],
                ]);
            }

            return $lead;
        });
    }
}
