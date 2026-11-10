import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { 
  FolderOpen, Search, ExternalLink, RefreshCw, CheckCircle2, 
  AlertCircle, Clock, FileText, ArrowUpDown, Filter, ChevronLeft, ChevronRight, Settings
} from 'lucide-react';

export default function DocumentCenterIndex({ documents, filters = {}, stats = {}, canUpload = false }) {
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');
  const [retryingId, setRetryingId] = useState(null);

  const handleFilter = (e) => {
    e && e.preventDefault();
    router.get(route('documents.index'), {
      search: search || undefined,
      status: status !== 'all' ? status : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }, { preserveState: true, preserveScroll: true });
  };

  const handleReset = () => {
    setSearch('');
    setStatus('all');
    setDateFrom('');
    setDateTo('');
    router.get(route('documents.index'));
  };

  const handleRetry = (docId) => {
    setRetryingId(docId);
    router.post(route('documents.retry', docId), {}, {
      preserveScroll: true,
      onFinish: () => setRetryingId(null),
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusBadge = (docStatus) => {
    switch (docStatus) {
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Tersinkronisasi
          </span>
        );
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
            Mengunggah...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Gagal Sync
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Menunggu Antrean
          </span>
        );
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title="Document Center — SharePoint" />

      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Document Center</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Pusat arsip & dokumen PO terintegrasi langsung dengan Microsoft 365 SharePoint Storage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canUpload && (
              <Link
                href={route('documents.sync-monitor')}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                Monitor Antrean
              </Link>
            )}
            <Link
              href={route('settings')}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition shadow-sm"
            >
              <Settings className="w-3.5 h-3.5" />
              Pengaturan SharePoint
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 text-gray-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Total Dokumen</p>
              <p className="text-xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-600">Tersinkronisasi</p>
              <p className="text-xl font-bold text-emerald-700">{stats.synced || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-600">Menunggu / Antrean</p>
              <p className="text-xl font-bold text-amber-700">{stats.pending || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-rose-600">Gagal Sync</p>
              <p className="text-xl font-bold text-rose-700">{stats.failed || 0}</p>
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
                placeholder="Cari nama dokumen, No. Quotation, No. PO, Customer, Sales..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-1 focus:ring-sky-500 outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="synced">Tersinkronisasi</option>
                <option value="pending">Menunggu Antrean</option>
                <option value="uploading">Sedang Diunggah</option>
                <option value="failed">Gagal Sinkronisasi</option>
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 text-gray-700 outline-none"
                title="Tanggal Mulai"
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 text-gray-700 outline-none"
                title="Tanggal Akhir"
              />

              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Filter
              </button>
              {(search || status !== 'all' || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Document List Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama Dokumen</th>
                  <th className="py-3 px-4">No. PO</th>
                  <th className="py-3 px-4">Quotation</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Sales</th>
                  <th className="py-3 px-4">Ukuran</th>
                  <th className="py-3 px-4">Status SharePoint</th>
                  <th className="py-3 px-4">Waktu Sync</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <FolderOpen className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-medium">Belum ada dokumen yang terdaftar.</p>
                      <p className="text-xs text-gray-400 mt-1">Dokumen PO yang diunggah pada penawaran yang disetujui akan otomatis tampil di sini.</p>
                    </td>
                  </tr>
                ) : (
                  documents?.data?.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          <span className="truncate max-w-[220px]" title={doc.original_filename}>
                            {doc.original_filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 font-mono text-xs">
                        {doc.purchase_order?.po_number || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {doc.quotation_id ? (
                          <Link
                            href={route('quotations.show', doc.quotation_id)}
                            className="font-mono text-xs font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                          >
                            {doc.quotation_id}
                          </Link>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-800 truncate max-w-[180px]" title={doc.quotation?.customer?.name}>
                        {doc.quotation?.customer?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {doc.quotation?.sales?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {doc.synced_at ? new Date(doc.synced_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.sharepoint_web_url ? (
                            <a
                              href={doc.sharepoint_web_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-md border border-sky-200 transition"
                            >
                              <span>Buka</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : null}

                          {canUpload && (doc.status === 'failed' || doc.status === 'pending') && (
                            <button
                              type="button"
                              onClick={() => handleRetry(doc.id)}
                              disabled={retryingId === doc.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition disabled:opacity-50"
                              title="Sinkronkan ulang"
                            >
                              <RefreshCw className={`w-3 h-3 ${retryingId === doc.id ? 'animate-spin' : ''}`} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {documents?.links?.length > 3 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Menampilkan {documents.from || 0} - {documents.to || 0} dari {documents.total || 0} dokumen
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
