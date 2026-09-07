import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Plus, Trash2, Loader2, FileText, CheckCircle2, Box,
    Printer, Tag, FolderPlus, Pencil, Check, X, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { printSimulasiSO, exportSimulasiSOExcel } from '@/utils/printSimulasiSO';

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (str) => {
    if (!str) return '-';
    try {
        const d = new Date(str);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return str; }
};

export default function SalesOrderDetail({ so, costCategories = [], isFinance }) {
    const { flash, auth } = usePage().props;

    const [categories, setCategories] = useState(costCategories || []);
    const [selectedCategory, setSelectedCategory] = useState(costCategories[0]?.name || 'Others / Shipping/ Import');
    const [newCostDesc, setNewCostDesc] = useState('');
    const [newCostAmt, setNewCostAmt] = useState('');
    const [isSubmittingCost, setIsSubmittingCost] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Modal state for managing cost categories
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

    // Category Edit & Delete state
    const [editingCatId, setEditingCatId] = useState(null);
    const [editingCatName, setEditingCatName] = useState('');
    const [isSavingCat, setIsSavingCat] = useState(false);

    if (!so) return null;

    // Metric Calculations
    const totalItemValue = Number(so.total_item_value || 0);
    const totalCogs = Number(so.total_cogs || 0);
    const totalCost = Number(so.total_cost || 0);
    const grossMarginRp = totalItemValue - totalCogs - totalCost;
    const grossMarginPct = totalItemValue > 0 ? (grossMarginRp / totalItemValue) * 100 : 0;
    const grandTotal = Number(so.grand_total || totalItemValue);

    const handleAddCategory = async (e) => {
        e?.preventDefault();
        if (!newCategoryName.trim()) {
            toast.error('Nama kategori tidak boleh kosong');
            return;
        }

        setIsSubmittingCategory(true);
        try {
            const res = await fetch(route('cost-categories.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ name: newCategoryName.trim() }),
            });

            const data = await res.json();
            if (res.ok && data.category) {
                setCategories(prev => [...prev, data.category]);
                setSelectedCategory(data.category.name);
                setNewCategoryName('');
                toast.success('Kategori biaya berhasil ditambahkan!');
            } else {
                toast.error(data.message || 'Gagal menambahkan kategori');
            }
        } catch (err) {
            toast.error('Terjadi kesalahan saat menambahkan kategori.');
        } finally {
            setIsSubmittingCategory(false);
        }
    };

    const handleStartEditCat = (cat) => {
        setEditingCatId(cat.id);
        setEditingCatName(cat.name);
    };

    const handleSaveEditCat = async (catId) => {
        if (!editingCatName.trim()) {
            toast.error('Nama kategori tidak boleh kosong');
            return;
        }

        setIsSavingCat(true);
        try {
            const res = await fetch(route('cost-categories.update', catId), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ name: editingCatName.trim() }),
            });

            const data = await res.json();
            if (res.ok && data.category) {
                const oldCat = categories.find(c => c.id === catId);
                setCategories(prev => prev.map(c => c.id === catId ? data.category : c));
                if (selectedCategory === oldCat?.name) {
                    setSelectedCategory(data.category.name);
                }
                setEditingCatId(null);
                setEditingCatName('');
                toast.success('Kategori biaya berhasil diperbarui!');
                router.reload({ preserveScroll: true });
            } else {
                toast.error(data.message || 'Gagal memperbarui kategori');
            }
        } catch (err) {
            toast.error('Terjadi kesalahan saat memperbarui kategori.');
        } finally {
            setIsSavingCat(false);
        }
    };

    const handleDeleteCat = async (catId, catName) => {
        if (!window.confirm(`Hapus kategori "${catName}"?`)) return;

        try {
            const res = await fetch(route('cost-categories.destroy', catId), {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
            });

            const data = await res.json();
            if (res.ok) {
                const remaining = categories.filter(c => c.id !== catId);
                setCategories(remaining);
                if (selectedCategory === catName) {
                    setSelectedCategory(remaining[0]?.name || '');
                }
                toast.success('Kategori biaya berhasil dihapus!');
            } else {
                toast.error(data.message || 'Gagal menghapus kategori');
            }
        } catch (err) {
            toast.error('Terjadi kesalahan saat menghapus kategori.');
        }
    };

    const handleAddCost = (e) => {
        e?.preventDefault();
        if (!newCostDesc.trim()) {
            toast.error('Deskripsi cost tidak boleh kosong');
            return;
        }
        const amt = Number(newCostAmt.replace(/\D/g, ''));
        if (!amt || amt <= 0) {
            toast.error('Nominal cost tidak valid');
            return;
        }

        const catObj = categories.find(c => c.name === selectedCategory);

        setIsSubmittingCost(true);
        router.post(route('sales-orders.costs.store', so.id), {
            cost_category_id: catObj ? catObj.id : null,
            category_name: selectedCategory,
            description: newCostDesc.trim(),
            amount: amt,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewCostDesc('');
                setNewCostAmt('');
                toast.success('Cost berhasil ditambahkan!');
            },
            onError: (errs) => Object.values(errs).forEach(m => toast.error(m)),
            onFinish: () => setIsSubmittingCost(false),
        });
    };

    const handleRemoveCost = (costId) => {
        if (!confirm('Hapus cost ini?')) return;
        router.delete(route('sales-orders.costs.destroy', [so.id, costId]), {
            preserveScroll: true,
            onSuccess: () => toast.success('Cost berhasil dihapus!'),
            onError: (errs) => Object.values(errs).forEach(m => toast.error(m)),
        });
    };

    const handleMarkProcessed = () => {
        if (!confirm('Tandai SO ini telah diproses oleh Finance?')) return;
        setIsUpdatingStatus(true);
        router.post(route('sales-orders.status.update', so.id), {
            status: 'Ditambahkan Finance',
        }, {
            preserveScroll: true,
            onSuccess: () => toast.success('Status SO berhasil diperbarui!'),
            onError: (errs) => Object.values(errs).forEach(m => toast.error(m)),
            onFinish: () => setIsUpdatingStatus(false),
        });
    };

    const buildExportPayload = () => {
        const adjustments = (so.costs || []).map(c => ({
            category: c.category_name || 'Others / Shipping/ Import',
            label: c.description || '',
            amount: c.amount || 0,
        }));

        const quotationObj = {
            id: so.quotation_id || so.id,
            date: so.date,
            customer: so.customer,
            sales: so.sales,
            calc_tax: so.quotation?.calc_tax ?? true,
            calc_pph: so.quotation?.calc_pph ?? false,
            pph_rate: so.quotation?.pph_rate ?? 0.02,
            notes: so.notes || so.quotation?.notes || '',
            items: (so.items || []).map(i => ({
                sku: i.sku,
                name: i.name || i.sku,
                qty: i.qty,
                price: i.price,
                hpp: i.hpp,
            })),
        };

        return { quotationObj, adjustments };
    };

    const handleExportSO = () => {
        const { quotationObj, adjustments } = buildExportPayload();
        printSimulasiSO(quotationObj, adjustments, auth?.user);
    };

    const handleExportSOExcel = async () => {
        const { quotationObj, adjustments } = buildExportPayload();
        try {
            await exportSimulasiSOExcel(quotationObj, adjustments, auth?.user);
            toast.success('File Excel analisa SO berhasil diunduh! 📥');
        } catch (err) {
            console.error('Export Excel SO gagal:', err);
            toast.error('Gagal export Excel. Silakan coba lagi atau periksa console.');
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Sales Order ${so.id}`} />

            <div className="animate-fade-in max-w-6xl pb-12">
                {/* Flash message */}
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

                {/* Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <Link
                        href={route('sales-orders.index')}
                        className="flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-brand-600 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali
                    </Link>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleExportSOExcel}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Export Excel</span>
                        </button>
                        <button
                            onClick={handleExportSO}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Cetak / Export SO</span>
                        </button>
                    </div>
                </div>

                {/* Header Info */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6">
                    <div className="px-6 py-5 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-surface-900">
                                Sales Order: <span className="font-mono text-brand-600">{so.id}</span>
                            </h2>
                            <p className="text-xs text-surface-400 mt-0.5">
                                Ref Quotation: {so.quotation_id ? (
                                    <Link href={route('quotations.show', so.quotation_id)} className="font-mono text-brand-600 hover:underline">{so.quotation_id}</Link>
                                ) : (
                                    <span className="font-mono text-surface-400">-</span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${so.status === 'Ditambahkan Finance' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                {so.status === 'Ditambahkan Finance' && <CheckCircle2 className="w-4 h-4" />}
                                {so.status}
                            </div>

                            {isFinance && so.status !== 'Ditambahkan Finance' && (
                                <button
                                    onClick={handleMarkProcessed}
                                    disabled={isUpdatingStatus}
                                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                                >
                                    {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Tandai Diproses Finance
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Customer</label>
                            <div className="text-sm font-semibold text-surface-900">{so.customer?.name || '-'}</div>
                            <div className="text-xs text-surface-500 mt-0.5">{so.customer?.address || '-'}</div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Sales Person</label>
                            <div className="text-sm text-surface-900">{so.sales?.name || '-'}</div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Tanggal Order</label>
                            <div className="text-sm text-surface-900">{formatDate(so.date)}</div>
                        </div>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-surface-100 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                            <Box className="w-4 h-4 text-brand-500" />
                            Daftar Item Pesanan (Read-Only)
                        </h2>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-50/50 border-b border-surface-200">
                                    <th className="py-3 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider w-12 text-center">No</th>
                                    <th className="py-3 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">Nama Produk / Item</th>
                                    <th className="py-3 px-6 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-24">Qty</th>
                                    <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-40">Harga Jual</th>
                                    <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-40">Total Jual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100">
                                {so.items?.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-surface-50/50 transition-colors">
                                        <td className="py-3 px-6 text-center text-sm text-surface-500 font-medium">{idx + 1}</td>
                                        <td className="py-3 px-6">
                                            <div className="text-sm font-bold text-surface-900">
                                                {item.item_name || item.name || item.sku || '-'}
                                            </div>
                                            <div className="text-xs text-surface-500 font-mono mt-0.5">
                                                SKU: {item.sku || '-'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-center text-sm font-bold text-surface-700">{item.qty}</td>
                                        <td className="py-3 px-6 text-right text-sm text-surface-700">{formatCurrency(item.price)}</td>
                                        <td className="py-3 px-6 text-right text-sm font-bold text-surface-900">{formatCurrency(item.qty * item.price)}</td>
                                    </tr>
                                ))}
                                {(!so.items || so.items.length === 0) && (
                                    <tr><td colSpan="5" className="py-8 text-center text-surface-400 text-sm">Tidak ada item</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ADDITIONAL COSTS (OTHER COGS) */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-surface-100 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-500" />
                            Biaya Tambahan (Other COGS)
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowCategoryModal(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>+ Kelola Kategori</span>
                        </button>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-50/50 border-b border-surface-200">
                                    <th className="py-3 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider w-64">Kategori Biaya</th>
                                    <th className="py-3 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider">Deskripsi</th>
                                    <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-48">Nominal (Pengurang Margin)</th>
                                    <th className="py-3 px-6 text-center text-xs font-bold text-surface-500 uppercase tracking-wider w-20">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100">
                                {so.costs?.map((c) => (
                                    <tr key={c.id} className="hover:bg-surface-50/50 transition-colors">
                                        <td className="py-3 px-6 text-sm font-semibold text-brand-700">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-md text-xs">
                                                <Tag className="w-3 h-3 text-brand-500" />
                                                {c.category_name || 'Others / Shipping/ Import'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-sm text-surface-800">{c.description}</td>
                                        <td className="py-3 px-6 text-right text-sm font-bold text-red-600">
                                            - {formatCurrency(c.amount)}
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            <button
                                                onClick={() => handleRemoveCost(c.id)}
                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                title="Hapus Cost"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {/* Add Cost Form */}
                                <tr className="bg-surface-50">
                                    <td className="py-3 px-6">
                                        <select
                                            className="w-full text-sm bg-white border border-surface-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all cursor-pointer"
                                            value={selectedCategory}
                                            onChange={e => {
                                                if (e.target.value === '__add_new__') {
                                                    setShowCategoryModal(true);
                                                } else {
                                                    setSelectedCategory(e.target.value);
                                                }
                                            }}
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                                            ))}
                                            <option value="__add_new__">+ Tambah Kategori Baru...</option>
                                        </select>
                                    </td>
                                    <td className="py-3 px-6">
                                        <input
                                            type="text"
                                            placeholder="Deskripsi rincian biaya..."
                                            className="w-full text-sm bg-white border border-surface-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all"
                                            value={newCostDesc}
                                            onChange={e => setNewCostDesc(e.target.value)}
                                        />
                                    </td>
                                    <td className="py-3 px-6">
                                        <input
                                            type="text"
                                            placeholder="Rp 0"
                                            className="w-full text-sm text-right font-mono bg-white border border-surface-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none transition-all"
                                            value={newCostAmt}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setNewCostAmt(val ? formatCurrency(val) : '');
                                            }}
                                        />
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                        <button
                                            onClick={handleAddCost}
                                            disabled={isSubmittingCost}
                                            className="p-2 bg-brand-600 text-white hover:bg-brand-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                                            title="Tambah Cost"
                                        >
                                            {isSubmittingCost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* REDESIGNED HORIZONTAL SUMMARY METRICS SECTION */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-6">
                    <h3 className="text-xs font-bold text-surface-500 mb-4 uppercase tracking-wider">Ringkasan Nilai &amp; Margin SO</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Card 1: Total Revenue */}
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 flex flex-col justify-between">
                            <span className="text-xs font-semibold text-surface-500 block mb-1">Total Item (Revenue)</span>
                            <div className="text-lg font-bold text-surface-900">{formatCurrency(totalItemValue)}</div>
                            <span className="text-[11px] text-surface-400 mt-1">Total Penjualan Item</span>
                        </div>

                        {/* Card 2: Total COGS */}
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 flex flex-col justify-between">
                            <span className="text-xs font-semibold text-surface-500 block mb-1">Total COGS (HPP Item)</span>
                            <div className="text-lg font-bold text-surface-800">{formatCurrency(totalCogs)}</div>
                            <span className="text-[11px] text-surface-400 mt-1">Modal Produk</span>
                        </div>

                        {/* Card 3: Other COGS / Cost */}
                        <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 flex flex-col justify-between">
                            <span className="text-xs font-semibold text-red-700 block mb-1">Total Biaya (Other COGS)</span>
                            <div className="text-lg font-bold text-red-600">- {formatCurrency(totalCost)}</div>
                            <span className="text-[11px] text-red-500 mt-1">Biaya Tambahan (Pengurang)</span>
                        </div>

                        {/* Card 4: Gross Margin */}
                        <div className={`border rounded-xl p-4 flex flex-col justify-between ${grossMarginRp < 0 ? 'bg-red-50 border-red-300' : 'bg-emerald-50/50 border-emerald-200'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs font-semibold ${grossMarginRp < 0 ? 'text-red-700' : 'text-emerald-700'}`}>Gross Margin</span>
                                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${grossMarginRp < 0 ? 'bg-red-200 text-red-800' : 'bg-emerald-200 text-emerald-800'}`}>
                                    {grossMarginPct.toFixed(1)}%
                                </span>
                            </div>
                            <div className={`text-lg font-bold ${grossMarginRp < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCurrency(grossMarginRp)}</div>
                            <span className={`text-[11px] mt-1 ${grossMarginRp < 0 ? 'text-red-500' : 'text-emerald-600'}`}>Estimasi Keuntungan Bersih</span>
                        </div>

                        {/* Card 5: Grand Total SO */}
                        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-4 text-white flex flex-col justify-between shadow-sm">
                            <span className="text-xs font-semibold text-brand-100 block mb-1">Grand Total SO</span>
                            <div className="text-xl font-extrabold tracking-tight">{formatCurrency(grandTotal)}</div>
                            <span className="text-[11px] text-brand-200 mt-1">Nilai Tagihan Ke Customer</span>
                        </div>
                    </div>
                </div>

                {/* MODAL KELOLA & EDIT KATEGORI BIAYA */}
                {showCategoryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                        <div className="bg-white rounded-2xl border border-surface-200 shadow-xl max-w-md w-full p-6 animate-scale-up">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-bold text-surface-900">Kelola Kategori Biaya</h3>
                                    <p className="text-xs text-surface-500">Edit, tambah, atau hapus kategori Other COGS.</p>
                                </div>
                                <button
                                    onClick={() => setShowCategoryModal(false)}
                                    className="p-1 text-surface-400 hover:text-surface-600 rounded-lg cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Daftar Kategori dengan opsi Edit & Hapus */}
                            <div className="my-4 max-h-56 overflow-y-auto border border-surface-200 rounded-xl divide-y divide-surface-100 bg-surface-50/50">
                                {categories.map(c => (
                                    <div key={c.id || c.name} className="px-3.5 py-2.5 text-xs flex justify-between items-center gap-2 hover:bg-white transition-colors">
                                        {editingCatId === c.id ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <input
                                                    type="text"
                                                    className="w-full text-xs bg-white border border-brand-400 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-brand-500/30 outline-none"
                                                    value={editingCatName}
                                                    onChange={e => setEditingCatName(e.target.value)}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleSaveEditCat(c.id)}
                                                    disabled={isSavingCat}
                                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                                                    title="Simpan Nama"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingCatId(null)}
                                                    className="p-1.5 bg-surface-200 hover:bg-surface-300 text-surface-700 rounded-lg transition-colors cursor-pointer shrink-0"
                                                    title="Batal"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 font-medium text-surface-800">
                                                    <span>{c.name}</span>
                                                    {c.is_default && (
                                                        <span className="text-[10px] text-surface-400 font-semibold bg-surface-200/60 px-1.5 py-0.5 rounded">Default</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartEditCat(c)}
                                                        className="p-1 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors cursor-pointer"
                                                        title="Edit Nama Kategori"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCat(c.id, c.name)}
                                                        className="p-1 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                                        title="Hapus Kategori"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Form Tambah Kategori Baru */}
                            <form onSubmit={handleAddCategory} className="pt-2 border-t border-surface-100">
                                <label className="block text-xs font-semibold text-surface-700 mb-1.5">Tambah Kategori Baru</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Contoh: Marketing Expense, Bonus..."
                                        className="w-full text-xs bg-white border border-surface-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                                        value={newCategoryName}
                                        onChange={e => setNewCategoryName(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSubmittingCategory}
                                        className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1"
                                    >
                                        {isSubmittingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                        <span>Tambah</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
