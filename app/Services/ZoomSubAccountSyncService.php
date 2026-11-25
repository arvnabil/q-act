<?php

namespace App\Services;

use App\Models\User;
use App\Models\ZoomSubAccount;
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
                $changeDetails = [];
                $trackedFields = [
                    'account_name' => 'Nama akun',
                    'account_number' => 'ZAN (Zoom Account Number)',
                    'account_type' => 'Account Type',
                    'owner_email' => 'Email owner',
                    'seats' => 'Seats (License)',
                    'bulk_license' => 'Bulk license',
                    'is_sub_reseller' => 'Sub-reseller',
                    'zoom_created_at' => 'Creation Time',
                    'subscription_start_time' => 'Service Effective Date',
                    'subscription_end_time' => 'Subscription End',
                ];
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

                    $beforeValues = [];
                    foreach (array_keys($trackedFields) as $field) {
                        $beforeValues[$field] = $this->normalizeChangeValue($subAccount->getAttribute($field));
                    }
                    $subAccount->fill($apiAttributes);
                    $fieldChanges = [];
                    foreach ($trackedFields as $field => $label) {
                        $afterValue = $this->normalizeChangeValue($subAccount->getAttribute($field));
                        if ($beforeValues[$field] !== $afterValue) {
                            $fieldChanges[] = [
                                'field' => $label,
                                'from' => $beforeValues[$field],
                                'to' => $afterValue,
                            ];
                        }
                    }
                    $changed = $fieldChanges !== [];
                    $subAccount->fill([
                        'is_present' => true,
                        'last_seen_at' => $now,
                        'last_sync_run_id' => $run->id,
                    ]);
                    $subAccount->save();

                    if ($isNew) {
                        $added++;
                        $changeDetails[] = [
                            'action' => 'added',
                            'zoom_account_id' => $zoomAccountId,
                            'account_name' => $subAccount->account_name,
                            'account_number' => $subAccount->account_number,
                            'fields' => array_map(fn ($field) => ['field' => $field['field'], 'from' => null, 'to' => $field['to']], $fieldChanges),
                        ];
                    } elseif ($changed) {
                        $updated++;
                        $changeDetails[] = [
                            'action' => 'updated',
                            'zoom_account_id' => $zoomAccountId,
                            'account_name' => $subAccount->account_name,
                            'account_number' => $subAccount->account_number,
                            'fields' => $fieldChanges,
                        ];
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
                    'change_details' => $changeDetails,
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

    private function normalizeChangeValue(mixed $value): mixed
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        if (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
            return $value;
        }

        return (string) $value;
    }
}
