import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, Eye, Download, Trash2, Loader2, FileText, Plus, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useQuotations, useQuotationsByUser, useQuotationsByBU } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';
import Pagination from '../components/Pagination.jsx';
import QuotationModal from '../components/QuotationModal.jsx';
import QuotationEdit from '../components/QuotationEdit.jsx';
import QuotationDetail from '../components/QuotationDetail.jsx';
import { printQuotation } from '../utils/printQuotation.js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase.js';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { saveAs } from 'file-saver';

// Resizable Table Header Component
const ResizableTH = ({ children, defaultWidth, align = 'left', className = '' }) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const thRef = React.useRef(null);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.pageX;
    const startWidth = thRef.current.offsetWidth;

    const onMouseMove = (e) => {
      const newWidth = Math.max(40, startWidth + (e.pageX - startX));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <th
      ref={thRef}
      className={`relative py-3.5 px-4 group select-none ${className}`}
      style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
    >
      <div className={`text-${align} text-xs font-bold text-surface-500 uppercase tracking-wider block w-full truncate`}>
        {children}
      </div>
      <div
        onMouseDown={startResize}
        className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-500 ${isResizing ? 'bg-brand-500' : 'bg-transparent'} transition-colors z-10`}
      />
    </th>
  );
};

const PAGE_SIZE = 8;

const STATUS_TABS = [
  { key: 'all',      label: 'Semua'    },
  { key: 'created',  label: 'Created'  },
  { key: 'sent',     label: 'Sent'     },
  { key: 'approved', label: 'PO'       },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired',  label: 'Expired'  },
];

const statusClasses = (status) => {
  switch (status) {
    case 'created':
    case 'draft':    return 'bg-surface-100 text-surface-600 border border-surface-200';
    case 'sent':     return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'rejected': return 'bg-red-50 text-red-700 border border-red-200';
    case 'expired':  return 'bg-orange-50 text-orange-700 border border-orange-200';
    default:         return 'bg-surface-100 text-surface-600';
  }
};

const statusLabel = (s) => {
  if (s === 'approved') return 'PO';
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';
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

export default function Quotations() {
  const { user: currentUser } = useAuthStore();
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]             = useState('');
  const [dateStart, setDateStart]       = useState('');
  const [dateEnd, setDateEnd]           = useState('');
  const [page, setPage]                 = useState(1);
  const [selectedIds, setSelectedIds]   = useState([]);
  
  const [searchParams, setSearchParams] = useSearchParams();

  // View state: 'list' | 'edit' | 'detail'
  const [viewState, setViewState]             = useState('list');
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [isModalOpen, setIsModalOpen]         = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single'|'bulk', item?: object }
  const [isDeleting, setIsDeleting]     = useState(false);

  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isManager = ['admin', 'Administrator', 'Sales Manager', 'Manager'].includes(user?.role);
  const isFinance = user?.role === 'Finance';

  // Fetch quotations from Supabase: Admin/Manager & Finance get all, BU members get BU quotations, others get own quotations
  const allQuery  = useQuotations();
  const mineQuery = useQuotationsByUser(user?.id);
  const buQuery   = useQuotationsByBU(user?.bu?.id);
  const activeQuery = (isManager || isFinance) ? allQuery : (user?.bu?.id ? buQuery : mineQuery);
  const { data: quotations, isLoading, isError } = activeQuery;

  // Handle URL search parameters
  useEffect(() => {
    let changed = false;
    if (searchParams.get('create') === 'true') {
      setIsModalOpen(true);
      searchParams.delete('create');
      changed = true;
    }
    const paramStatus = searchParams.get('status');
    if (paramStatus && STATUS_TABS.some(t => t.key === paramStatus)) {
      setFilterStatus(paramStatus);
      searchParams.delete('status');
      changed = true;
    }
    
    if (changed) {
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Reset page & selection on filter change
  useEffect(() => { setPage(1); setSelectedIds([]); }, [search, filterStatus, dateStart, dateEnd]);

  // Counts per status
  const countByStatus = (key) => {
    if (!quotations) return 0;
    return key === 'all' ? quotations.length : quotations.filter(q => q.status === key).length;
  };

  // Filter items
  const filtered = quotations?.filter(q => {
    const matchStatus = filterStatus === 'all' || q.status === filterStatus;
    if (!matchStatus) return false;
    
    // Date filter (by created_at)
    if (dateStart) {
      const qDate = new Date(q.created_at).toISOString().split('T')[0];
      if (qDate < dateStart) return false;
    }
    if (dateEnd) {
      const qDate = new Date(q.created_at).toISOString().split('T')[0];
      if (qDate > dateEnd) return false;
    }

    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.id?.toLowerCase().includes(s) ||
      q.customer?.name?.toLowerCase().includes(s) ||
      q.pic?.name?.toLowerCase().includes(s) ||
      q.creator?.name?.toLowerCase().includes(s)
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
      const brandName = 
        item.product?.brand?.name || 
        item.product?.brands?.name || 
        item.brand_name || 
        item.brand?.name || 
        (typeof item.brand === 'string' ? item.brand : null) ||
        item.product?.brand_id;
      if (brandName) brands.add(brandName);
    });
    return [...brands];
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!filtered || filtered.length === 0) {
      toast.error('Tidak ada data untuk diexport.');
      return;
    }

    import('xlsx').then(XLSX => {
      const headers = [[
        'No. Quotation', 'Tanggal Buat', 'Customer', 'PIC', 'Sales', 
        'Brand(s)', 'Status', 'Total Item', 'Grand Total'
      ]];
      
      const dataRows = filtered.map(q => [
        q.id || '',
        q.created_at ? format(parseISO(q.created_at), 'yyyy-MM-dd') : '',
        q.customer?.name || '',
        q.pic?.name || '',
        q.creator?.name || q.sales_id || '',
        getBrands(q).join(', '),
        q.status?.toUpperCase() || '',
        q.items?.length || 0,
        q.grand_total || q.items?.reduce((s, i) => s + (i.qty * i.price), 0) || 0
      ]);

      const ws = XLSX.utils.aoa_to_sheet([...headers, ...dataRows]);
      
      // Auto-size columns
      ws['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, 
        { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const timestamp = new Date().toISOString().split('T')[0];
      const statusLabel = filterStatus === 'all' ? 'All' : filterStatus.toUpperCase();
      saveAs(blob, `export_quotation_${statusLabel}_${timestamp}.xlsx`);
      
      toast.success('Data berhasil diexport ke Excel! 📥');
    });
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

  // Handle delete execution (Soft Delete via is_deleted=true)
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const targetIds = deleteTarget.type === 'bulk' ? selectedIds : [deleteTarget.item?.id];
      if (!targetIds || targetIds.length === 0) return;

      // Set is_deleted = true in Supabase
      const { error: softErr } = await supabase
        .from('quotations')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .in('id', targetIds);

      if (softErr) throw softErr;

      const msg = deleteTarget.type === 'bulk'
        ? `${targetIds.length} quotation berhasil dipindahkan ke Sampah (Trash).`
        : `Quotation ${targetIds[0]} berhasil dipindahkan ke Sampah (Trash).`;
      
      toast.success(msg);
      if (deleteTarget.type === 'bulk') setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['trash_quotations'] });
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
    <div className="animate-fade-in-up w-full max-w-full min-w-0">
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
        <div className="px-5 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 w-full sm:w-72 focus-within:border-brand-400 transition-colors">
              <Search className="w-4 h-4 text-surface-400 shrink-0" />
              <input
                type="text"
                placeholder="Cari no. quotation, customer..."
                className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <input
                type="date"
                value={dateStart}
                onChange={e => setDateStart(e.target.value)}
                className="border border-surface-200 rounded-lg px-2.5 py-1.5 text-surface-700 focus:outline-none focus:border-brand-500 bg-surface-50"
                title="Tanggal Mulai"
              />
              <span className="text-surface-400">-</span>
              <input
                type="date"
                value={dateEnd}
                onChange={e => setDateEnd(e.target.value)}
                className="border border-surface-200 rounded-lg px-2.5 py-1.5 text-surface-700 focus:outline-none focus:border-brand-500 bg-surface-50"
                title="Tanggal Akhir"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 lg:mt-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-white text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-50 transition-all shadow-sm w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            {!isFinance && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer whitespace-nowrap w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                Buat Quotation
              </button>
            )}
          </div>
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
              <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
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
                    <ResizableTH defaultWidth={140}>No. Quotation</ResizableTH>
                    <ResizableTH defaultWidth={200}>Customer</ResizableTH>
                    <ResizableTH defaultWidth={80}>Sales</ResizableTH>
                    <ResizableTH defaultWidth={90}>Brand</ResizableTH>
                    <ResizableTH defaultWidth={75} align="center">Items</ResizableTH>
                    <ResizableTH defaultWidth={140} align="right">Grand Total</ResizableTH>
                    <ResizableTH defaultWidth={110}>Tanggal</ResizableTH>
                    <ResizableTH defaultWidth={110}>Expired</ResizableTH>
                    <ResizableTH defaultWidth={100}>Status</ResizableTH>
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
                          <div className="text-xs text-surface-400 truncate">{q.pic?.name || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-surface-700">
                          {(() => {
                            const raw = q.creator?.name || q.sales?.name || q.sales_name || (q.id && q.id.includes('.') ? q.id.split('.')[0].toUpperCase() : '-');
                            return raw.trim().split(/\s+/)[0];
                          })()}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-h-[40px] overflow-hidden">
                            {brands.length > 0 ? brands.map((b, i) => (
                              <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-surface-50 text-surface-600 border-surface-200 truncate max-w-[80px]">{b}</span>
                            )) : <span className="text-xs text-surface-400">-</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-surface-600 text-center font-semibold">{q.items?.length || 0}</td>
                        <td className="py-3.5 px-4 text-sm font-extrabold text-surface-900 text-right">{formatCurrency(calcGrandTotal(q))}</td>
                        <td className="py-3.5 px-4 text-xs text-surface-500">{formatDate(q.date || q.created_at)}</td>
                        <td className="py-3.5 px-4 text-xs text-surface-500">{formatDate(q.expired || q.expired_at)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide truncate max-w-full ${statusClasses(q.status)}`}>
                            {statusLabel(q.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
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
                              title="Cetak / Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {!isFinance && (
                              <button
                                onClick={() => setDeleteTarget({ type: 'single', item: q })}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
      {selectedIds.length > 0 && !isFinance && (
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
