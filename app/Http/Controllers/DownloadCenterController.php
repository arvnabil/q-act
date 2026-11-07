<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessSalesOrdersZipExport;
use App\Models\ExportJob;
use App\Models\SalesOrder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DownloadCenterController extends Controller
{
    /**
     * Get list of user's export jobs for Download Center drawer.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $jobs = ExportJob::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(function ($job) {
                return [
                    'id' => $job->id,
                    'type' => $job->type,
                    'title' => $job->title,
                    'status' => $job->status,
                    'progress' => $job->progress,
                    'total_items' => $job->total_items,
                    'processed_items' => $job->processed_items,
                    'file_name' => $job->file_name,
                    'file_size_formatted' => $job->formatted_file_size,
                    'created_at' => $job->created_at->diffForHumans(),
                    'created_at_raw' => $job->created_at->toIso8601String(),
                    'completed_at' => $job->completed_at ? $job->completed_at->diffForHumans() : null,
                    'is_expired' => $job->expires_at ? $job->expires_at->isPast() : false,
                    'download_url' => $job->status === 'completed' && !$job->is_expired
                        ? route('downloads.download', $job->id)
                        : null,
                    'error_message' => $job->error_message,
                ];
            });

        $activeCount = $jobs->whereIn('status', ['pending', 'processing'])->count();
        $unreadCompletedCount = $jobs->where('status', 'completed')
            ->where('created_at_raw', '>=', Carbon::now()->subHours(24)->toIso8601String())
            ->count();

        return response()->json([
            'jobs' => $jobs,
            'active_count' => $activeCount,
            'unread_completed_count' => $unreadCompletedCount,
        ]);
    }

    /**
     * Dispatch a bulk export Sales Orders to ZIP job.
     */
    public function exportSalesOrders(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'string|exists:sales_orders,id',
        ]);

        $ids = $request->input('ids');
        $total = count($ids);

        $user = $request->user();

        // Create export record
        $exportJob = ExportJob::create([
            'user_id' => $user->id,
            'type' => 'sales_orders_zip',
            'title' => "Export {$total} Sales Orders (ZIP)",
            'status' => 'pending',
            'progress' => 0,
            'total_items' => $total,
            'processed_items' => 0,
        ]);

        // Dispatch background job
        ProcessSalesOrdersZipExport::dispatch($exportJob->id, $ids);

        return response()->json([
            'message' => 'Permintaan ekspor sedang diproses di latar belakang.',
            'job' => $exportJob,
        ]);
    }

    /**
     * Download the completed ZIP file.
     */
    public function download(Request $request, string $id): BinaryFileResponse|JsonResponse
    {
        $job = ExportJob::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($job->status !== 'completed' || !$job->file_path || !Storage::exists($job->file_path)) {
            return response()->json(['message' => 'File belum siap atau telah dihapus.'], 404);
        }

        if ($job->expires_at && $job->expires_at->isPast()) {
            return response()->json(['message' => 'Tautan unduhan telah kedaluwarsa.'], 410);
        }

        $fullPath = Storage::path($job->file_path);
        return response()->download($fullPath, $job->file_name);
    }

    /**
     * Delete an export job and its file.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $job = ExportJob::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($job->file_path && Storage::exists($job->file_path)) {
            Storage::delete($job->file_path);
            // Delete folder if empty
            $dir = dirname($job->file_path);
            Storage::deleteDirectory($dir);
        }

        $job->delete();

        return response()->json(['message' => 'Riwayat unduhan berhasil dihapus.']);
    }
}
