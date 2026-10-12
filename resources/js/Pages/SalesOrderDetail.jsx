import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Plus, Trash2, Loader2, FileText, CheckCircle2, Box,
    Printer, Tag, FolderPlus, Pencil, Check, X, FileSpreadsheet, UploadCloud
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { printSimulasiSO, exportSimulasiSOExcel } from '@/utils/printSimulasiSO';
import { formatMoney } from '@/utils/money';

const formatCurrency = (val) => formatMoney(val);

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
    const [activeDetailTab, setActiveDetailTab] = useState('info');
    const [showSoTimeline, setShowSoTimeline] = useState(false);
    const [changeRequestType, setChangeRequestType] = useState(null);
    const [changeRequestReason, setChangeRequestReason] = useState('');
    const [isSubmittingChangeRequest, setIsSubmittingChangeRequest] = useState(false);
    const [showPoMetadataModal, setShowPoMetadataModal] = useState(false);
    const [poNumber, setPoNumber] = useState(so?.po_number || '');
    const [poDate, setPoDate] = useState(so?.po_date || '');
    const [poStatus, setPoStatus] = useState(so?.po_status || 'Diterima');
    const [poDocument, setPoDocument] = useState(null);
    const [isSavingPoMetadata, setIsSavingPoMetadata] = useState(false);

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
        const normalizedAmount = String(newCostAmt).includes(',')
            ? String(newCostAmt).replace(/\./g, '').replace(',', '.')
            : String(newCostAmt).replace(/\.(?=\d{3}(?:\D|$))/g, '');
        const amt = Number(normalizedAmount);
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

    const handleSavePoMetadata = () => {
        if (!poNumber.trim() || !poDate || !poStatus) {
            toast.error('Nomor PO, tanggal PO, dan status PO wajib diisi.');
            return;
        }
        setIsSavingPoMetadata(true);
        router.post(route('sales-orders.purchase-order-metadata', so.id), {
            po_number: poNumber,
            po_date: poDate,
            po_status: poStatus,
            ...(poDocument ? { po_document: poDocument } : {}),
        }, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => { setShowPoMetadataModal(false); toast.success('Data PO berhasil dilengkapi.'); },
            onError: errors => toast.error(errors.po_number || errors.po_date || errors.po_status || errors.po_document || 'Data PO gagal disimpan.'),
            onFinish: () => setIsSavingPoMetadata(false),
        });
    };

    const openChangeRequest = (type) => {
        setChangeRequestType(type);
        setChangeRequestReason('');
    };

    const handleChangeRequest = (e) => {
        e.preventDefault();
        if (!so.quotation_id || !changeRequestReason.trim()) return;
        setIsSubmittingChangeRequest(true);
        router.post(route('quotations.change-requests.store', so.quotation_id), { type: changeRequestType, reason: changeRequestReason.trim() }, {
            preserveScroll: true,
            onSuccess: () => { setChangeRequestType(null); setChangeRequestReason(''); toast.success('Pengajuan berhasil dikirim ke manager.'); },
            onError: (errors) => Object.values(errors).forEach(message => toast.error(message)),
            onFinish: () => setIsSubmittingChangeRequest(false),
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

                {changeRequestType && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
                        <form onSubmit={handleChangeRequest} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                            <div className="px-6 py-5 border-b border-surface-100">
                                <h3 className="text-base font-bold text-surface-900">{changeRequestType === 'revision' ? 'Ajukan Revisi Quotation' : 'Ajukan Cancel PO'}</h3>
                                <p className="text-xs text-surface-500 mt-1">Tuliskan alasan agar manager dapat meninjau pengajuan ini.</p>
                            </div>
                            <div className="p-6">
                                <label className="block text-xs font-semibold text-surface-700 mb-2">Alasan pengajuan</label>
                                <textarea value={changeRequestReason} onChange={e => setChangeRequestReason(e.target.value)} rows={5} autoFocus required minLength={5} className="w-full rounded-xl border border-surface-200 text-sm text-surface-800 focus:border-brand-500 focus:ring-brand-500" placeholder={changeRequestType === 'revision' ? 'Contoh: Customer mengurangi item...' : 'Contoh: Customer membatalkan PO...'} />
                            </div>
                            <div className="px-6 py-4 bg-surface-50 flex justify-end gap-3">
                                <button type="button" onClick={() => setChangeRequestType(null)} disabled={isSubmittingChangeRequest} className="px-4 py-2 rounded-lg border border-surface-200 text-xs font-semibold text-surface-700 hover:bg-white">Batal</button>
                                <button type="submit" disabled={isSubmittingChangeRequest || changeRequestReason.trim().length < 5} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 disabled:opacity-50">{isSubmittingChangeRequest ? 'Mengirim...' : 'Kirim Pengajuan'}</button>
                            </div>
                        </form>
                    </div>
                )}

                {showPoMetadataModal && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-5 border-b border-surface-100 flex items-start justify-between">
                                <div>
                                    <h3 className="text-base font-bold text-surface-900">Lengkapi Data PO Historis</h3>
                                    <p className="text-xs text-surface-500 mt-1">Data ini melengkapi SO lama dan tidak membuat SO baru.</p>
                                </div>
                                <button type="button" onClick={() => setShowPoMetadataModal(false)} className="p-1 text-surface-400 hover:text-surface-700 cursor-pointer"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div><label className="block text-xs font-semibold text-surface-700 mb-1">Nomor PO *</label><input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="w-full rounded-lg border border-surface-200 text-sm" placeholder="Nomor PO customer" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-semibold text-surface-700 mb-1">Tanggal PO *</label><input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className="w-full rounded-lg border border-surface-200 text-sm" /></div>
                                    <div><label className="block text-xs font-semibold text-surface-700 mb-1">Status PO *</label><select value={poStatus} onChange={e => setPoStatus(e.target.value)} className="w-full rounded-lg border border-surface-200 text-sm">{poStatus === 'Sebagian' && <option value="Sebagian">Sebagian (data lama)</option>}<option>Diterima</option><option>Dibatalkan</option></select></div>
                                </div>
                                <div><label className="block text-xs font-semibold text-surface-700 mb-1">Dokumen PO (opsional)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setPoDocument(e.target.files?.[0] || null)} className="w-full text-xs" /></div>
                            </div>
                            <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3"><button type="button" onClick={() => setShowPoMetadataModal(false)} className="px-4 py-2.5 text-xs font-semibold bg-surface-100 rounded-xl cursor-pointer">Batal</button><button type="button" onClick={handleSavePoMetadata} disabled={isSavingPoMetadata} className="px-4 py-2.5 text-xs font-bold text-white bg-brand-600 rounded-xl cursor-pointer disabled:opacity-50">{isSavingPoMetadata ? 'Menyimpan...' : 'Simpan Data PO'}</button></div>
                        </div>
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
                            {(!so.po_number || !so.po_date || !so.po_document_path) && (
                                <button type="button" onClick={() => setShowPoMetadataModal(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 cursor-pointer">
                                    <UploadCloud className="w-4 h-4" /> Lengkapi Data PO
                                </button>
                            )}
                            {so.quotation_id && ['approved', 'sent'].includes(so.quotation?.status) && (
                                <>
                                    <button type="button" onClick={() => openChangeRequest('revision')} className="px-4 py-2 text-xs font-bold border border-amber-200 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100">Ajukan Revisi</button>
                                    <button type="button" onClick={() => openChangeRequest('cancellation')} className="px-4 py-2 text-xs font-bold border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100">Ajukan Cancel PO</button>
                                </>
                            )}
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
                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
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
                        <div>
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Status</label>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${so.status === 'Ditambahkan Finance' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-blue-200 bg-blue-100 text-blue-700'}`}>
                                {so.status === 'Ditambahkan Finance' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                {so.status || '-'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6 p-1.5 flex gap-1">
                    <button type="button" onClick={() => setActiveDetailTab('info')} className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${activeDetailTab === 'info' ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-50'}`}>Informasi SO</button>
                    <button type="button" onClick={() => setActiveDetailTab('po')} className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${activeDetailTab === 'po' ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-50'}`}>Informasi PO</button>
                    <button type="button" onClick={() => setActiveDetailTab('timeline')} className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${activeDetailTab === 'timeline' ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-50'}`}>Timeline Quotation & SO</button>
                </div>

                {activeDetailTab === 'po' && (
                    <div className="mb-6 rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-brand-600" />
                                    <h3 className="text-base font-bold text-surface-900">Informasi Purchase Order</h3>
                                </div>
                                <p className="mt-1 text-xs text-surface-500">Data PO customer yang digunakan sebagai dasar Sales Order ini.</p>
                            </div>
                            {(!so.po_number || !so.po_date || !so.po_document_path) && (
                                <button type="button" onClick={() => setShowPoMetadataModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">
                                    <UploadCloud className="h-4 w-4" /> Lengkapi Data PO
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                                <div className="mb-1 text-xs font-semibold text-surface-500">Nomor PO</div>
                                <div className="font-semibold text-surface-900">{so.po_number || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                                <div className="mb-1 text-xs font-semibold text-surface-500">Tanggal PO</div>
                                <div className="text-sm text-surface-900">{formatDate(so.po_date)}</div>
                            </div>
                            <div className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                                <div className="mb-1 text-xs font-semibold text-surface-500">Status PO</div>
                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{so.po_status || 'Belum dilengkapi'}</span>
                            </div>
                            <div className="rounded-xl border border-surface-100 bg-surface-50 p-4">
                                <div className="mb-1 text-xs font-semibold text-surface-500">Dokumen PO</div>
                                {so.po_document_path ? (
                                    <a href={`/storage/${so.po_document_path}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline">
                                        <FileText className="h-4 w-4" /> Lihat / Buka File PO
                                    </a>
                                ) : (
                                    <span className="text-xs text-surface-400">Belum di-upload</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {so.quotation && activeDetailTab === 'timeline' && (
                    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-bold text-surface-800">Timeline Quotation & SO</h3>
                                <p className="mt-1 text-xs text-surface-400">Riwayat lengkap tersedia dalam timeline.</p>
                            </div>
                            <button type="button" onClick={() => setShowSoTimeline(true)} className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100">
                                Lihat Timeline
                            </button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-surface-600">
                            <span className="rounded-full bg-surface-50 px-2.5 py-1">{so.quotation.revisions?.length || 0} sub/revisi</span>
                            <span className="rounded-full bg-surface-50 px-2.5 py-1">{so.quotation.change_requests?.length || 0} pengajuan</span>
                            <span className="rounded-full bg-surface-50 px-2.5 py-1">{so.quotation.timeline?.length || 0} aktivitas</span>
                        </div>
                    </div>
                )}

                {showSoTimeline && ReactDOM.createPortal(
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-surface-900/60 p-4 backdrop-blur-sm">
                        <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
                                <div>
                                    <h3 className="text-base font-bold text-surface-900">Timeline Quotation & SO</h3>
                                    <p className="mt-1 text-xs text-surface-500">Riwayat sub quotation, revisi, persetujuan, dan aktivitas SO.</p>
                                </div>
                                <button type="button" onClick={() => setShowSoTimeline(false)} className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700" aria-label="Tutup timeline">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="space-y-3 overflow-y-auto p-6 text-xs">
                                <div className="rounded-lg bg-surface-50 p-3">
                                    <span className="text-surface-500">Quotation aktif:</span>{' '}
                                    <Link href={route('quotations.show', so.quotation.id)} className="font-bold text-brand-600">{so.quotation.id}</Link>
                                </div>
                                {so.quotation.parent_quotation && <div className="rounded-lg bg-surface-50 p-3">Quotation sebelumnya: <Link href={route('quotations.show', so.quotation.parent_quotation.id)} className="font-bold text-brand-600">{so.quotation.parent_quotation.id}</Link></div>}
                                {so.quotation.revisions?.map(revision => <div key={revision.id} className="rounded-lg bg-surface-50 p-3">Quotation hasil revisi: <Link href={route('quotations.show', revision.id)} className="font-bold text-brand-600">{revision.id}</Link> · {revision.status}</div>)}
                                {so.quotation.change_requests?.map(changeRequest => <div key={changeRequest.id} className="border-l-4 border-brand-300 py-1 pl-3"><div className="font-semibold">{changeRequest.type === 'revision' ? 'Pengajuan revisi' : 'Pengajuan cancel PO'} · <span className="uppercase">{changeRequest.status}</span></div><div className="text-surface-500">{changeRequest.reason}</div>{changeRequest.manager_comment && <div className="mt-1 text-surface-600">Catatan manager: {changeRequest.manager_comment}</div>}</div>)}
                                {so.quotation.timeline?.map(event => <div key={event.id} className="border-l-4 border-surface-200 py-1 pl-3"><div className="font-semibold text-surface-800">{event.description}</div><div className="text-surface-400">{event.user?.name || 'Sistem'} · {event.created_at ? new Date(event.created_at).toLocaleString('id-ID') : '-'}</div></div>)}
                                {(!so.quotation.parent_quotation && !so.quotation.revisions?.length && !so.quotation.change_requests?.length && !so.quotation.timeline?.length) && <div className="text-surface-400">Belum ada riwayat.</div>}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

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
                                    <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-40">Modal (HPP)</th>
                                    <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-32">Margin</th>
                                    <th className="py-3 px-6 text-right text-xs font-bold text-surface-500 uppercase tracking-wider w-24">Margin %</th>
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
                                        <td className="py-3 px-6 text-right text-sm text-surface-700">{formatCurrency(item.hpp)}</td>
                                        <td className={`py-3 px-6 text-right text-sm font-semibold ${item.price - item.hpp < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(item.price - item.hpp)}
                                        </td>
                                        <td className={`py-3 px-6 text-right text-sm font-semibold ${item.price - item.hpp < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {item.price > 0 ? `${(((item.price - item.hpp) / item.price) * 100).toFixed(1)}%` : '-'}
                                        </td>
                                        <td className="py-3 px-6 text-right text-sm text-surface-700">{formatCurrency(item.price)}</td>
                                        <td className="py-3 px-6 text-right text-sm font-bold text-surface-900">{formatCurrency(item.qty * item.price)}</td>
                                    </tr>
                                ))}
                                {(!so.items || so.items.length === 0) && (
                                    <tr><td colSpan="8" className="py-8 text-center text-surface-400 text-sm">Tidak ada item</td></tr>
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
                                        <div className="flex items-center gap-1 w-full bg-white border border-surface-300 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500 transition-all">
                                            <span className="text-sm text-surface-500">Rp</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0"
                                                className="w-full text-sm text-right font-mono bg-transparent border-0 p-0 focus:ring-0 outline-none"
                                                value={newCostAmt}
                                                onChange={e => setNewCostAmt(e.target.value.replace(/[^0-9.,]/g, ''))}
                                            />
                                        </div>
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
