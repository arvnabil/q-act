import React, { useState, useEffect } from 'react';
import { Search, Eye, Download, Trash2, Loader2, FileText, Users, ShieldCheck } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useQuotations, useSalesUsers } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';
import Pagination from '../components/Pagination.jsx';
import { Navigate } from 'react-router-dom';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'all',      label: 'Semua'    },
  { key: 'draft',    label: 'Draft'    },
  { key: 'sent',     label: 'Sent'     },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired',  label: 'Expired'  },
];

const statusClasses = (status) => {
  switch (status) {
    case 'draft':    return 'bg-surface-100 text-surface-600 border border-surface-200';
    case 'sent':     return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'rejected': return 'bg-red-50 text-red-700 border border-red-200';
    case 'expired':  return 'bg-orange-50 text-orange-700 border border-orange-200';
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

export default function Manager() {
  const { user } = useAuthStore();

  // Redirect non-admin/manager users
  if (user && user.role !== 'admin' && user.role !== 'Sales Manager') {
    return <Navigate to="/" replace />;
  }

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSales, setFilterSales]   = useState('all');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [selectedIds, setSelectedIds]   = useState([]);

  const { data: quotations, isLoading, isError } = useQuotations();
  const { data: salesUsers } = useSalesUsers();

  useEffect(() => { setPage(1); setSelectedIds([]); }, [search, filterStatus, filterSales]);

  const calcGrandTotal = (q) => {
    if (q.grand_total != null) return q.grand_total;
    return q.items?.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0) || 0;
  };

  const countByStatus = (key) => {
    if (!quotations) return 0;
    let base = quotations;
    if (filterSales !== 'all') base = base.filter(q => q.created_by === filterSales);
    return key === 'all' ? base.length : base.filter(q => q.status === key).length;
  };

  const summaryStats = () => {
    if (!quotations) return { total: 0, approved: 0, pending: 0, revenue: 0 };
    let base = filterSales !== 'all' ? quotations.filter(q => q.created_by === filterSales) : quotations;
    return {
      total:    base.length,
      approved: base.filter(q => q.status === 'approved').length,
      pending:  base.filter(q => q.status === 'sent').length,
      revenue:  base.filter(q => q.status === 'approved').reduce((s, q) => s + calcGrandTotal(q), 0),
    };
  };

  const stats = summaryStats();

  const filtered = quotations?.filter(q => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (filterSales !== 'all' && q.created_by !== filterSales) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.id?.toLowerCase().includes(s) ||
      q.customer?.name?.toLowerCase().includes(s) ||
      q.creator?.name?.toLowerCase().includes(s)
    );
  }) || [];

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const isAllSelected = pageItems.length > 0 && pageItems.every(q => selectedIds.includes(q.id));
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !pageItems.some(q => q.id === id)));
    } else {
      const next = [...selectedIds];
      pageItems.forEach(q => { if (!next.includes(q.id)) next.push(q.id); });
      setSelectedIds(next);
    }
  };
  const handleToggleSelect = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <div className="animate-fade-in-up">
      {/* Manager Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl p-5 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold">Manager Dashboard</h2>
            <p className="text-xs text-white/70">Semua quotation dari seluruh tim sales</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-white/70 mt-0.5">Total QO</div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <div className="text-xl font-bold text-emerald-200">{stats.approved}</div>
            <div className="text-xs text-white/70 mt-0.5">Approved</div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <div className="text-xl font-bold text-yellow-200">{stats.pending}</div>
            <div className="text-xs text-white/70 mt-0.5">Pending (Sent)</div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <div className="text-lg font-bold">{formatCurrency(stats.revenue)}</div>
            <div className="text-xs text-white/70 mt-0.5">Total Revenue</div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilterStatus(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              filterStatus === t.key
                ? 'bg-brand-50 text-brand-700'
                : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
            }`}
          >
            {t.label}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              filterStatus === t.key ? 'bg-brand-100 text-brand-700' : 'text-surface-400'
            }`}>
              {countByStatus(t.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-surface-200 mb-5">
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 min-w-[200px] focus-within:border-brand-400 transition-colors">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari no. quotation, customer, sales..."
              className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter by Sales */}
          <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 focus-within:border-brand-400 transition-colors">
            <Users className="w-4 h-4 text-surface-400 shrink-0" />
            <select
              value={filterSales}
              onChange={e => setFilterSales(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-surface-700 cursor-pointer pr-1"
            >
              <option value="all">Semua Sales</option>
              {salesUsers?.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <span className="text-sm font-medium text-surface-500">Memuat semua quotation...</span>
          </div>
        )}
        {isError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-red-500">
            <span className="text-sm font-bold">Gagal memuat data. Periksa koneksi Supabase Anda.</span>
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-surface-400">
            <FileText className="w-12 h-12 mb-3 text-surface-300" />
            <span className="text-sm font-medium">Tidak ada quotation yang ditemukan.</span>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="py-3.5 px-4 text-center w-12">
                      <input type="checkbox" checked={isAllSelected} onChange={handleToggleSelectAll} className="w-4 h-4 rounded cursor-pointer" />
                    </th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">No. Quotation</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Customer</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider w-36">Sales</th>
                    <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-16">Items</th>
                    <th className="py-3.5 px-4 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-40">Grand Total</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider w-28">Tanggal</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider w-28">Status</th>
                    <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {pageItems.map(q => {
                    const isChecked = selectedIds.includes(q.id);
                    return (
                      <tr key={q.id} className={`hover:bg-brand-50/30 transition-colors group ${isChecked ? 'bg-brand-50/20' : ''}`}>
                        <td className="py-3.5 px-4 text-center">
                          <input type="checkbox" checked={isChecked} onChange={() => handleToggleSelect(q.id)} className="w-4 h-4 rounded cursor-pointer" />
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-sm font-bold text-brand-700 cursor-pointer hover:underline">{q.id}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-sm font-semibold text-surface-800 line-clamp-1">{q.customer?.name || '-'}</div>
                          <div className="text-xs text-surface-400">{q.pic?.name || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                              {q.creator?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-surface-700">{q.creator?.name || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-surface-600 text-center">{q.items?.length || 0}</td>
                        <td className="py-3.5 px-4 text-sm font-extrabold text-surface-900 text-right">{formatCurrency(calcGrandTotal(q))}</td>
                        <td className="py-3.5 px-4 text-sm text-surface-500">{formatDate(q.created_at)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${statusClasses(q.status)}`}>
                            {q.status ? q.status.charAt(0).toUpperCase() + q.status.slice(1) : '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer" title="Lihat">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer" title="Download PDF">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="quotation"
          />
        )}
      </div>

      {/* Floating Bulk Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 z-[100] border border-white/10 animate-fade-in-up">
          <span className="text-xs font-semibold flex items-center gap-2">
            <span className="bg-brand-500 text-white px-2.5 py-0.5 rounded-full font-bold">{selectedIds.length}</span>
            Quotation terpilih
          </span>
          <div className="h-4 w-[1px] bg-white/20" />
          <button onClick={() => setSelectedIds([])} className="text-white/60 hover:text-white text-xs font-medium transition-colors cursor-pointer">
            Batal
          </button>
        </div>
      )}
    </div>
  );
}
