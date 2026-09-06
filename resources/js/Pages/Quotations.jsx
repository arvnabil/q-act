import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Search, Eye, Download, Trash2, Loader2, FileText, Plus, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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
        const d = new Date(str);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return str; }
};

// Resizable & Sortable Table Header
const ResizableTH = ({ children, defaultWidth, align = 'left', className = '', sortable = false, sortKey = '', currentSortKey = '', currentSortOrder = '', onSort = null }) => {
    const [width, setWidth] = useState(defaultWidth);
    const [isResizing, setIsResizing] = useState(false);
    const thRef = React.useRef(null);

    const startResize = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        const startX = e.pageX;
        const startWidth = thRef.current.offsetWidth;
        const onMouseMove = (e) => setWidth(Math.max(40, startWidth + (e.pageX - startX)));
        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const isSorted = currentSortKey === sortKey;

    return (
        <th
            ref={thRef}
            onClick={() => sortable && onSort && onSort(sortKey)}
            className={`relative py-3.5 px-4 group select-none ${sortable ? 'cursor-pointer hover:bg-surface-100/70 transition-colors' : ''} ${className}`}
            style={width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}}
        >
            <div className={`flex items-center gap-1 justify-${align === 'right' ? 'end' : align === 'center' ? 'center' : 'start'} text-xs font-bold ${isSorted ? 'text-brand-700 font-extrabold' : 'text-surface-500'} uppercase tracking-wider block w-full truncate`}>
                <span className="truncate">{children}</span>
                {sortable && (
                    <span className="shrink-0 text-surface-400 group-hover:text-surface-600">
                        {isSorted ? (
                            currentSortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-brand-600" /> : <ArrowDown className="w-3.5 h-3.5 text-brand-600" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                    </span>
                )}
            </div>
            <div
                onMouseDown={startResize}
                className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-500 ${isResizing ? 'bg-brand-500' : 'bg-transparent'} transition-colors z-10`}
            />
        </th>
    );
};

export default function Quotations({ quotations, isFinance }) {
    const { flash, auth } = usePage().props;
    const { user } = auth;

    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sorting state
    const [sortKey, setSortKey] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortOrder(key === 'grand_total' || key === 'date' || key === 'expired' ? 'desc' : 'asc');
        }
    };

    // Reset page on filter change
    useEffect(() => { setPage(1); setSelectedIds([]); }, [search, filterStatus, dateStart, dateEnd]);

    const getBrands = (q) => {
        const brands = new Set();
        q.items?.forEach(item => {
            const brandName = item.product?.brand?.name || item.brand_name;
            if (brandName) brands.add(brandName);
        });
        return [...brands];
    };

    const countByStatus = (key) => {
        if (!quotations) return 0;
        return key === 'all' ? quotations.length : quotations.filter(q => q.status === key).length;
    };

    const calcGrandTotal = (q) => {
        if (q.grand_total != null) return q.grand_total;
        return q.items?.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0) || 0;
    };

    const filtered = (quotations || []).filter(q => {
        const matchStatus = filterStatus === 'all' || q.status === filterStatus;
        if (!matchStatus) return false;
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
    });

    const sortedFiltered = [...filtered].sort((a, b) => {
        let valA, valB;
        switch (sortKey) {
            case 'id':
                valA = a.id || '';
                valB = b.id || '';
                break;
            case 'customer':
                valA = a.customer?.name?.toLowerCase() || '';
                valB = b.customer?.name?.toLowerCase() || '';
                break;
            case 'sales':
                valA = (a.creator?.name || a.sales?.name || '').toLowerCase();
                valB = (b.creator?.name || b.sales?.name || '').toLowerCase();
                break;
            case 'items':
                valA = a.items?.length || 0;
                valB = b.items?.length || 0;
                break;
            case 'grand_total':
                valA = calcGrandTotal(a);
                valB = calcGrandTotal(b);
                break;
            case 'date':
                valA = new Date(a.date || a.created_at).getTime() || 0;
                valB = new Date(b.date || b.created_at).getTime() || 0;
                break;
            case 'expired':
                valA = new Date(a.expired).getTime() || 0;
                valB = new Date(b.expired).getTime() || 0;
                break;
            case 'status':
                valA = a.status || '';
                valB = b.status || '';
                break;
            default:
                valA = a.id;
                valB = b.id;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = sortedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);


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

    const handleExecuteDelete = () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        const targetIds = deleteTarget.type === 'bulk' ? selectedIds : [deleteTarget.item?.id];

        if (targetIds.length === 1) {
            router.delete(route('quotations.destroy', targetIds[0]), {
                preserveScroll: true,
                onSuccess: () => {
                    if (deleteTarget.type === 'bulk') setSelectedIds([]);
                    setDeleteTarget(null);
                },
                onFinish: () => setIsDeleting(false),
            });
        } else {
            router.post(route('quotations.bulk-destroy'), { ids: targetIds }, {
                preserveScroll: true,
                onSuccess: () => { setSelectedIds([]); setDeleteTarget(null); },
                onFinish: () => setIsDeleting(false),
            });
        }
    };

    const handleExportExcel = async () => {
        try {
            const [{ utils, writeFile }] = await Promise.all([import('xlsx')]);
            const data = filtered.map((q, idx) => ({
                'No': idx + 1,
                'Quotation ID': q.id,
                'Tanggal': formatDate(q.date || q.created_at),
                'Customer': q.customer?.name || '-',
                'PIC': q.pic?.name || '-',
                'Sales': q.creator?.name || '-',
                'Status': statusLabel(q.status),
                'Grand Total': calcGrandTotal(q),
                'Expired': formatDate(q.expired),
            }));
            const ws = utils.json_to_sheet(data);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, 'Quotations');
            writeFile(wb, `Quotations_${new Date().toISOString().slice(0,10)}.xlsx`);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Export gagal. Pastikan package xlsx tersedia.');
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Quotations" />

            <div className="animate-fade-in-up w-full max-w-full min-w-0">
                {/* Flash Messages */}
                {flash?.message && (
                    <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl">
                        {flash.message}
                    </div>
                )}

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

                {/* Controls */}
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
                                    type="date" value={dateStart}
                                    onChange={e => setDateStart(e.target.value)}
                                    className="border border-surface-200 rounded-lg px-2.5 py-1.5 text-surface-700 focus:outline-none focus:border-brand-500 bg-surface-50"
                                />
                                <span className="text-surface-400">-</span>
                                <input
                                    type="date" value={dateEnd}
                                    onChange={e => setDateEnd(e.target.value)}
                                    className="border border-surface-200 rounded-lg px-2.5 py-1.5 text-surface-700 focus:outline-none focus:border-brand-500 bg-surface-50"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 lg:mt-0">
                            <button onClick={handleExportExcel} className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-white text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-50 transition-all shadow-sm w-full sm:w-auto cursor-pointer">
                                <Download className="w-4 h-4" />
                                Export Excel
                            </button>
                            {!isFinance && (
                                <Link
                                    href={route('quotations.create')}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer whitespace-nowrap w-full sm:w-auto"
                                >
                                    <Plus className="w-4 h-4" />
                                    Buat Quotation
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Table */}
                <div className="relative min-h-[400px]">
                    {filtered.length === 0 && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-surface-400">
                            <FileText className="w-12 h-12 mb-3 text-surface-300" />
                            <span className="text-sm font-medium">Belum ada quotation yang ditemukan.</span>
                        </div>
                    )}

                    {filtered.length > 0 && (
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
                                            <ResizableTH defaultWidth={145} sortable sortKey="id" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort}>No. Quotation</ResizableTH>
                                            <ResizableTH defaultWidth={200} sortable sortKey="customer" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort}>Customer</ResizableTH>
                                            <ResizableTH defaultWidth={85} sortable sortKey="sales" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort}>Sales</ResizableTH>
                                            <ResizableTH defaultWidth={100}>Brand</ResizableTH>
                                            <ResizableTH defaultWidth={75} align="center" sortable sortKey="items" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort}>Items</ResizableTH>
                                            <ResizableTH defaultWidth={145} align="right" sortable sortKey="grand_total" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort}>Grand Total</ResizableTH>
                                            <ResizableTH defaultWidth={110} sortable sortKey="date" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort}>Tanggal</ResizableTH>
                                            <ResizableTH defaultWidth={110} sortable sortKey="expired" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort}>Expired</ResizableTH>
                                            <ResizableTH defaultWidth={100} sortable sortKey="status" currentSortKey={sortKey} currentSortOrder={sortOrder} onSort={handleSort}>Status</ResizableTH>
                                            <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-24">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {pageItems.map(q => {
                                            const isChecked = selectedIds.includes(q.id);
                                            const brands = getBrands(q);
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
                                                        <Link
                                                            href={route('quotations.show', q.id)}
                                                            className="text-sm font-bold text-brand-700 cursor-pointer hover:underline font-mono"
                                                        >
                                                            {q.id}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="text-sm font-semibold text-surface-800 line-clamp-1">{q.customer?.name || '-'}</div>
                                                        <div className="text-xs text-surface-400 truncate">{q.pic?.name || '-'}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs font-semibold text-surface-700">
                                                        {(q.creator?.name || q.sales?.name || '-').split(' ')[0]}
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
                                                    <td className="py-3.5 px-4 text-xs text-surface-500">{formatDate(q.expired)}</td>
                                                    <td className="py-3.5 px-4">
                                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide truncate max-w-full ${statusClasses(q.status)}`}>
                                                            {statusLabel(q.status)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Link
                                                                href={route('quotations.show', q.id)}
                                                                className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                                                title="Lihat Detail"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Link>
                                                            <button
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
                    {filtered.length > 0 && (
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

                {/* Delete Confirmation Modal */}
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
                                    ? `Apakah Anda yakin ingin menghapus ${selectedIds.length} quotation yang dipilih?`
                                    : `Apakah Anda yakin ingin menghapus quotation "${deleteTarget.item?.id}"?`
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
        </AuthenticatedLayout>
    );
}
