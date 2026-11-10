import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { 
  RefreshCw, AlertCircle, Clock, CheckCircle2, ArrowLeft, Search, FileText, ExternalLink
} from 'lucide-react';

export default function SyncMonitor({ documents, filters = {} }) {
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');
  const [retryingId, setRetryingId] = useState(null);

  const handleFilter = (e) => {
    e && e.preventDefault();
    router.get(route('documents.sync-monitor'), {
      search: search || undefined,
      status: status !== 'all' ? status : undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleRetry = (docId) => {
    setRetryingId(docId);
    router.post(route('documents.retry', docId), {}, {
      preserveScroll: true,
      onFinish: () => setRetryingId(null),
    });
  };

  return (
    <AuthenticatedLayout>
      <Head title="Monitor Antrean Sinkronisasi SharePoint" />

      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={route('documents.index')}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              title="Kembali ke Document Center"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Monitor Sinkronisasi SharePoint</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Pantau antrean upload, diagnosa pesan galat, dan lakukan sinkronisasi ulang secara manual.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <form onSubmit={handleFilter} className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari file, No. Quotation, PO, Customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-sky-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none"
              >
                <option value="all">Semua Status Bermasalah</option>
                <option value="failed">Hanya Gagal (Failed)</option>
                <option value="pending">Hanya Menunggu (Pending)</option>
                <option value="uploading">Sedang Mengunggah (Uploading)</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Dokumen</th>
                  <th className="py-3 px-4">Quotation & PO</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Percobaan</th>
                  <th className="py-3 px-4">Pesan Kesalahan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                      <p className="text-sm font-semibold text-gray-700">Semua Dokumen Berhasil Tersinkronisasi!</p>
                      <p className="text-xs text-gray-400 mt-1">Tidak ada dokumen yang gagal atau tertahan di antrean.</p>
                    </td>
                  </tr>
                ) : (
                  documents?.data?.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-gray-800 text-xs truncate max-w-[200px]" title={doc.original_filename}>
                              {doc.original_filename}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono">ID #{doc.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <div>
                          <Link href={route('quotations.show', doc.quotation_id)} className="text-sky-600 hover:underline">
                            {doc.quotation_id}
                          </Link>
                        </div>
                        <span className="text-gray-500 text-[11px]">{doc.purchase_order?.po_number || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-xs">
                        {doc.quotation?.customer?.name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {doc.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">
                            <AlertCircle className="w-3 h-3" /> Gagal
                          </span>
                        ) : doc.status === 'uploading' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-700">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Uploading
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-600">
                        {doc.retry_count || 0}x
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {doc.error_message ? (
                          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded text-[11px] font-mono whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                            {doc.error_message}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Tidak ada pesan galat</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRetry(doc.id)}
                          disabled={retryingId === doc.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition disabled:opacity-50 shadow-sm"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${retryingId === doc.id ? 'animate-spin' : ''}`} />
                          <span>{retryingId === doc.id ? 'Memproses...' : 'Coba Lagi'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {documents?.links?.length > 3 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Menampilkan {documents.from || 0} - {documents.to || 0} dari {documents.total || 0} antrean
              </span>
              <div className="flex items-center gap-1">
                {documents.links.map((link, idx) => (
                  <Link
                    key={idx}
                    href={link.url || '#'}
                    preserveScroll
                    preserveState
                    className={`px-3 py-1 text-xs rounded-md ${
                      link.active
                        ? 'bg-sky-600 text-white font-bold'
                        : link.url
                        ? 'text-gray-600 hover:bg-gray-100'
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
