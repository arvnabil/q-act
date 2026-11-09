import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CustomerModal from '@/Components/CustomerModal';
import Pagination from '@/Components/Pagination';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Search, Plus, Users as UsersIcon, Mail, Phone,
    Edit, Trash2, LayoutGrid, List as ListIcon, Loader2, Box,
    AlertTriangle, GitMerge, ChevronRight, CheckCircle2, X, Eye
} from 'lucide-react';

const PAGE_SIZE = 8;

// ─── Merge Duplicates Modal ───────────────────────────────────────────────────
function MergeDuplicatesModal({ onClose }) {
    const [loading, setLoading] = useState(false);
    const [merging, setMerging] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [error, setError] = useState(null);
    const [mergeTarget, setMergeTarget] = useState(null); // { keepId, removeId }
    const [mergeResult, setMergeResult] = useState(null);

    useEffect(() => {
        setLoading(true);
        axios.get(route('customers.duplicates'))
            .then(res => setDuplicates(res.data.duplicates || []))
            .catch(() => setError('Gagal memuat data duplikat.'))
            .finally(() => setLoading(false));
    }, []);

    const handleMerge = async () => {
        if (!mergeTarget) return;
        setMerging(true);
        setError(null);
        try {
            const res = await axios.post(route('customers.merge'), mergeTarget, {
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
            });
            setMergeResult(res.data);
            // Refresh duplicates list
            const dupRes = await axios.get(route('customers.duplicates'));
            setDuplicates(dupRes.data.duplicates || []);
            setMergeTarget(null);
        } catch (e) {
            setError(e.response?.data?.message || 'Gagal menggabungkan customer.');
        } finally {
            setMerging(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                            <GitMerge className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-surface-800">Gabung Customer Duplikat</h2>
                            <p className="text-xs text-surface-500">Admin only — data akan digabungkan ke customer tertua</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-surface-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading && (
                        <div className="flex items-center justify-center py-12 text-surface-400">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            <span className="text-sm">Memindai duplikat...</span>
                        </div>
                    )}

                    {!loading && duplicates.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-surface-400">
                            <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
                            <p className="font-semibold text-emerald-600">Tidak ada duplikat ditemukan!</p>
                            <p className="text-xs mt-1">Semua nama customer sudah unik.</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {mergeResult && (
                        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">
                            <p className="font-semibold">{mergeResult.message}</p>
                            <p className="text-xs mt-1 text-emerald-600">
                                {mergeResult.stats?.quotations_moved} quotation · {mergeResult.stats?.orders_moved} SO · {mergeResult.stats?.leads_moved} lead dipindahkan
                            </p>
                        </div>
                    )}

                    {!loading && duplicates.map((group, gi) => (
                        <div key={gi} className="mb-5 border border-amber-200 rounded-xl overflow-hidden">
                            <div className="bg-amber-50 px-4 py-2 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-semibold text-amber-700">
                                    "{group.customers[0]?.name}" — {group.count} entri ditemukan
                                </span>
                            </div>
                            <div className="divide-y divide-surface-100">
                                {group.customers.map((c, ci) => {
                                    const isKeep = ci === 0;
                                    const isSelectedKeep = mergeTarget?.keep_id === c.id;
                                    const isSelectedRemove = mergeTarget?.remove_id === c.id;
                                    return (
                                        <div
                                            key={c.id}
                                            className={`px-4 py-3 flex items-center justify-between gap-3 ${isKeep ? 'bg-emerald-50/30' : 'bg-white'}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-surface-400">{c.id}</span>
                                                    {isKeep && (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded">SIMPAN</span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-semibold text-surface-800 truncate">{c.name}</p>
                                                <p className="text-xs text-surface-400 mt-0.5">
                                                    {c.pic_count} PIC · {c.quot_count} Quot · {c.so_count} SO · Dibuat: {c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID') : '—'}
                                                </p>
                                            </div>
                                            {!isKeep && (
                                                <button
                                                    onClick={() => setMergeTarget({ keep_id: group.customers[0].id, remove_id: c.id })}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0
                                                        ${mergeTarget?.remove_id === c.id
                                                            ? 'bg-amber-500 text-white'
                                                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                                                >
                                                    <GitMerge className="w-3.5 h-3.5" />
                                                    {mergeTarget?.remove_id === c.id ? 'Dipilih' : 'Gabung ke SIMPAN'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between gap-3">
                    <p className="text-xs text-surface-400">
                        Semua Quotation, SO, dan Lead dari customer yang dihapus akan dipindahkan ke customer yang disimpan.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-surface-600 hover:bg-surface-100 rounded-lg transition-colors">
                            Tutup
                        </button>
                        {mergeTarget && (
                            <button
                                onClick={handleMerge}
                                disabled={merging}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                            >
                                {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                                Gabungkan Sekarang
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function Customers({ customers }) {
    const { auth } = usePage().props;
    const isManagerOrAdmin = ['Administrator', 'Sales Manager', 'Manager'].includes(auth?.user?.role);

    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState([]);
    const [deletingIds, setDeletingIds] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState(null);
    const [deleteModalState, setDeleteModalState] = useState({
        isOpen: false, type: 'single', targetId: null, targetName: '',
    });
    const [showMergeModal, setShowMergeModal] = useState(false);

    // Reset page on filter/view change
    useEffect(() => { setPage(1); setSelectedIds([]); }, [search, viewMode]);

    const formatCurrency = (val) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

    // Filter
    const filtered = (customers || []).filter(c => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            c.name?.toLowerCase().includes(s) ||
            c.address?.toLowerCase().includes(s) ||
            (c.pics || []).some(p =>
                p.name?.toLowerCase().includes(s) ||
                p.email?.toLowerCase().includes(s) ||
                p.phone?.toLowerCase().includes(s)
            )
        );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = viewMode === 'list'
        ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
        : filtered;

    const isAllSelected = pageItems.length > 0 && pageItems.every(c => selectedIds.includes(c.id));

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !pageItems.some(c => c.id === id)));
        } else {
            const next = [...selectedIds];
            pageItems.forEach(c => { if (!next.includes(c.id)) next.push(c.id); });
            setSelectedIds(next);
        }
    };

    const handleToggleSelect = (id) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const openSingleDeleteModal = (id, name) => {
        setDeleteModalState({ isOpen: true, type: 'single', targetId: id, targetName: name || id });
    };

    const openBulkDeleteModal = () => {
        if (selectedIds.length === 0) return;
        setDeleteModalState({ isOpen: true, type: 'bulk', targetId: null, targetName: '' });
    };

    const confirmExecuteDelete = () => {
        const isSingle = deleteModalState.type === 'single';
        const targetIds = isSingle ? [deleteModalState.targetId] : selectedIds;

        setDeletingIds(targetIds);
        setDeleteModalState({ isOpen: false, type: 'single', targetId: null, targetName: '' });

        if (isSingle) {
            router.delete(route('customers.destroy', deleteModalState.targetId), {
                preserveScroll: true,
                onFinish: () => setDeletingIds([]),
                onSuccess: () => setSelectedIds(prev => prev.filter(id => !targetIds.includes(id))),
            });
        } else {
            router.delete(route('customers.bulk-destroy'), {
                data: { ids: targetIds },
                preserveScroll: true,
                onFinish: () => setDeletingIds([]),
                onSuccess: () => setSelectedIds([]),
            });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Customers" />

            <div className="animate-fade-in-up">

                {/* Controls */}
                <div className="bg-white rounded-xl border border-surface-200 mb-5">
                    <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:border-brand-400 transition-colors">
                            <Search className="w-4 h-4 text-surface-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Cari nama perusahaan, PIC, email..."
                                className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {/* View Toggle */}
                            <div className="flex items-center bg-surface-100 p-1 rounded-lg border border-surface-200">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-400 hover:text-surface-600'}`}
                                    title="List View"
                                >
                                    <ListIcon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-400 hover:text-surface-600'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Merge Duplicates — Admin/Manager only */}
                            {isManagerOrAdmin && (
                                <button
                                    onClick={() => setShowMergeModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-sm font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
                                    title="Gabungkan customer dengan nama duplikat"
                                >
                                    <GitMerge className="w-4 h-4" />
                                    <span className="hidden sm:inline">Gabung Duplikat</span>
                                </button>
                            )}

                            <button
                                onClick={() => { setCustomerToEdit(null); setIsModalOpen(true); }}
                                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Tambah Customer</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content area */}
                <div className="relative min-h-[400px]">
                    {filtered.length === 0 && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-surface-400">
                            <Box className="w-12 h-12 mb-3 text-surface-300" />
                            <span className="text-sm font-medium">Belum ada customer yang ditemukan.</span>
                        </div>
                    )}

                    {/* List Table View */}
                    {viewMode === 'list' && filtered.length > 0 && (
                        <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-50 border-b border-surface-200">
                                            <th className="px-5 py-4 text-center w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllSelected}
                                                    onChange={handleToggleSelectAll}
                                                    className="w-4 h-4 rounded cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider w-32">Customer ID</th>
                                            <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Nama Perusahaan</th>
                                            <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">PIC</th>
                                            <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Email</th>
                                            <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider">Telepon</th>
                                            <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-center w-36">Total Quotation</th>
                                            <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-right w-40">Total Spend</th>
                                            <th className="px-5 py-4 text-xs font-bold text-surface-500 uppercase tracking-wider text-center w-20">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {pageItems.map(c => {
                                            const primaryPic = c.pics?.find(p => p.is_primary) || c.pics?.[0];
                                            const isChecked = selectedIds.includes(c.id);
                                            return (
                                                <tr key={c.id} onClick={() => router.visit(route('customers.show', c.id))} className={`hover:bg-brand-50/30 transition-colors group cursor-pointer ${isChecked ? 'bg-brand-50/20' : ''}`}>
                                                    <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleSelect(c.id)}
                                                            className="w-4 h-4 rounded cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-mono text-surface-500">{c.id}</td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-extrabold shrink-0">
                                                                {c.name?.charAt(0) || 'C'}
                                                            </div>
                                                            <span className="text-sm font-bold text-surface-900 block line-clamp-1">{c.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-surface-600">
                                                        {primaryPic?.name || '-'}
                                                        {c.pics?.length > 1 && (
                                                            <span className="ml-1.5 text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded font-bold">
                                                                +{c.pics.length - 1}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-surface-500 max-w-[180px] truncate">{primaryPic?.email || '-'}</td>
                                                    <td className="px-5 py-4 text-sm text-surface-500">{primaryPic?.phone || '-'}</td>
                                                    <td className="px-5 py-4 text-sm font-semibold text-surface-700 text-center">
                                                        {c.quotations_count ?? '—'}
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-bold text-brand-700 text-right">
                                                        {formatCurrency(c.total_spend)}
                                                    </td>
                                                    <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => router.visit(route('customers.show', c.id))}
                                                                className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 hover:text-brand-600 transition-colors cursor-pointer"
                                                                title="Lihat Detail Customer"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => { setCustomerToEdit(c); setIsModalOpen(true); }}
                                                                className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors cursor-pointer"
                                                                title="Edit Customer"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openSingleDeleteModal(c.id, c.name)}
                                                                disabled={deletingIds.includes(c.id)}
                                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                                                                title="Hapus Customer"
                                                            >
                                                                {deletingIds.includes(c.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

                    {/* Grid / Card View */}
                    {viewMode === 'grid' && filtered.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {pageItems.map(c => {
                                const primaryPic = c.pics?.find(p => p.is_primary) || c.pics?.[0];
                                return (
                                    <div key={c.id} onClick={() => router.visit(route('customers.show', c.id))} className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-md hover:border-brand-300 transition-all flex flex-col group cursor-pointer">
                                        <div className="p-5 border-b border-surface-100 flex-1">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 text-sm font-extrabold">
                                                    {c.name?.charAt(0) || 'C'}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); router.visit(route('customers.show', c.id)); }}
                                                        className="text-surface-400 hover:text-brand-600 p-1.5 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setCustomerToEdit(c); setIsModalOpen(true); }}
                                                        className="text-surface-400 hover:text-brand-600 p-1.5 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); openSingleDeleteModal(c.id, c.name); }}
                                                        className="text-surface-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="text-sm font-bold text-surface-900 mb-1 leading-tight group-hover:text-brand-600 transition-colors">{c.name}</h3>
                                            <p className="text-xs text-surface-400 font-mono mb-3">{c.id}</p>

                                            <div className="mt-2 flex items-center gap-2 text-sm text-surface-600 bg-surface-50 p-2.5 rounded-lg border border-surface-100">
                                                <UsersIcon className="w-4 h-4 text-surface-400 shrink-0" />
                                                <span className="font-semibold text-surface-800 text-xs">{primaryPic?.name || '—'}</span>
                                                {c.pics?.length > 1 && (
                                                    <span className="text-[10px] bg-surface-200 text-surface-600 px-1.5 py-0.5 rounded font-bold ml-auto shrink-0">+{c.pics.length - 1} PIC</span>
                                                )}
                                            </div>

                                            <div className="mt-2.5 space-y-1.5 px-1">
                                                <div className="flex items-center gap-2 text-xs text-surface-500">
                                                    <Phone className="w-3.5 h-3.5 text-surface-400" />
                                                    <span>{primaryPic?.phone || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-surface-500">
                                                    <Mail className="w-3.5 h-3.5 text-surface-400" />
                                                    <span className="truncate">{primaryPic?.email || '-'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-surface-50/50 px-5 py-3 flex items-center justify-between text-xs">
                                            <div>
                                                <span className="text-surface-400 block mb-0.5">Total Spend</span>
                                                <span className="font-bold text-brand-700 text-sm">{formatCurrency(c.total_spend)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-surface-400 block mb-0.5">Riwayat</span>
                                                <span className="font-semibold text-surface-700">{c.quotations_count ?? '—'} Quotation</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
                            itemLabel="customer"
                        />
                    )}
                </div>

                {/* Floating Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-900 text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 z-[100] border border-white/10 animate-fade-in-up">
                        <span className="text-xs font-semibold flex items-center gap-2">
                            <span className="bg-brand-500 text-white px-2.5 py-0.5 rounded-full font-bold">{selectedIds.length}</span>
                            Customer terpilih
                        </span>
                        <div className="h-4 w-[1px] bg-white/20" />
                        <button
                            onClick={openBulkDeleteModal}
                            disabled={deletingIds.length > 0}
                            className="flex items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {deletingIds.length > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Hapus Customer ({selectedIds.length})
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-white/60 hover:text-white text-xs font-medium transition-colors cursor-pointer ml-1"
                        >
                            Batal
                        </button>
                    </div>
                )}

                {/* Customer Modal */}
                <CustomerModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setCustomerToEdit(null); }}
                    customerToEdit={customerToEdit}
                />

                {/* Delete Confirmation Modal */}
                {deleteModalState.isOpen && ReactDOM.createPortal(
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-scale-in">
                            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-surface-900 mb-1">Konfirmasi Hapus Customer</h3>
                            <p className="text-xs text-surface-500 mb-6 leading-relaxed">
                                {deleteModalState.type === 'single'
                                    ? `Apakah Anda yakin ingin menghapus customer "${deleteModalState.targetName}"? Data customer dan kontak PIC terkait akan dihapus.`
                                    : `Apakah Anda yakin ingin menghapus ${selectedIds.length} customer terpilih? Data customer dan kontak PIC terkait akan dihapus.`
                                }
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeleteModalState({ isOpen: false, type: 'single', targetId: null, targetName: '' })}
                                    className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmExecuteDelete}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Ya, Hapus</span>
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* Merge Duplicates Modal */}
            {showMergeModal && (
                <MergeDuplicatesModal onClose={() => { setShowMergeModal(false); router.reload({ only: ['customers'] }); }} />
            )}
        </AuthenticatedLayout>
    );
}
