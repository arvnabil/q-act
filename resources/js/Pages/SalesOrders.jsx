import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Search, FileStack, CheckCircle2, Trash2 } from 'lucide-react';

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (str) => {
    if (!str) return '-';
    try {
        const d = new Date(str);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return str; }
};

export default function SalesOrders({ salesOrders, isFinance }) {
    const { flash, auth } = usePage().props;
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    const userRole = auth?.user?.role || auth?.user?.spatie_role;
    const userPermissions = auth?.permissions || [];

    const canDelete = ['Administrator', 'Sales Manager', 'Manager'].includes(userRole) || userPermissions.includes('sales_orders_delete');
    const canBulkDelete = ['Administrator', 'Sales Manager', 'Manager'].includes(userRole) || userPermissions.includes('sales_orders_delete_bulk') || userPermissions.includes('sales_orders_delete');

    const filtered = (salesOrders || []).filter(so => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            so.id?.toLowerCase().includes(s) ||
            so.quotation_id?.toLowerCase().includes(s) ||
            so.customer?.name?.toLowerCase().includes(s)
        );
    });

    const isAllSelected = filtered.length > 0 && filtered.every(so => selectedIds.includes(so.id));

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filtered.map(so => so.id));
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

                {/* Controls */}
                <div className="bg-white rounded-xl border border-surface-200 mb-5">
                    <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:border-brand-400 transition-colors w-full">
                            <Search className="w-4 h-4 text-surface-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Cari no. SO, quotation, customer..."
                                className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Bulk Actions */}
                        {canBulkDelete && selectedIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleBulkDelete}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
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
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-surface-400">
                            <FileStack className="w-12 h-12 mb-3 text-surface-300" />
                            <span className="text-sm font-medium">Belum ada Sales Order yang ditemukan.</span>
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
                                            <th className="py-3.5 px-4 text-right text-xs font-bold text-surface-500 uppercase tracking-wider">Grand Total</th>
                                            <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider">Status</th>
                                            {canDelete && (
                                                <th className="py-3.5 px-4 text-center text-xs font-bold text-surface-500 uppercase tracking-wider">Aksi</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {filtered.map(so => (
                                            <tr
                                                key={so.id}
                                                onClick={() => router.visit(route('sales-orders.show', so.id))}
                                                className={`hover:bg-brand-50/30 transition-colors group cursor-pointer ${
                                                    selectedIds.includes(so.id) ? 'bg-brand-50/40' : ''
                                                }`}
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
                                                            className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center"
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
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
