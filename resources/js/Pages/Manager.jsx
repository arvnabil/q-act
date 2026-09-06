import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import { 
  Search, Eye, Download, Trash2, Loader2, FileText, Users, ShieldCheck, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Pagination from '@/Components/Pagination';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'all',      label: 'Semua'    },
  { key: 'created',  label: 'Created'  },
  { key: 'sent',     label: 'Sent'     },
  { key: 'approved', label: 'PO'       },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired',  label: 'Expired'  },
  { key: 'trash',    label: '🗑️ Trash / Terhapus' },
];

const statusClasses = (status) => {
  switch (status) {
    case 'created':
    case 'draft':    return 'bg-surface-100 text-surface-600 border border-surface-200';
    case 'sent':     return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'rejected': return 'bg-red-50 text-red-700 border border-red-200';
    case 'expired':  return 'bg-orange-50 text-orange-700 border border-orange-200';
    case 'deleted':  return 'bg-gray-100 text-gray-500 border border-gray-300';
    default:         return 'bg-surface-100 text-surface-600';
  }
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (str) => {
  if (!str) return '-';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'd MMM yyyy', { locale: idLocale }) : str;
  } catch { return str; }
};

export default function Manager({ 
  activeQuotations = [], 
  trashQuotations = [], 
  salesUsers = [], 
  businessUnits = [] 
}) {
  const { auth } = usePage().props;
  const user = auth?.user || {};

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSales, setFilterSales]   = useState('all');
  const [filterBU, setFilterBU]         = useState('all');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedIds, setSelectedIds]   = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const isTrashTab = filterStatus === 'trash';
  const quotations = isTrashTab ? trashQuotations : activeQuotations;

  useEffect(() => { 
    setPage(1);
    setSelectedIds([]);
  }, [search, filterStatus, filterSales, filterBU]);

  const calcGrandTotal = (q) => {
    if (q.grand_total != null && q.grand_total > 0) return q.grand_total;
    return q.items?.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0) || 0;
  };

  const isQuotationInBU = (q, targetBuId) => {
    if (!targetBuId || targetBuId === 'all') return true;
    const targetBu = businessUnits.find(b => b.id === targetBuId);

    if (q.bu_id === targetBuId) return true;

    const creatorId = q.sales_id || q.created_by || q.creator?.id;
    if (targetBu && creatorId && targetBu.members?.some(m => m.user_id === creatorId)) return true;

    if (targetBu?.code) {
      const codeUpper = targetBu.code.toUpperCase();
      if (q.id?.toUpperCase().startsWith(codeUpper + '.') || q.id?.toUpperCase().startsWith(codeUpper)) return true;
    }

    return false;
  };

  const countByStatus = (key) => {
    if (key === 'trash') return trashQuotations.length;
    let base = activeQuotations;
    if (filterSales !== 'all') base = base.filter(q => (q.sales_id || q.created_by) === filterSales);
    if (filterBU !== 'all') base = base.filter(q => isQuotationInBU(q, filterBU));
    return key === 'all' ? base.length : base.filter(q => q.status === key).length;
  };

  const summaryStats = () => {
    let base = activeQuotations;
    if (filterSales !== 'all') base = base.filter(q => (q.sales_id || q.created_by) === filterSales);
    if (filterBU !== 'all') base = base.filter(q => isQuotationInBU(q, filterBU));
    return {
      total:    base.length,
      approved: base.filter(q => q.status === 'approved').length,
      pending:  base.filter(q => q.status === 'sent').length,
      revenue:  base.filter(q => q.status === 'approved').reduce((s, q) => s + calcGrandTotal(q), 0),
    };
  };

  const stats = summaryStats();

  const filtered = quotations?.filter(q => {
    if (!isTrashTab && filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (filterSales !== 'all' && (q.sales_id || q.created_by) !== filterSales) return false;
    if (filterBU !== 'all' && !isQuotationInBU(q, filterBU)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.id?.toLowerCase().includes(s) ||
      q.customer?.name?.toLowerCase().includes(s) ||
      q.creator?.name?.toLowerCase().includes(s)
    );
  }) || [];

  const totalNilaiQuotation = filtered.reduce((sum, q) => sum + calcGrandTotal(q), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pagedItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Restore soft deleted quotation
  const handleRestore = (id) => {
    setActionLoadingId(id);
    router.post(route('manager.quotations.restore', id), {}, {
      preserveScroll: true,
      onFinish: () => setActionLoadingId(null)
    });
  };

  // Hard delete quotation
  const handleHardDelete = (id) => {
    if (!window.confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN quotation ${id}? Data tidak dapat dikembalikan lagi.`)) return;
    setActionLoadingId(id);
    router.delete(route('manager.quotations.force-delete', id), {
      preserveScroll: true,
      onFinish: () => setActionLoadingId(null)
    });
  };

  // Selection toggle logic
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allPagedSelected = pagedItems.length > 0 && pagedItems.every(q => selectedIds.includes(q.id));

  const handleToggleSelectAll = () => {
    if (allPagedSelected) {
      const pagedIds = pagedItems.map(q => q.id);
      setSelectedIds(prev => prev.filter(id => !pagedIds.includes(id)));
    } else {
      const pagedIds = pagedItems.map(q => q.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pagedIds])));
    }
  };

  // Batch Restore
  const handleBatchRestore = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Apakah Anda yakin ingin MEMULIHKAN ${selectedIds.length} quotation yang dipilih?`)) return;

    setIsBatchProcessing(true);
    router.post(route('manager.quotations.batch-restore'), { ids: selectedIds }, {
      preserveScroll: true,
      onSuccess: () => setSelectedIds([]),
      onFinish: () => setIsBatchProcessing(false)
    });
  };

  // Batch Force Delete
  const handleBatchForceDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`⚠️ PERINGATAN BATCH DELETE:\n\nApakah Anda yakin ingin MENGHAPUS PERMANEN ${selectedIds.length} quotation yang dipilih? Data yang dihapus tidak dapat dikembalikan lagi.`)) return;

    setIsBatchProcessing(true);
    router.post(route('manager.quotations.batch-force-delete'), { ids: selectedIds }, {
      preserveScroll: true,
      onSuccess: () => setSelectedIds([]),
      onFinish: () => setIsBatchProcessing(false)
    });
  };

  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-xl text-surface-800 leading-tight">Manager View</h2>}
    >
      <Head title="Manager View" />

      <div className="animate-fade-in-up space-y-6 pb-12 max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        
        {/* Top Banner */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-brand-600" />
              <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Manager View</h1>
            </div>
            <p className="text-xs text-surface-500">Monitoring seluruh penawaran tim sales, approval status, dan pengelolaan arsip quotation terhapus.</p>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Total Quotation</span>
            <div className="text-2xl font-extrabold text-surface-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Total Nilai Quotation</span>
            <div className="text-2xl font-extrabold text-emerald-600">{formatCurrency(totalNilaiQuotation)}</div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Quotation PO</span>
            <div className="text-2xl font-extrabold text-blue-600">{stats.approved}</div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Pending PO</span>
            <div className="text-2xl font-extrabold text-amber-600">{stats.pending}</div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          
          {/* Status Tabs */}
          <div className="flex border-b border-surface-200 overflow-x-auto bg-surface-50/50">
            {STATUS_TABS.map(tab => {
              const count = countByStatus(tab.key);
              const isActive = filterStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterStatus(tab.key)}
                  className={`py-3.5 px-5 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? tab.key === 'trash' ? 'border-red-500 text-red-600 bg-white' : 'border-brand-600 text-brand-700 bg-white'
                      : 'border-transparent text-surface-500 hover:text-surface-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? tab.key === 'trash' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-800'
                      : 'bg-surface-200 text-surface-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Controls Bar */}
          <div className="p-4 border-b border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Cari ID, customer, sales..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              {businessUnits.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-surface-500 font-semibold whitespace-nowrap">BU:</span>
                  <select
                    value={filterBU}
                    onChange={e => setFilterBU(e.target.value)}
                    className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-surface-700 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                  >
                    <option value="all">Semua BU</option>
                    {businessUnits.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-surface-500 font-semibold whitespace-nowrap">Sales:</span>
                <select
                  value={filterSales}
                  onChange={e => setFilterSales(e.target.value)}
                  className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-surface-700 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                >
                  <option value="all">Semua Sales</option>
                  {salesUsers?.filter(s => {
                    const r = (s.role || '').trim().toLowerCase();
                    return r === 'sales' || r === 'presales';
                  }).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Batch Action Bar for Trash Tab */}
          {isTrashTab && (
            <div className="bg-red-50/80 border-b border-red-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                <input
                  type="checkbox"
                  checked={allPagedSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded border-red-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                  id="selectAllHeader"
                />
                <label htmlFor="selectAllHeader" className="cursor-pointer">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} quotation terhapus dipilih`
                    : 'Pilih semua di halaman ini'}
                </label>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleBatchRestore}
                    disabled={isBatchProcessing}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isBatchProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Pulihkan Terpilih ({selectedIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchForceDelete}
                    disabled={isBatchProcessing}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isBatchProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Hapus Permanen ({selectedIds.length})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Table Content */}
          {pagedItems.length === 0 ? (
            <div className="py-20 text-center text-surface-400 flex flex-col items-center justify-center gap-2">
              <FileText className="w-8 h-8 text-surface-300" />
              <span className="text-xs">{isTrashTab ? 'Tidak ada quotation yang terhapus.' : 'Tidak ada quotation ditemukan.'}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                    {isTrashTab && (
                      <th className="py-3.5 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={allPagedSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded border-surface-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                          title="Pilih Semua di halaman ini"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-4">Quotation ID</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Pembuat (Sales)</th>
                    <th className="py-3.5 px-4">Tanggal {isTrashTab ? 'Dihapus' : 'Buat'}</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-center">Aksi Manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-xs">
                  {pagedItems.map(q => {
                    const creatorName = (q.creator?.name || 'Sales').trim().split(/\s+/)[0];
                    const customerName = q.customer?.name || 'Customer';
                    const grandTotal = calcGrandTotal(q);
                    const isActioning = actionLoadingId === q.id;
                    const isSelected = selectedIds.includes(q.id);

                    return (
                      <tr key={q.id} className={`hover:bg-surface-50/60 transition-colors ${isSelected ? 'bg-red-50/40' : ''}`}>
                        {isTrashTab && (
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(q.id)}
                              className="rounded border-surface-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{q.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-surface-800">{customerName}</td>
                        <td className="py-3.5 px-4 text-surface-600">{creatorName}</td>
                        <td className="py-3.5 px-4 text-surface-500">{formatDate(isTrashTab ? q.deleted_at : q.created_at)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClasses(q.status)}`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-surface-900 text-right">{formatCurrency(grandTotal)}</td>
                        <td className="py-3.5 px-4 text-center">
                          {isTrashTab ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRestore(q.id)}
                                disabled={isActioning}
                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                title="Pulihkan Quotation ke Aktif"
                              >
                                {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                <span>Pulihkan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleHardDelete(q.id)}
                                disabled={isActioning}
                                className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                title="Hapus Permanen dari Database"
                              >
                                {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                <span>Permanen</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-surface-400 text-[11px]">Aktif</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {filtered.length > PAGE_SIZE && (
            <div className="p-4 border-t border-surface-200">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                itemLabel="quotation"
                onPageChange={setPage}
              />
            </div>
          )}

        </div>
      </div>
    </AuthenticatedLayout>
  );
}
