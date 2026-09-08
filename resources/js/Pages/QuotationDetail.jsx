import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Edit, Download, CheckCircle2, Clock, XCircle,
    AlertCircle, FileText, CreditCard, Loader2, Trash2, AlertTriangle, Copy
} from 'lucide-react';
import { printQuotation } from '@/utils/printQuotation';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const formatCurrency = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

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
        default: return <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-surface-100 text-surface-600 border border-surface-200 uppercase tracking-wide"><FileText className="w-3.5 h-3.5" /> Created</span>;
    }
};

export default function QuotationDetail({ quotation, bankAccounts, currentUser }) {
    const { flash } = usePage().props;
    const [withImage, setWithImage] = useState(false);
    const [pdfLanguage, setPdfLanguage] = useState('id');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);

    if (!quotation) return null;

    const items = quotation.items || [];
    const subtotal = quotation.subtotal || items.reduce((sum, i) => sum + ((i.qty || 0) * (i.price || 0)), 0);
    const ppnRate = quotation.ppn_rate || 0.11;
    const calcTax = quotation.calc_tax !== false;
    const showTax = quotation.show_tax !== false;
    const ppn = (calcTax && showTax) ? (quotation.tax_amount || subtotal * ppnRate) : 0;
    const grandTotal = quotation.grand_total || (subtotal + ppn);

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

    const handlePrint = () => {
        const enrichedQuotation = {
            ...quotation,
            creator: {
                ...(quotation.creator || {}),
                ...(currentUser?.id === quotation.sales_id ? {
                    name: currentUser.name,
                    email: currentUser.email,
                } : {}),
            },
        };
        printQuotation(enrichedQuotation, withImage, bankAccount, pdfLanguage);
    };

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

    const canManage = (currentUser?.spatie_role !== 'Finance' && currentUser?.role !== 'Finance');

    return (
        <AuthenticatedLayout>
            <Head title={`Quotation ${quotation.id}`} />
            <div className="animate-fade-in-up max-w-5xl">
                {flash?.message && (
                    <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl">
                        {flash.message}
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
                                    <Link
                                        href={route('quotations.edit', quotation.id)}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Quotation
                                    </Link>
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
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                Cetak / PDF
                            </button>
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
