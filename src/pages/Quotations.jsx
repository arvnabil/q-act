import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, Eye, Download, Trash2, Loader2, FileText, Plus, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useQuotations, useQuotationsByUser } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';
import Pagination from '../components/Pagination.jsx';
import QuotationModal from '../components/QuotationModal.jsx';
import QuotationEdit from '../components/QuotationEdit.jsx';
import QuotationDetail from '../components/QuotationDetail.jsx';
import { printQuotation } from '../utils/printQuotation.js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase.js';
import { toast } from 'react-hot-toast';

const PAGE_SIZE = 8;

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

const statusLabel = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (str) => {
  if (!str) return '-';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'd MMM yyyy', { locale: idLocale }) : str;
  } catch { return str; }
};

export default function Quotations() {
  const { user: currentUser } = useAuthStore();
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [selectedIds, setSelectedIds]   = useState([]);

  // View state: 'list' | 'edit' | 'detail'
  const [viewState, setViewState]             = useState('list');
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [isModalOpen, setIsModalOpen]         = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single'|'bulk', item?: object }
  const [isDeleting, setIsDeleting]     = useState(false);

  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isManager = user?.role === 'admin' || user?.role === 'Sales Manager';

  // Fetch quotations from Supabase
  const allQuery  = useQuotations();
  const mineQuery = useQuotationsByUser(user?.id);
  const { data: quotations, isLoading, isError } = isManager ? allQuery : mineQuery;

  // Reset page & selection on filter change
  useEffect(() => { setPage(1); setSelectedIds([]); }, [search, filterStatus]);

  // Counts per status
  const countByStatus = (key) => {
    if (!quotations) return 0;
    return key === 'all' ? quotations.length : quotations.filter(q => q.status === key).length;
  };

  // Filter items
  const filtered = quotations?.filter(q => {
    const matchStatus = filterStatus === 'all' || q.status === filterStatus;
    if (!matchStatus) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.id?.toLowerCase().includes(s) ||
      q.customer?.name?.toLowerCase().includes(s) ||
      q.pic?.name?.toLowerCase().includes(s)
    );
  }) || [];

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Calculate total
  const calcGrandTotal = (q) => {
    if (q.grand_total != null) return q.grand_total;
    return q.items?.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0) || 0;
  };

  // Brands list from quotation items
  const getBrands = (q) => {
    const brands = new Set();
    q.items?.forEach(item => {
      const brandName = item.product?.brands?.name || item.product?.brand_id;
      if (brandName) brands.add(brandName);
    });
    return [...brands];
  };

  // Checkbox Selection
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

  // Handle quotation creation success -> REDIRECT TO EDIT FORM
  const handleQuotationCreated = (newQuo) => {
    setActiveQuotation(newQuo);
    setViewState('edit');
  };

  // Handle delete execution
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'bulk') {
        await supabase.from('quotation_items').delete().in('quotation_id', selectedIds);
        const { error } = await supabase.from('quotations').delete().in('id', selectedIds);
        if (error) throw error;
        toast.success(`${selectedIds.length} quotation berhasil dihapus.`);
        setSelectedIds([]);
      } else if (deleteTarget.type === 'single' && deleteTarget.item) {
        const quoId = deleteTarget.item.id;
        await supabase.from('quotation_items').delete().eq('quotation_id', quoId);
        const { error } = await supabase.from('quotations').delete().eq('id', quoId);
        if (error) throw error;
        toast.success(`Quotation ${quoId} berhasil dihapus.`);
      }
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menghapus quotation.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Render Edit View if active
  if (viewState === 'edit' && activeQuotation) {
    return (
      <QuotationEdit
        quotation={activeQuotation}
        onBack={() => setViewState('list')}
        onSaved={() => setViewState('list')}
      />
    );
  }

  // Render Detail View if active
  if (viewState === 'detail' && activeQuotation) {
    return (
      <QuotationDetail
        quotation={activeQuotation}
        onBack={() => setViewState('list')}
        onEdit={(q) => { setActiveQuotation(q); setViewState('edit'); }}
      />
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilterStatus(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              filterStatus === t.key
                ? 'bg-brand-50 text-brand-700 font-bold'
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

      {/* Controls: Search bar & Create Button */}
      <div className="bg-white rounded-xl border border-surface-200 mb-5">
        <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 min-w-[240px] focus-within:border-brand-400 transition-colors w-full">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari no. quotation, customer, PIC..."
              className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Buat Quotation
          </button>
        </div>
      </div>

      {/* Content Table */}
      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-2" />
            <span className="text-sm font-medium text-surface-500">Memuat data quotation...</span>
          </div>
        )}
        {isError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-red-500">
            <span className="text-sm font-bold">Gagal memuat data quotation. Periksa koneksi Supabase Anda.</span>
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-surface-400">
            <FileText className="w-12 h-12 mb-3 text-surface-300" />
            <span className="text-sm font-medium">Belum ada quotation yang ditemukan.</span>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200">
                    <th className="py-3.5 px-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer accent-brand-500"
                      />
                    </th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">No. Quotation</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Customer</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Brand</th>
                    <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-16">Items</th>
                    <th className="py-3.5 px-4 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-40">Grand Total</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider w-28">Tanggal</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider w-28">Expired</th>
                    <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider w-28">Status</th>
                    <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {pageItems.map(q => {
                    const isChecked = selectedIds.includes(q.id);
                    const brands    = getBrands(q);
                    return (
                      <tr key={q.id} className={`hover:bg-brand-50/30 transition-colors group ${isChecked ? 'bg-brand-50/20' : ''}`}>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(q.id)}
                            className="w-4 h-4 rounded cursor-pointer accent-brand-500"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            onClick={() => { setActiveQuotation(q); setViewState('detail'); }}
                            className="text-sm font-bold text-brand-700 cursor-pointer hover:underline font-mono"
                          >
                            {q.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-sm font-semibold text-surface-800 line-clamp-1">{q.customer?.name || '-'}</div>
                          <div className="text-xs text-surface-400">{q.pic?.name || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {brands.length > 0 ? brands.map((b, i) => (
                              <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-surface-50 text-surface-600 border-surface-200">{b}</span>
                            )) : <span className="text-xs text-surface-400">-</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-surface-600 text-center font-semibold">{q.items?.length || 0}</td>
                        <td className="py-3.5 px-4 text-sm font-extrabold text-surface-900 text-right">{formatCurrency(calcGrandTotal(q))}</td>
                        <td className="py-3.5 px-4 text-xs text-surface-500">{formatDate(q.date || q.created_at)}</td>
                        <td className="py-3.5 px-4 text-xs text-surface-500">{formatDate(q.expired || q.expired_at)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${statusClasses(q.status)}`}>
                            {statusLabel(q.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setActiveQuotation(q); setViewState('detail'); }}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const enrichedQuotation = {
                                  ...q,
                                  creator: {
                                    ...(q.creator || {}),
                                    ...(currentUser?.id === (q.sales_id || q.created_by) ? {
                                      name: currentUser.name,
                                      email: currentUser.email,
                                      mobile: currentUser.mobile,
                                      signature_url: currentUser.signature_url,
                                    } : {}),
                                  },
                                };
                                printQuotation(enrichedQuotation, true);
                              }}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'single', item: q })}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Pagination */}
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

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 z-[100] border border-white/10 animate-fade-in-up">
          <span className="text-xs font-semibold flex items-center gap-2">
            <span className="bg-brand-500 text-white px-2.5 py-0.5 rounded-full font-bold">{selectedIds.length}</span>
            Quotation terpilih
          </span>
          <div className="h-4 w-[1px] bg-white/20" />
          <button
            onClick={() => setDeleteTarget({ type: 'bulk' })}
            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Bulk
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-white/60 hover:text-white text-xs font-medium transition-colors cursor-pointer ml-2"
          >
            Batal
          </button>
        </div>
      )}

      {/* Creation Modal with Auto-Redirect */}
      <QuotationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleQuotationCreated}
      />

      {/* Delete Confirmation Modal Alert */}
      {deleteTarget && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-1">
              {deleteTarget.type === 'bulk' ? `Konfirmasi Hapus ${selectedIds.length} Quotation` : 'Konfirmasi Hapus Quotation'}
            </h3>
            <p className="text-xs text-surface-500 mb-6 leading-relaxed">
              {deleteTarget.type === 'bulk'
                ? `Apakah Anda yakin ingin menghapus ${selectedIds.length} quotation yang dipilih? Data quotation dan item di dalamnya akan dihapus permanen.`
                : `Apakah Anda yakin ingin menghapus quotation "${deleteTarget.item?.id}"? Data quotation dan item di dalamnya akan dihapus permanen.`
              }
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Quotation'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
