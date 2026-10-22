import React, { useState, useEffect, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Search, FileStack, CheckCircle2, Trash2, AlertTriangle, Filter, ChevronDown } from 'lucide-react';
import { formatMoney } from '@/utils/money';

const formatCurrency = (val) => formatMoney(val);

const formatDate = (str) => {
    if (!str) return '-';
    try {
        const d = new Date(str);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return str; }
};

const SO_TABS = [
    { key: 'all',             label: 'Semua' },
    { key: 'po_diterima',     label: 'PO Diterima' },
    { key: 'missing_po_date', label: 'Belum Lengkap Tgl PO' },
    { key: 'no_po',           label: 'Belum Ada PO' },
];

export default function SalesOrders({ salesOrders = [], salesUsers = [], isFinance, canFilterSales: propCanFilterSales }) {
    const { flash, auth } = usePage().props;
    const userRole = auth?.user?.role || auth?.user?.spatie_role;
    const userPermissions = auth?.permissions || [];

    const isManagerOrAdmin = ['Administrator', 'Sales Manager', 'Manager'].includes(userRole);
    const canFilterSales = propCanFilterSales ?? (isManagerOrAdmin || isFinance);

    // Read initial filters from URL query parameters (e.g. from Dashboard "Lihat SO" link)
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const p = new URLSearchParams(window.location.search);
            const tabParam = p.get('tab');
            if (tabParam === 'missing_po' || tabParam === 'missing_po_date') {
                return 'missing_po_date';
            }
            if (tabParam && SO_TABS.some(t => t.key === tabParam)) {
                return tabParam;
            }
        }
        return 'all';
    });

    const [selectedSales, setSelectedSales] = useState(() => {
        if (typeof window !== 'undefined') {
            const p = new URLSearchParams(window.location.search);
            return p.get('sales_id') || 'all';
        }
        return 'all';
    });

    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    const canDelete = isManagerOrAdmin || userPermissions.includes('sales_orders_delete');
    const canBulkDelete = isManagerOrAdmin || userPermissions.includes('sales_orders_delete_bulk') || userPermissions.includes('sales_orders_delete');

    // Sync state if URL changes externally
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const p = new URLSearchParams(window.location.search);
        const tabParam = p.get('tab');
        if (tabParam === 'missing_po' || tabParam === 'missing_po_date') {
            setActiveTab('missing_po_date');
        } else if (tabParam && SO_TABS.some(t => t.key === tabParam)) {
            setActiveTab(tabParam);
        }
        const salesParam = p.get('sales_id');
        if (salesParam) {
            setSelectedSales(salesParam);
        }
    }, []);

    // Tab change with browser history URL update
    const handleTabChange = (tabKey) => {
        setActiveTab(tabKey);
        setPage(1);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (tabKey === 'all') {
                url.searchParams.delete('tab');
            } else {
                url.searchParams.set('tab', tabKey);
            }
            window.history.replaceState({}, '', url.toString());
        }
    };

    // Sales change with browser history URL update
    const handleSalesChange = (salesId) => {
        setSelectedSales(salesId);
        setPage(1);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (salesId === 'all') {
                url.searchParams.delete('sales_id');
            } else {
                url.searchParams.set('sales_id', salesId);
            }
            window.history.replaceState({}, '', url.toString());
        }
    };

    // List of distinct sales users for the filter dropdown
    const availableSales = useMemo(() => {
        if (salesUsers && salesUsers.length > 0) return salesUsers;
        const map = new Map();
        (salesOrders || []).forEach(so => {
            if (so.sales?.id && !map.has(so.sales.id)) {
                map.set(so.sales.id, { id: so.sales.id, name: so.sales.name });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [salesUsers, salesOrders]);

    // Tab badge counters based on current sales filter
    const countByTab = (tabKey) => {
        const base = selectedSales === 'all'
            ? salesOrders
            : (salesOrders || []).filter(so => so.sales?.id === selectedSales);

        if (tabKey === 'all') return base.length;
        if (tabKey === 'po_diterima') return base.filter(so => so.is_po_received || so.has_po).length;
        if (tabKey === 'missing_po_date' || tabKey === 'missing_po') return base.filter(so => so.missing_po_date).length;
        if (tabKey === 'no_po') return base.filter(so => !so.has_po).length;
        return 0;
    };

    // Comprehensive multi-column search
    const matchesSearch = (so, searchStr) => {
        if (!searchStr) return true;
        const s = searchStr.toLowerCase().trim();

        if (so.id && so.id.toLowerCase().includes(s)) return true;
        if (so.quotation_id && so.quotation_id.toLowerCase().includes(s)) return true;
        if (so.customer?.name && so.customer.name.toLowerCase().includes(s)) return true;
        if (so.sales?.name && so.sales.name.toLowerCase().includes(s)) return true;
        if (so.status && so.status.toLowerCase().includes(s)) return true;
        if (so.po_number && so.po_number.toLowerCase().includes(s)) return true;
        if (so.po_status && so.po_status.toLowerCase().includes(s)) return true;

        if (so.date && so.date.toLowerCase().includes(s)) return true;
        if (formatDate(so.date).toLowerCase().includes(s)) return true;

        if (so.po_date && so.po_date.toLowerCase().includes(s)) return true;
        if (formatDate(so.po_date).toLowerCase().includes(s)) return true;

        if (so.grand_total != null) {
            if (String(so.grand_total).includes(s)) return true;
            if (formatCurrency(so.grand_total).toLowerCase().includes(s)) return true;
        }

        return false;
    };

    const filtered = useMemo(() => {
        return (salesOrders || []).filter(so => {
            // 1. Sales filter (only if manager/admin has selected a specific sales)
            if (canFilterSales && selectedSales !== 'all' && so.sales?.id !== selectedSales) {
                return false;
            }

            // 2. Tab filter
            if (activeTab === 'po_diterima' && !(so.is_po_received || so.has_po)) {
                return false;
            }
            if ((activeTab === 'missing_po_date' || activeTab === 'missing_po') && !so.missing_po_date) {
                return false;
            }
            if (activeTab === 'no_po' && so.has_po) {
                return false;
            }

            // 3. Search across all columns
            if (!matchesSearch(so, search)) {
                return false;
            }

            return true;
        });
    }, [salesOrders, canFilterSales, selectedSales, activeTab, search]);

    // Reset pagination when search changes
    useEffect(() => {
        setPage(1);
        setSelectedIds([]);
    }, [search, activeTab, selectedSales]);

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const isAllSelected = paginated.length > 0 && paginated.every(so => selectedIds.includes(so.id));

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(paginated.map(so => so.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(item => item !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus Sales Order ini?')) {
            router.delete(route('sales-orders.destroy', id), {
                onSuccess: () => setSelectedIds(prev => prev.filter(item => item !== id)),
            });
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} Sales Order yang dipilih?`)) {
            router.post(route('sales-orders.bulk-destroy'), { ids: selectedIds }, {
                onSuccess: () => setSelectedIds([]),
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Sales Orders" />

            <div className="animate-fade-in-up">
                {/* Flash Messages */}
                {flash?.message && (
                    <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl">
                        {flash.message}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl">
                        {flash.error}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
                    {SO_TABS.map(t => {
                        const count = countByTab(t.key);
                        const isActive = activeTab === t.key;
                        const isMissingTab = t.key === 'missing_po_date';
                        const isNoPoTab = t.key === 'no_po';
                        const isPoReceivedTab = t.key === 'po_diterima';

                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => handleTabChange(t.key)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                                    isActive
                                        ? isMissingTab || isNoPoTab
                                            ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                            : isPoReceivedTab
                                                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300'
                                                : 'bg-brand-50 text-brand-700 font-bold border border-brand-200'
                                        : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50 border border-transparent'
                                }`}
                            >
                                {isMissingTab && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                                {isPoReceivedTab && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                <span>{t.label}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    isActive
                                        ? isMissingTab || isNoPoTab
                                            ? 'bg-amber-200 text-amber-950'
                                            : isPoReceivedTab
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-brand-100 text-brand-700'
                                        : isMissingTab && count > 0
                                            ? 'bg-amber-100 text-amber-800'
                                            : isPoReceivedTab && count > 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-surface-100 text-surface-600'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Controls (Search, Sales Filter, Bulk Actions) */}
                <div className="bg-white rounded-xl border border-surface-200 mb-5 p-4 shadow-sm">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                            {/* Search */}
                            <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 max-w-lg focus-within:border-brand-400 focus-within:bg-white transition-colors">
                                <Search className="w-4 h-4 text-surface-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Cari no. SO, quotation, customer, sales, no. PO..."
                                    className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="text-xs text-surface-400 hover:text-surface-600 px-1 cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Sales Filter (Only for Manager to Admin / Finance) */}
                            {canFilterSales && (
                                <div className="relative min-w-[200px] shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-full">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400">
                                                <Filter className="w-3.5 h-3.5" />
                                            </div>
                                            <select
                                                value={selectedSales}
                                                onChange={e => handleSalesChange(e.target.value)}
                                                className="appearance-none w-full pl-8 pr-8 py-2 text-sm border border-surface-200 rounded-lg bg-surface-50 hover:bg-white text-surface-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-colors cursor-pointer"
                                            >
                                                <option value="all">Semua Sales</option>
                                                {availableSales.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bulk Actions */}
                        {canBulkDelete && selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleBulkDelete}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Hapus ({selectedIds.length})</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="relative min-h-[400px]">
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 bg-white border border-surface-200 rounded-xl text-surface-400 shadow-sm">
                            <FileStack className="w-12 h-12 mb-3 text-surface-300" />
                            <span className="text-sm font-semibold text-surface-600">
                                {activeTab === 'missing_po_date'
                                    ? 'Tidak ada Sales Order yang belum memiliki tanggal PO.'
                                    : activeTab === 'no_po'
                                        ? 'Tidak ada Sales Order tanpa data PO.'
                                        : 'Belum ada Sales Order yang ditemukan.'}
                            </span>
                            <span className="text-xs text-surface-400 mt-1">
                                {search ? 'Coba ubah kata kunci pencarian Anda.' : 'Semua data telah sesuai dengan filter yang dipilih.'}
                            </span>
                        </div>
                    )}

                    {filtered.length > 0 && (
                        <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-50 border-b border-surface-200">
                                            {canBulkDelete && (
                                                <th className="py-3.5 px-4 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAllSelected}
                                                        onChange={handleSelectAll}
                                                        className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                                    />
                                                </th>
                                            )}
                                            <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">No. SO</th>
                                            <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Ref. Quotation</th>
                                            <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Tanggal</th>
                                            <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Customer</th>
                                            <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Sales</th>
                                            <th className="py-3.5 px-4 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Status PO</th>
                                            <th className="py-3.5 px-4 text-right text-xs font-bold text-surface-500 uppercase tracking-wider">Grand Total</th>
                                            <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider">Status</th>
                                            {canDelete && (
                                                <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider">Aksi</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {paginated.map(so => (
                                            <tr
                                                key={so.id}
                                                onClick={() => router.visit(route('sales-orders.show', so.id))}
                                                className={`hover:bg-brand-50/30 transition-colors group cursor-pointer ${
                                                    selectedIds.includes(so.id) ? 'bg-brand-50/40' : ''
                                                } ${so.missing_po_date ? 'bg-amber-50/20' : ''}`}
                                            >
                                                {canBulkDelete && (
                                                    <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(so.id)}
                                                            onChange={() => handleToggleSelect(so.id)}
                                                            className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                                        />
                                                    </td>
                                                )}
                                                <td className="py-3.5 px-4">
                                                    <Link href={route('sales-orders.show', so.id)} className="text-sm font-bold text-brand-700 font-mono hover:underline">
                                                        {so.id}
                                                    </Link>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {so.quotation_id ? (
                                                        <Link
                                                            href={route('quotations.show', so.quotation_id)}
                                                            className="text-sm text-surface-600 font-mono hover:text-brand-700 hover:underline"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            {so.quotation_id}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm text-surface-400 font-mono">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="text-sm font-medium text-surface-700">{formatDate(so.date)}</span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="text-sm font-semibold text-surface-800 line-clamp-1">{so.customer?.name || '-'}</div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="text-sm text-surface-700">{so.sales?.name || '-'}</div>
                                                </td>

                                                {/* Status PO Column */}
                                                <td className="py-3.5 px-4">
                                                    {so.has_po ? (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                                so.po_status === 'Sebagian'
                                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                                    : so.po_status === 'Dibatalkan'
                                                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            }`}>
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                                                {so.po_status || 'Diterima'}
                                                            </span>

                                                            {so.po_number && (
                                                                <span className="text-xs font-mono font-medium text-surface-800">
                                                                    No: {so.po_number}
                                                                </span>
                                                            )}

                                                            {so.po_date ? (
                                                                <span className="text-[11px] text-surface-500">
                                                                    {formatDate(so.po_date)}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                                                                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                                                    Tgl PO belum diisi
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                                Belum Ada PO
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-right">
                                                    <span className="text-sm font-extrabold text-surface-900">{formatCurrency(so.grand_total)}</span>
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                                        so.status === 'Ditambahkan Finance'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {so.status === 'Ditambahkan Finance' && <CheckCircle2 className="w-3 h-3" />}
                                                        {so.status}
                                                    </span>
                                                </td>
                                                {canDelete && (
                                                    <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            title="Hapus Sales Order"
                                                            onClick={() => handleDelete(so.id)}
                                                            className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                pageSize={pageSize}
                                pageSizeOptions={[10, 15, 25, 50]}
                                onPageChange={setPage}
                                onPageSizeChange={(newSize) => {
                                    setPageSize(newSize);
                                    setPage(1);
                                }}
                                itemLabel="sales order"
                            />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
