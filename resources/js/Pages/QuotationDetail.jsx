import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Edit, Download, CheckCircle2, Clock, XCircle,
    AlertCircle, FileText, CreditCard, Loader2, Trash2, AlertTriangle, Copy, Layers, ChevronDown, X, UploadCloud
} from 'lucide-react';
import { printQuotation } from '@/utils/printQuotation';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatMoney, roundMoney } from '@/utils/money';

const formatCurrency = (val) =>
    formatMoney(val);

const formatDateStr = (str) => {
    if (!str) return '-';
    try {
        const d = parseISO(str);
        return isValid(d) ? format(d, 'd MMMM yyyy', { locale: idLocale }) : str;
    } catch { return str; }
};

const brandClasses = (brand) => {
    const b = (brand || '').toLowerCase();
    if (b.includes('jabra')) return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (b.includes('logitech')) return 'bg-teal-100 text-teal-800 border border-teal-200';
    if (b.includes('poly')) return 'bg-purple-100 text-purple-800 border border-purple-200';
    if (b.includes('yealink')) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (b.includes('hikvision')) return 'bg-red-100 text-red-800 border border-red-200';
    return 'bg-surface-100 text-surface-700 border border-surface-200';
};

const formatBrandName = (brand) => {
    if (!brand) return '';
    if (typeof brand === 'object') return brand.name || '';
    return String(brand);
};

const statusBadge = (s) => {
    switch (s) {
        case 'approved': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide"><CheckCircle2 className="w-3.5 h-3.5" /> PO</span>;
        case 'sent': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide"><Clock className="w-3.5 h-3.5" /> Sent</span>;
        case 'rejected': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wide"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
        case 'expired': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wide"><AlertCircle className="w-3.5 h-3.5" /> Expired</span>;
        case 'cancelled': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wide"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
        case 'superseded': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide"><AlertCircle className="w-3.5 h-3.5" /> Superseded</span>;
        case 'revision_draft': return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 uppercase tracking-wide"><FileText className="w-3.5 h-3.5" /> Draft Revisi</span>;
        default: return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-surface-100 text-surface-600 border border-surface-200 uppercase tracking-wide"><FileText className="w-3.5 h-3.5" /> Created</span>;
    }
};

