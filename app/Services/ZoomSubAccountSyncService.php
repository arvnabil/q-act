<?php

namespace App\Services;

use App\Models\User;
use App\Models\ZoomSubAccount;
use App\Models\ZoomSubAccountDetail;
use App\Models\ZoomSubAccountSyncRun;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class ZoomSubAccountSyncService
{
    public function __construct(private readonly ZoomService $zoomService) {}

    public function sync(?User $user): ZoomSubAccountSyncRun
    {
        $run = ZoomSubAccountSyncRun::create([
            'triggered_by' => $user?->id,
            'status' => 'running',
            'started_at' => now(),
        ]);

        try {
            $result = $this->zoomService->listAllSubAccounts();
            if ($result['accounts'] === [] && ZoomSubAccount::query()->exists()) {
                throw new \RuntimeException('Zoom mengembalikan daftar kosong. Data sebelumnya dipertahankan agar tidak salah ditandai hilang.');
            }

            DB::transaction(function () use ($result, $run) {
                $now = now();
                $added = 0;
                $updated = 0;
                $unchanged = 0;
                $accountDetails = ZoomSubAccountDetail::query()
                    ->where('detail_type', 'account')
                    ->get()
                    ->keyBy('zoom_account_id');

                foreach ($result['accounts'] as $account) {
                    $zoomAccountId = trim((string) ($account['id'] ?? ''));
                    if ($zoomAccountId === '') {
                        continue;
                    }

                    $subAccount = ZoomSubAccount::firstOrNew(['zoom_account_id' => $zoomAccountId]);
                    $isNew = ! $subAccount->exists;
                    $apiAttributes = [
                        'account_name' => $account['account_name'] ?? null,
                        'account_number' => isset($account['account_number']) ? (string) $account['account_number'] : null,
                        'account_type' => $account['account_type'] ?? null,
                        'owner_email' => $account['owner_email'] ?? null,
                        'seats' => isset($account['seats']) ? (int) $account['seats'] : null,
                        'bulk_license' => (bool) ($account['bulk_license'] ?? false),
                        'is_sub_reseller' => (bool) ($account['reseller'] ?? false),
                        'zoom_created_at' => $this->parseZoomDate($account['created_at'] ?? null),
                        'subscription_start_time' => $this->parseZoomDate($account['subscription_start_time'] ?? null),
                        'subscription_end_time' => $this->parseZoomDate($account['subscription_end_time'] ?? null),
                    ];

                    // Zoom can return different account_type values from /accounts
                    // and /accounts/{accountId}. Once the detail endpoint has supplied
                    // this field, keep it as the canonical source during list syncs.
                    $detailAccountType = $accountDetails->get($zoomAccountId)?->payload['account_type'] ?? null;
                    if (is_string($detailAccountType) && $detailAccountType !== '') {
                        $apiAttributes['account_type'] = $detailAccountType;
                    }

                    $changed = $subAccount->isDirty();
                    $subAccount->fill($apiAttributes);
                    $changed = $changed || $subAccount->isDirty(array_keys($apiAttributes));
                    $subAccount->fill([
                        'is_present' => true,
                        'last_seen_at' => $now,
                        'last_sync_run_id' => $run->id,
                    ]);
                    $subAccount->save();

                    if ($isNew) {
                        $added++;
                    } elseif ($changed) {
                        $updated++;
                    } else {
                        $unchanged++;
                    }
                }

                // Only mark missing accounts after every Zoom page was retrieved successfully.
                ZoomSubAccount::query()
                    ->where('is_present', true)
                    ->where(function ($query) use ($run) {
                        $query->whereNull('last_sync_run_id')
                            ->orWhere('last_sync_run_id', '!=', $run->id);
                    })
                    ->update(['is_present' => false]);

                $run->update([
                    'status' => 'completed',
                    'accounts_seen' => $added + $updated + $unchanged,
                    'accounts_added' => $added,
                    'accounts_updated' => $updated,
                    'accounts_unchanged' => $unchanged,
                    'pages_fetched' => $result['pages'],
                    'finished_at' => now(),
                ]);
            });
        } catch (Throwable $exception) {
            Log::error('[Zoom Sub Account Sync] Run failed', [
                'run_id' => $run->id,
                'exception' => get_class($exception),
                'message' => $exception->getMessage(),
            ]);

            $safeMessage = $exception instanceof \RuntimeException
                ? $exception->getMessage()
                : 'Terjadi kesalahan saat menyimpan hasil sinkronisasi. Periksa log aplikasi.';

            $run->update([
                'status' => 'failed',
                'error_message' => mb_substr($safeMessage, 0, 2000),
                'finished_at' => now(),
            ]);
        }

        return $run->fresh();
    }

    private function parseZoomDate(mixed $value): ?Carbon
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }
    }
}