export default function QuotationDetail({ quotation, printDocuments = [], bankAccounts, currentUser, companyInfo = {}, domainLogoMap = [] }) {
    const { flash } = usePage().props;
    const [withImage, setWithImage] = useState(false);
    const [pdfLanguage, setPdfLanguage] = useState('id');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [changeRequestType, setChangeRequestType] = useState(null);
    const [changeRequestReason, setChangeRequestReason] = useState('');
    const [isSubmittingChangeRequest, setIsSubmittingChangeRequest] = useState(false);
    const [showPrintMenu, setShowPrintMenu] = useState(false);
    const [showTimeline, setShowTimeline] = useState(false);
    const [showBulkPoModal, setShowBulkPoModal] = useState(false);
    const [bulkPoRows, setBulkPoRows] = useState([]);
    const [bulkPoErrors, setBulkPoErrors] = useState({});
    const [isSavingBulkPo, setIsSavingBulkPo] = useState(false);

    if (!quotation) return null;

    const items = quotation.items || [];
    const subtotal = roundMoney(quotation.subtotal ?? items.reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0));
    const ppnRate = quotation.ppn_rate || 0.11;
    const calcTax = quotation.calc_tax !== false;
    const showTax = quotation.show_tax !== false;
    const ppn = (calcTax && showTax) ? roundMoney(quotation.tax_amount ?? subtotal * ppnRate) : 0;
    const pphBasis = items.filter(i => i.is_pph_applied).reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0);
    const pph = quotation.calc_pph ? roundMoney(pphBasis * (quotation.pph_rate || 0.02)) : 0;
    const grandTotal = roundMoney(quotation.grand_total ?? (subtotal + ppn + pph));

    // Days until expiry
    const expDateStr = quotation.expired;
    let expiredLabel = '';
    let expiredColor = 'text-surface-500';
    if (expDateStr) {
        try {
            const expDate = parseISO(expDateStr);
            const days = differenceInDays(expDate, new Date());
            if (days < 0) { expiredLabel = 'Sudah expired'; expiredColor = 'text-red-600'; }
            else if (days === 0) { expiredLabel = 'Expired hari ini'; expiredColor = 'text-red-600'; }
            else { expiredLabel = `${days} hari lagi`; expiredColor = days <= 3 ? 'text-amber-600' : 'text-emerald-600'; }
        } catch { expiredLabel = ''; }
    }

    const itemBrands = Array.from(new Set(
        items.map(i => formatBrandName(i.brand || i.product?.brand)).filter(Boolean)
    ));

    const picObj = quotation.pic || quotation.customer?.pics?.find(p => p.is_primary) || quotation.customer?.pics?.[0] || null;

    // Find bank account
    const bankAccount = quotation.bank_account
        || bankAccounts?.find(b => b.id === quotation.bank_account_id)
        || bankAccounts?.find(b => b.is_default)
        || bankAccounts?.[0]
        || null;

    const DEFAULT_TERMS = [
        'Harga belum termasuk PPN 11% (kecuali dinyatakan lain).',
        'Penawaran berlaku sesuai masa berlaku tertera.',
        'Pembayaran ditransfer ke rekening resmi PT. Alfa Cipta Teknologi Virtual.',
        'Pengiriman dilakukan setelah konfirmasi pembayaran diterima.',
    ];
    const termsList = (Array.isArray(quotation.terms) && quotation.terms.length > 0)
        ? quotation.terms
        : (quotation.notes ? quotation.notes.split('\n').filter(Boolean) : DEFAULT_TERMS);

    const handlePrint = (documentQuotation = quotation) => {
        const enrichedQuotation = {
            ...documentQuotation,
            company_info: companyInfo,
            domain_logo_map: domainLogoMap,
            creator: {
                ...(documentQuotation.creator || {}),
                ...(currentUser?.id === documentQuotation.sales_id ? {
                    name: currentUser.name,
                    email: currentUser.email,
                } : {}),
            },
        };
        printQuotation(enrichedQuotation, withImage, bankAccount, pdfLanguage);
        setShowPrintMenu(false);
    };

    const printOptions = (printDocuments || []).map((documentQuotation) => ({
        quotation: documentQuotation,
        label: documentQuotation.id === quotation.id
            ? 'Cetak Dokumen Ini'
            : documentQuotation.relation_type === 'split'
                ? `Cetak Sub Quotation ${documentQuotation.id}`
                : 'Cetak Quotation Utama',
    }));

    const handleExecuteDelete = () => {
        setIsDeleting(true);
        router.delete(route('quotations.destroy', quotation.id), {
            onSuccess: () => { setDeleteTarget(null); },
            onFinish: () => setIsDeleting(false),
        });
    };

    const handleDuplicate = () => {
        if (isDuplicating) return;
        setIsDuplicating(true);
        router.post(route('quotations.duplicate', quotation.id), {}, {
            onSuccess: () => setShowDuplicateConfirm(false),
            onFinish: () => setIsDuplicating(false),
        });
    };

    const submitChangeRequest = (e) => {
        e.preventDefault();
        if (!changeRequestReason.trim()) return;
        setIsSubmittingChangeRequest(true);
        router.post(route('quotations.change-requests.store', quotation.id), { type: changeRequestType, reason: changeRequestReason.trim() }, {
            onSuccess: () => { setChangeRequestType(null); setChangeRequestReason(''); },
            onFinish: () => setIsSubmittingChangeRequest(false),
        });
    };

    const createFromCancelled = () => {
        router.post(route('quotations.new-from-cancelled', quotation.id));
    };

    const openBulkPoModal = () => {
        const fallbackUnits = [
            {
                id: quotation.id,
                label: 'Quotation Utama',
                relation_type: 'main',
                status: quotation.status,
                po_status: quotation.po_status,
                po_number: quotation.po_number,
                po_date: quotation.po_date,
                po_document_path: quotation.po_document_path,
                items_count: quotation.items?.length || 0,
                grand_total: quotation.grand_total,
            },
            ...(quotation.revisions || []).filter((revision) => revision.relation_type === 'split').map((revision) => ({
                id: revision.id,
                label: 'Sub Quotation',
                relation_type: 'split',
                status: revision.status,
                po_status: revision.po_status,
                po_number: revision.po_number,
                po_date: revision.po_date,
                po_document_path: revision.po_document_path,
                items_count: 0,
                grand_total: revision.grand_total,
            })),
        ];
        const units = quotation.po_units?.length ? quotation.po_units : fallbackUnits;
        const rows = units.map((unit) => ({
            ...unit,
            status: unit.po_status || 'Diterima',
            po_number: unit.po_number || '',
            po_date: unit.po_date || '',
            po_document: null,
        }));
        setBulkPoRows(rows);
        setBulkPoErrors({});
        setShowBulkPoModal(true);
    };

    const updateBulkPoRow = (id, field, value) => {
        setBulkPoRows((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
        setBulkPoErrors((errors) => {
            const next = { ...errors };
            delete next[`entries.${id}.${field}`];
            return next;
        });
    };

    const submitBulkPo = (event) => {
        event.preventDefault();
        if (isSavingBulkPo || bulkPoRows.length === 0) return;

        const formData = new FormData();
        bulkPoRows.forEach((row, index) => {
            formData.append(`entries[${index}][quotation_id]`, row.id);
            formData.append(`entries[${index}][status]`, row.status);
            formData.append(`entries[${index}][po_number]`, row.po_number);
            formData.append(`entries[${index}][po_date]`, row.po_date);
            if (row.po_document) formData.append(`entries[${index}][po_document]`, row.po_document);
        });

        setIsSavingBulkPo(true);
        setBulkPoErrors({});
        router.post(route('quotations.bulk-purchase-orders.store', quotation.id), formData, {
            forceFormData: true,
            onSuccess: () => setShowBulkPoModal(false),
            onError: (errors) => setBulkPoErrors(errors || {}),
            onFinish: () => setIsSavingBulkPo(false),
        });
    };

    const canManage = (currentUser?.spatie_role !== 'Finance' && currentUser?.role !== 'Finance');
    const quotationStructure = quotation.quotation_structure || { root: null, children: [], current_id: quotation.id };

    return (
        <AuthenticatedLayout>
            <Head title={`Quotation ${quotation.id}`} />
            <div className="animate-fade-in-up max-w-5xl">
                {flash?.message && (
                    <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl">
                        {flash.message}
                    </div>
                )}

                {changeRequestType && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
                        <form onSubmit={submitChangeRequest} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
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

                {/* Back button */}
                <Link
                    href={route('quotations.index')}
                    className="flex items-center gap-2 text-sm font-semibold text-surface-500 hover:text-brand-600 mb-5 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Daftar Quotation
                </Link>

                {quotationStructure.root && (
                    <div className="mb-5 rounded-xl border border-brand-100 bg-brand-50/50 p-1.5 shadow-sm">
                        <div className="flex items-center gap-1 overflow-x-auto">
                            <Link
                                href={route('quotations.show', quotationStructure.root.id)}
                                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                                    quotationStructure.current_id === quotationStructure.root.id
                                        ? 'bg-brand-600 text-white shadow-sm'
                                        : 'text-brand-700 hover:bg-white'
                                }`}
                            >
                                Quotation Utama · {quotationStructure.root.id}
                            </Link>
                            {quotationStructure.children.map((child) => (
                                <Link
                                    key={child.id}
                                    href={route('quotations.show', child.id)}
                                    className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                                        quotationStructure.current_id === child.id
                                            ? 'bg-brand-600 text-white shadow-sm'
                                            : 'text-surface-700 hover:bg-white'
                                    }`}
                                >
                                    Sub Quotation · {child.id}
                                </Link>
                            ))}
                            {quotationStructure.children.length === 0 && (
                                <span className="px-3 py-2 text-xs text-surface-500">Belum ada sub quotation</span>
                            )}
                        </div>
                    </div>
                )}

                {/* 1. Header & Info Grid Card */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6 overflow-hidden">
                    {/* Main Header Bar */}
                    <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-100">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-bold text-surface-900 font-mono tracking-tight">{quotation.id}</h2>
                                {statusBadge(quotation.status)}
                            </div>
                            <p className="text-xs text-surface-400">Dibuat pada {formatDateStr(quotation.date || quotation.created_at)}</p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            {canManage && (
                                <>
                                    {(quotation.status === 'approved' || quotation.status === 'sent') && quotation.sales_orders?.length > 0 && (
                                        <>
                                            <button type="button" onClick={() => { setChangeRequestType('revision'); setChangeRequestReason(''); }} className="px-3 py-2 text-xs font-semibold border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-50">Ajukan Revisi</button>
                                            <button type="button" onClick={() => { setChangeRequestType('cancellation'); setChangeRequestReason(''); }} className="px-3 py-2 text-xs font-semibold border border-red-200 rounded-lg text-red-600 hover:bg-red-50">Ajukan Cancel PO</button>
                                        </>
                                    )}
                                    {quotation.status === 'cancelled' && (
                                        <button type="button" onClick={createFromCancelled} className="px-3 py-2 text-xs font-semibold border border-brand-200 rounded-lg text-brand-700 hover:bg-brand-50">Buat Penawaran Baru</button>
                                    )}
                                    {quotation.status !== 'approved' && (
                                        <Link
                                            href={route('quotations.edit', quotation.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit Quotation
                                        </Link>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowDuplicateConfirm(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-brand-200 rounded-lg text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Duplikat Quotation
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(quotation)}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Hapus
                                    </button>
                                </>
                            )}
                            <div className="relative flex items-stretch">
                                <button
                                    onClick={() => handlePrint(quotation)}
                                    className="flex items-center gap-2 rounded-l-lg bg-brand-500 px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-600 cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    Cetak / PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPrintMenu(prev => !prev)}
                                    className="rounded-r-lg border-l border-white/30 bg-brand-500 px-2 text-white shadow-sm transition-all hover:bg-brand-600 cursor-pointer"
                                    aria-label="Pilih dokumen PDF"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                {showPrintMenu && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-surface-200 bg-white p-1.5 shadow-xl">
                                        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-surface-400">Pilih dokumen untuk dicetak</div>
                                        {printOptions.length > 0 ? printOptions.map(({ quotation: documentQuotation, label }) => (
                                            <button
                                                type="button"
                                                key={documentQuotation.id}
                                                onClick={() => handlePrint(documentQuotation)}
                                                className={`w-full rounded-lg px-3 py-2.5 text-left text-xs transition-colors hover:bg-brand-50 ${documentQuotation.id === quotation.id ? 'bg-brand-50 font-bold text-brand-700' : 'text-surface-700'}`}
                                            >
                                                <span className="block font-mono font-bold">{documentQuotation.id}</span>
                                                <span className="mt-0.5 block text-[11px] text-surface-500">{label}</span>
                                            </button>
                                        )) : (
                                            <button type="button" onClick={() => handlePrint(quotation)} className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold text-surface-700 hover:bg-brand-50">
                                                Cetak dokumen ini
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* PDF Settings Sub-Bar */}
                    <div className="px-6 py-2.5 bg-surface-50/80 border-b border-surface-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-6 flex-wrap">
                            <label className="flex items-center gap-2 font-medium text-surface-700 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={withImage}
                                    onChange={e => setWithImage(e.target.checked)}
                                    className="w-4 h-4 rounded text-brand-500 accent-brand-500 cursor-pointer"
                                />
                                <span>Tampilkan Gambar Produk</span>
                            </label>
                            <div className="flex items-center gap-2 font-medium text-surface-700 select-none">
                                <span className="text-surface-500">Bahasa PDF:</span>
                                <select
                                    value={pdfLanguage}
                                    onChange={e => setPdfLanguage(e.target.value)}
                                    className="bg-white border border-surface-200 text-surface-800 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-brand-500 cursor-pointer font-medium"
                                >
                                    <option value="id">Bahasa Indonesia</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>
                        <span className="text-[11px] text-surface-400 italic hidden md:inline">Pengaturan cetak PDF</span>
                    </div>

                    {/* 4 Column Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-surface-100">
                        <div className="p-5">
                            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Customer</div>
                            <div className="text-sm font-bold text-surface-900 mb-1">{quotation.customer?.name || '-'}</div>
                            <div className="text-xs text-surface-600">PIC: {picObj?.name || '-'}</div>
                            {(picObj?.phone || picObj?.email) && (
                                <div className="text-[11px] text-surface-400 mt-1">
                                    {picObj.phone || ''}{picObj.phone && picObj.email ? ' · ' : ''}{picObj.email || ''}
                                </div>
                            )}
                        </div>

                        <div className="p-5">
                            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Brand</div>
                            <div className="flex flex-wrap gap-1.5">
                                {itemBrands.length > 0 ? (
                                    itemBrands.map((b, idx) => (
                                        <span key={idx} className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(b)}`}>{b}</span>
                                    ))
                                ) : (
                                    <span className="text-xs text-surface-400">—</span>
                                )}
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Sales</div>
                            <div className="text-sm font-bold text-surface-900">{quotation.creator?.name || 'Sales'}</div>
                            <div className="text-xs text-surface-500">PT. Alfa Cipta Teknologi Virtual</div>
                        </div>

                        <div className="p-5">
                            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2">Masa Berlaku</div>
                            <div className="text-xs font-bold text-surface-800">
                                {formatDateStr(quotation.date || quotation.created_at)} — {formatDateStr(quotation.expired)}
                            </div>
                            {expiredLabel && (
                                <div className={`text-xs font-semibold mt-1 ${expiredColor}`}>{expiredLabel}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Items Table Card */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm mb-6 overflow-hidden">
                    <div className="px-6 py-4 border-b border-surface-100">
                        <h3 className="text-sm font-bold text-surface-800">Item Produk</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-50 border-b border-surface-200">
                                    <th className="py-3 px-4 text-center text-xs font-bold text-surface-500 uppercase w-12">No</th>
                                    <th className="py-3 px-4 text-left text-xs font-bold text-surface-500 uppercase">Produk</th>
                                    <th className="py-3 px-4 text-left text-xs font-bold text-surface-500 uppercase w-28">Brand</th>
                                    <th className="py-3 px-4 text-center text-xs font-bold text-surface-500 uppercase w-20">QTY</th>
                                    <th className="py-3 px-4 text-right text-xs font-bold text-surface-500 uppercase w-36">Harga Satuan</th>
                                    <th className="py-3 px-4 text-right text-xs font-bold text-surface-500 uppercase w-40">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-100">
                                {items.map((item, idx) => {
                                    const prod = item.product || {};
                                    const name = prod.name || item.name || item.product_name || '-';
                                    const sku = prod.sku || item.sku || '';
                                    const brandName = formatBrandName(item.brand || prod.brand);
                                    return (
                                        <tr key={idx} className="hover:bg-surface-50/50 transition-colors">
                                            <td className="py-3.5 px-4 text-xs font-bold text-surface-400 text-center">1.{idx + 1}</td>
                                            <td className="py-3.5 px-4">
                                                <div className="text-sm font-semibold text-surface-900">{name}</div>
                                                {sku && <div className="text-xs font-mono text-surface-400">{sku}</div>}
                                                {item.description && <div className="text-xs text-surface-500 mt-0.5">{item.description}</div>}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {brandName ? (
                                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${brandClasses(brandName)}`}>{brandName}</span>
                                                ) : (
                                                    <span className="text-xs text-surface-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs font-bold text-center text-surface-700">{item.qty}</td>
                                            <td className="py-3.5 px-4 text-xs text-right font-mono text-surface-700">{formatCurrency(item.price)}</td>
                                            <td className="py-3.5 px-4 text-xs font-extrabold text-right text-surface-900">{formatCurrency((item.qty || 1) * (item.price || 0))}</td>
                                        </tr>
                                    );
                                })}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-xs text-surface-400">
                                            Belum ada item produk dalam quotation ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Calculation Summary Footer */}
                    <div className="border-t border-surface-200 px-6 py-4 bg-surface-50/50">
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-8 text-xs text-surface-600">
                                <span className="w-32 text-right">Subtotal</span>
                                <span className="font-bold text-surface-800 w-36 text-right">{formatCurrency(subtotal)}</span>
                            </div>
                            {calcTax && showTax && (
                                <div className="flex items-center gap-8 text-xs text-surface-600">
                                    <span className="w-32 text-right">PPN ({Math.round((ppnRate || 0.11) * 100)}%)</span>
                                    <span className="font-bold text-surface-800 w-36 text-right">{formatCurrency(ppn)}</span>
                                </div>
                            )}
                            <div className="w-44 h-px bg-surface-200 ml-auto" />
                            <div className="flex items-center gap-8 text-sm pt-1">
                                <span className="font-bold text-surface-800 w-32 text-right">Grand Total</span>
                                <span className="font-extrabold text-brand-700 w-36 text-right text-base">{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {quotation.purchase_orders?.length > 0 && (
                    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-surface-800 flex items-center gap-2"><Layers className="w-4 h-4 text-brand-600" /> Daftar Purchase Order</h3>
                                <p className="text-xs text-surface-400 mt-1">Setiap PO memiliki dokumen dan item sendiri; data PO tidak saling menimpa.</p>
                            </div>
                            <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-2.5 py-1">{quotation.purchase_orders.length} PO</span>
                        </div>
                        <div className="space-y-2">
                            {quotation.purchase_orders.map((po, index) => (
                                <div key={po.id} className="flex items-center gap-3 rounded-xl border border-surface-100 bg-surface-50/60 px-4 py-3">
                                    <span className="w-7 h-7 rounded-lg bg-white border border-surface-200 flex items-center justify-center text-xs font-bold text-surface-500">{index + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-bold text-surface-800">{po.po_number}</div>
                                        <div className="text-xs text-surface-500 mt-0.5">{formatDateStr(po.po_date)} · {po.quotation_item_ids?.length || 0} item</div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1">{po.status}</span>
                                    {po.document_path && <a href={`/storage/${po.document_path}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-600 hover:text-brand-700">Dokumen</a>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(quotation.parent_quotation || quotation.revisions?.length > 0 || quotation.change_requests?.length > 0 || quotation.timeline?.length > 0) && (
                    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-bold text-surface-800">Sub Quotation, Revisi & Persetujuan</h3>
                                <p className="mt-1 text-xs text-surface-400">Riwayat lengkap tersedia dalam timeline.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTimeline(true)}
                                className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100"
                            >
                                Lihat Timeline
                            </button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-surface-600">
                            <span className="rounded-full bg-surface-50 px-2.5 py-1">{quotation.revisions?.length || 0} sub/revisi</span>
                            <span className="rounded-full bg-surface-50 px-2.5 py-1">{quotation.change_requests?.length || 0} pengajuan</span>
                            <span className="rounded-full bg-surface-50 px-2.5 py-1">{quotation.timeline?.length || 0} aktivitas</span>
                        </div>
                    </div>
                )}

                {showTimeline && ReactDOM.createPortal(
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-surface-900/60 p-4 backdrop-blur-sm">
                        <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
                                <div>
                                    <h3 className="text-base font-bold text-surface-900">Timeline Quotation</h3>
                                    <p className="mt-1 text-xs text-surface-500">Riwayat sub quotation, revisi, persetujuan, dan aktivitas.</p>
                                </div>
                                <button type="button" onClick={() => setShowTimeline(false)} className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700" aria-label="Tutup timeline">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="space-y-3 overflow-y-auto p-6 text-xs">
                                {quotation.parent_quotation && <div className="rounded-lg bg-surface-50 p-3">Dibuat dari quotation sebelumnya: <Link className="font-bold text-brand-600" href={route('quotations.show', quotation.parent_quotation.id)}>{quotation.parent_quotation.id}</Link></div>}
                                {quotation.revisions?.map(r => <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-50 p-3"><span>{r.relation_type === 'split' ? 'Sub quotation:' : 'Quotation revisi:'} <Link className="font-bold text-brand-600" href={route('quotations.show', r.id)}>{r.id}</Link> · {r.status}</span>{r.relation_type === 'split' && <span className="rounded-full bg-brand-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">Split PO</span>}</div>)}
                                {quotation.change_requests?.map(cr => (
                                    <div key={cr.id} className="border-l-4 border-brand-300 py-1 pl-3">
                                        <div className="font-semibold">{cr.type === 'revision' ? 'Pengajuan revisi' : 'Pengajuan pembatalan'} · <span className="uppercase">{cr.status}</span></div>
                                        <div className="text-surface-500">{cr.reason}</div>
                                        {cr.manager_comment && <div className="mt-1 text-surface-600">Catatan manager: {cr.manager_comment}</div>}
                                    </div>
                                ))}
                                {quotation.timeline?.map(event => (
                                    <div key={event.id} className="border-l-4 border-surface-200 py-1 pl-3">
                                        <div className="font-semibold text-surface-800">{event.description}</div>
                                        <div className="text-surface-400">{event.user?.name || 'Sistem'} · {event.created_at ? new Date(event.created_at).toLocaleString('id-ID') : '-'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* 3. Syarat & Ketentuan Card */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6 mb-8">
                    <h3 className="text-sm font-bold text-surface-800 mb-3">Syarat & Ketentuan</h3>
                    <ol className="list-decimal list-inside text-xs text-surface-600 space-y-2 font-sans leading-relaxed">
                        {termsList.map((term, idx) => (
                            <li key={idx} className={term.toLowerCase().includes('ready stock') ? 'font-bold text-surface-900' : ''}>
                                {term}
                            </li>
                        ))}
                    </ol>

                    {bankAccount && (
                        <div className="mt-5 pt-4 border-t border-surface-100 flex items-center gap-3">
                            <CreditCard className="w-4 h-4 text-brand-500" />
                            <div className="text-xs">
                                <span className="font-semibold text-surface-500">Nomor Rekening Resmi: </span>
                                <span className="font-bold text-surface-800">
                                    {bankAccount.bank_name} : {bankAccount.account_number} — {bankAccount.account_name}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk PO metadata modal */}
            {showBulkPoModal && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-surface-900/60 p-4 backdrop-blur-sm">
                    <form onSubmit={submitBulkPo} className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-surface-100 px-6 py-5">
                            <div>
                                <h3 className="text-base font-bold text-surface-900">Input PO Utama & Sub Quotation</h3>
                                <p className="mt-1 text-xs text-surface-500">Satu kali simpan untuk seluruh unit. Setiap unit tetap memiliki nomor, tanggal, status, dan dokumen PO masing-masing.</p>
                            </div>
                            <button type="button" onClick={() => setShowBulkPoModal(false)} disabled={isSavingBulkPo} className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 hover:text-surface-700" aria-label="Tutup"><X className="h-5 w-5" /></button>
                        </div>
                        {Object.keys(bulkPoErrors).length > 0 && <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{bulkPoErrors.entries || 'Periksa kembali semua data PO dan dokumen yang wajib diisi.'}</div>}
                        <div className="space-y-4 overflow-y-auto p-6">
                            {bulkPoRows.map((row, index) => {
                                const documentUrl = row.po_document_path ? (row.po_document_path.startsWith('http') ? row.po_document_path : `/storage/${row.po_document_path}`) : null;
                                return (
                                    <div key={row.id} className="rounded-xl border border-surface-200 bg-surface-50/50 p-4">
                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                            <div><div className="text-sm font-bold text-surface-900">{row.label} · <span className="font-mono text-brand-700">{row.id}</span></div><div className="mt-0.5 text-xs text-surface-500">{row.items_count || 0} item · {formatCurrency(row.grand_total || 0)}</div></div>
                                            {row.po_status && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Data PO tersimpan</span>}
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                            <label className="text-xs font-semibold text-surface-700">Status PO <span className="text-red-500">*</span><select value={row.status} onChange={(e) => updateBulkPoRow(row.id, 'status', e.target.value)} className="mt-1.5 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-normal text-surface-800 focus:border-brand-500 focus:ring-brand-500"><option value="Diterima">Diterima</option><option value="Dibatalkan">Dibatalkan</option></select></label>
                                            <label className="text-xs font-semibold text-surface-700">Nomor PO <span className="text-red-500">*</span><input value={row.po_number} onChange={(e) => updateBulkPoRow(row.id, 'po_number', e.target.value)} className="mt-1.5 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-normal text-surface-800 focus:border-brand-500 focus:ring-brand-500" placeholder="Nomor PO customer" required /></label>
                                            <label className="text-xs font-semibold text-surface-700">Tanggal PO <span className="text-red-500">*</span><input type="date" value={row.po_date} onChange={(e) => updateBulkPoRow(row.id, 'po_date', e.target.value)} className="mt-1.5 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-normal text-surface-800 focus:border-brand-500 focus:ring-brand-500" required /></label>
                                            <label className="text-xs font-semibold text-surface-700">Dokumen PO <span className="text-red-500">*</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => updateBulkPoRow(row.id, 'po_document', e.target.files?.[0] || null)} className="mt-1.5 block w-full rounded-lg border border-surface-200 bg-white px-2 py-1.5 text-xs font-normal text-surface-600 file:mr-2 file:rounded-md file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-brand-700" required={!row.po_document_path} />{documentUrl && !row.po_document && <a href={documentUrl} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] font-semibold text-brand-700 hover:underline">Lihat dokumen tersimpan</a>}</label>
                                        </div>
                                        {bulkPoErrors[`entries.${index}.po_document`] && <div className="mt-2 text-xs text-red-600">{bulkPoErrors[`entries.${index}.po_document`]}</div>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-surface-100 bg-surface-50 px-6 py-4"><button type="button" onClick={() => setShowBulkPoModal(false)} disabled={isSavingBulkPo} className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-xs font-semibold text-surface-700 hover:bg-surface-100 disabled:opacity-50">Batal</button><button type="submit" disabled={isSavingBulkPo} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">{isSavingBulkPo ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{isSavingBulkPo ? 'Menyimpan...' : 'Simpan Semua & Generate SO'}</button></div>
                    </form>
                </div>,
                document.body
            )}

            {/* Duplicate Confirmation Modal */}
            {showDuplicateConfirm && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-scale-in">
                        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100 shadow-sm">
                            <Copy className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-surface-900 mb-1">Duplikat Quotation</h3>
                        <p className="text-xs text-surface-500 mb-6 leading-relaxed">
                            Duplicate quotation "{quotation.id}" ini? Semua data dan item akan disalin menjadi quotation baru dengan nomor quotation baru.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button type="button" onClick={() => setShowDuplicateConfirm(false)} disabled={isDuplicating}
                                className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer disabled:opacity-50">
                                Batal
                            </button>
                            <button type="button" onClick={handleDuplicate} disabled={isDuplicating}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50">
                                {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                <span>{isDuplicating ? 'Menduplikasi...' : 'Ya, Duplikat'}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center animate-scale-in">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-surface-900 mb-1">Konfirmasi Hapus Quotation</h3>
                        <p className="text-xs text-surface-500 mb-6 leading-relaxed">
                            Apakah Anda yakin ingin menghapus quotation "{quotation.id}"? Data akan dipindahkan ke Sampah.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}
                                className="px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer disabled:opacity-50">
                                Batal
                            </button>
                            <button type="button" onClick={handleExecuteDelete} disabled={isDeleting}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50">
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AuthenticatedLayout>
    );
}
