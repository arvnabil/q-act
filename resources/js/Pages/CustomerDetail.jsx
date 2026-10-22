import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    ArrowLeft, MapPin, Users, FileText, ShoppingCart,
    CheckCircle2, AlertTriangle, Phone, Mail, Star,
    Building2, TrendingUp, ChevronRight
} from 'lucide-react';
import { formatMoney } from '@/utils/money';

const formatCurrency = (v) => formatMoney(v);

const formatDate = (str) => {
    if (!str) return '-';
    try {
        const d = new Date(str);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return str; }
};

const quotationStatusConfig = (status) => {
    switch (status) {
        case 'approved': return { label: 'PO Diterima', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        case 'sent':     return { label: 'Sent',        cls: 'bg-blue-50 text-blue-700 border-blue-200' };
        case 'created':
        case 'draft':    return { label: 'Draft',       cls: 'bg-surface-100 text-surface-600 border-surface-200' };
        case 'rejected': return { label: 'Rejected',    cls: 'bg-red-50 text-red-700 border-red-200' };
        case 'expired':  return { label: 'Expired',     cls: 'bg-amber-50 text-amber-700 border-amber-200' };
        default:         return { label: status || '-', cls: 'bg-surface-100 text-surface-600 border-surface-200' };
    }
};

const soStatusConfig = (status) => {
    if (status === 'Ditambahkan Finance') return { cls: 'bg-emerald-100 text-emerald-700' };
    return { cls: 'bg-blue-100 text-blue-700' };
};

export default function CustomerDetail({ customer, quotations = [], salesOrders = [] }) {
    const [activeTab, setActiveTab] = useState('quotations');
    const [search, setSearch] = useState('');

    const totalQuotValue  = useMemo(() => quotations.reduce((s, q) => s + (q.grand_total || 0), 0), [quotations]);
    const totalPoValue    = useMemo(() => quotations.filter(q => q.status === 'approved').reduce((s, q) => s + (q.grand_total || 0), 0), [quotations]);
    const totalSoValue    = useMemo(() => salesOrders.reduce((s, so) => s + (so.grand_total || 0), 0), [salesOrders]);
    const approvedCount   = useMemo(() => quotations.filter(q => q.status === 'approved').length, [quotations]);

    const filteredQuotations = useMemo(() => {
        if (!search.trim()) return quotations;
        const s = search.toLowerCase().trim();
        return quotations.filter(q =>
            q.id?.toLowerCase().includes(s) ||
            q.status?.toLowerCase().includes(s) ||
            q.sales?.name?.toLowerCase().includes(s) ||
            formatDate(q.date).toLowerCase().includes(s) ||
            (q.grand_total != null && formatCurrency(q.grand_total).toLowerCase().includes(s))
        );
    }, [quotations, search]);

    const filteredSalesOrders = useMemo(() => {
        if (!search.trim()) return salesOrders;
        const s = search.toLowerCase().trim();
        return salesOrders.filter(so =>
            so.id?.toLowerCase().includes(s) ||
            so.quotation_id?.toLowerCase().includes(s) ||
            so.status?.toLowerCase().includes(s) ||
            so.po_number?.toLowerCase().includes(s) ||
            so.sales?.name?.toLowerCase().includes(s) ||
            formatDate(so.date).toLowerCase().includes(s) ||
            (so.grand_total != null && formatCurrency(so.grand_total).toLowerCase().includes(s))
        );
    }, [salesOrders, search]);

    const primaryPic = customer.pics?.find(p => p.is_primary) || customer.pics?.[0];

    return (
        <AuthenticatedLayout>
            <Head title={`Customer – ${customer.name}`} />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* ── Breadcrumb ─────────────────────────────────────────── */}
                <div className="flex items-center gap-2 text-sm text-surface-500">
                    <Link href={route('customers.index')} className="hover:text-brand-600 transition-colors flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> Daftar Customer
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
                    <span className="text-surface-700 font-semibold">{customer.name}</span>
                </div>

                {/* ── Customer Header Card ───────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
                    {/* Gradient banner */}
                    <div className="h-20 bg-gradient-to-r from-brand-600 via-brand-500 to-teal-500" />
                    <div className="px-6 pb-6">
                        {/* Avatar + name */}
                        <div className="flex items-end gap-4 -mt-8 mb-5">
                            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center shrink-0">
                                <Building2 className="w-8 h-8 text-brand-500" />
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                                <h1 className="text-xl font-extrabold text-surface-900 truncate">{customer.name}</h1>
                                <div className="text-xs text-surface-500 font-mono">{customer.id}</div>
                            </div>
                        </div>

                        {/* Info + PIC row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Address */}
                            <div className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                <div>
                                    <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-0.5">Alamat</div>
                                    <div className="text-sm text-surface-700">{customer.address || '-'}</div>
                                </div>
                            </div>

                            {/* Primary PIC */}
                            {primaryPic && (
                                <div className="flex items-start gap-2.5">
                                    <Users className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                                            PIC Utama <Star className="w-3 h-3 text-amber-400" />
                                        </div>
                                        <div className="text-sm font-semibold text-surface-800">{primaryPic.name}</div>
                                        {primaryPic.phone && (
                                            <a href={`tel:${primaryPic.phone}`} className="text-xs text-surface-500 flex items-center gap-1 hover:text-brand-600">
                                                <Phone className="w-3 h-3" />{primaryPic.phone}
                                            </a>
                                        )}
                                        {primaryPic.email && (
                                            <a href={`mailto:${primaryPic.email}`} className="text-xs text-surface-500 flex items-center gap-1 hover:text-brand-600">
                                                <Mail className="w-3 h-3" />{primaryPic.email}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Quotation stats */}
                            <div className="flex items-start gap-2.5">
                                <FileText className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                                <div>
                                    <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-0.5">Total Quotation</div>
                                    <div className="text-sm font-bold text-surface-900">{quotations.length} Quotation</div>
                                    <div className="text-xs text-surface-500">{approvedCount} PO Diterima</div>
                                </div>
                            </div>

                            {/* SO stats */}
                            <div className="flex items-start gap-2.5">
                                <ShoppingCart className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <div>
                                    <div className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-0.5">Total Sales Order</div>
                                    <div className="text-sm font-bold text-surface-900">{salesOrders.length} SO</div>
                                    <div className="text-xs text-emerald-600 font-medium">{formatCurrency(totalSoValue)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Summary KPI Cards ─────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Nilai Quotation', value: formatCurrency(totalQuotValue), icon: FileText, iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
                        { label: 'Total Nilai PO', value: formatCurrency(totalPoValue), icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
                        { label: 'Total Nilai SO', value: formatCurrency(totalSoValue), icon: ShoppingCart, iconBg: 'bg-teal-50', iconColor: 'text-teal-500' },
                        { label: 'Konversi PO', value: quotations.length > 0 ? `${Math.round((approvedCount / quotations.length) * 100)}%` : '-', icon: TrendingUp, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
                    ].map((kpi, i) => (
                        <div key={i} className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                                <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs text-surface-500 leading-tight">{kpi.label}</div>
                                <div className="text-base font-extrabold text-surface-900 truncate">{kpi.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Tabs + Table ──────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
                    {/* Tab bar */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-0 gap-4 flex-wrap border-b border-surface-100">
                        <div className="flex gap-0.5">
                            {[
                                { key: 'quotations',   label: 'Quotation',    count: quotations.length,   icon: FileText },
                                { key: 'salesOrders',  label: 'Sales Order',  count: salesOrders.length,  icon: ShoppingCart },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => { setActiveTab(tab.key); setSearch(''); }}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                                        activeTab === tab.key
                                            ? 'border-brand-500 text-brand-700'
                                            : 'border-transparent text-surface-500 hover:text-surface-800'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        activeTab === tab.key
                                            ? 'bg-brand-100 text-brand-700'
                                            : 'bg-surface-100 text-surface-500'
                                    }`}>{tab.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative mb-1">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari..."
                                className="pl-8 pr-3 py-1.5 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 w-48"
                            />
                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* ── Quotations Tab ────────────────────────────────── */}
                    {activeTab === 'quotations' && (
                        filteredQuotations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-surface-400">
                                <FileText className="w-10 h-10 mb-2 text-surface-300" />
                                <span className="text-sm font-semibold text-surface-500">{search ? 'Tidak ditemukan.' : 'Belum ada quotation.'}</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-50 border-b border-surface-200">
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">No. Quotation</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">Tanggal</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">Sales</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">Status</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">No. PO</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide text-right">Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {filteredQuotations.map(q => {
                                            const badge = quotationStatusConfig(q.status);
                                            return (
                                                <tr key={q.id} className="hover:bg-surface-50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <Link
                                                            href={route('quotations.show', q.id)}
                                                            className="text-sm font-bold text-brand-700 font-mono hover:underline"
                                                        >
                                                            {q.id}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-surface-600">{formatDate(q.date)}</td>
                                                    <td className="py-3 px-4 text-sm text-surface-700">{q.sales?.name || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                                                            {badge.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {q.po_number ? (
                                                            <div>
                                                                <div className="text-xs font-mono text-surface-700">{q.po_number}</div>
                                                                {q.po_date && <div className="text-[10px] text-surface-400">{formatDate(q.po_date)}</div>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-surface-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-sm font-extrabold text-surface-900">
                                                        {formatCurrency(q.grand_total)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-surface-50 border-t border-surface-200">
                                            <td colSpan={5} className="py-2.5 px-4 text-xs font-bold text-surface-500">
                                                {filteredQuotations.length} quotation
                                            </td>
                                            <td className="py-2.5 px-4 text-right text-sm font-extrabold text-surface-900">
                                                {formatCurrency(filteredQuotations.reduce((s, q) => s + (q.grand_total || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )
                    )}

                    {/* ── Sales Orders Tab ──────────────────────────────── */}
                    {activeTab === 'salesOrders' && (
                        filteredSalesOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-surface-400">
                                <ShoppingCart className="w-10 h-10 mb-2 text-surface-300" />
                                <span className="text-sm font-semibold text-surface-500">{search ? 'Tidak ditemukan.' : 'Belum ada sales order.'}</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-50 border-b border-surface-200">
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">No. SO</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">No. Quotation</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">Tanggal</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">Sales</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">Status PO</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide">Status SO</th>
                                            <th className="py-3 px-4 text-xs font-bold text-surface-500 uppercase tracking-wide text-right">Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {filteredSalesOrders.map(so => {
                                            const soBadge = soStatusConfig(so.status);
                                            const hasPo = so.has_po || (so.po_status && so.po_status.trim()) || so.po_number || so.po_date;
                                            return (
                                                <tr key={so.id} className="hover:bg-surface-50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <Link
                                                            href={route('sales-orders.show', so.id)}
                                                            className="text-sm font-bold text-brand-700 font-mono hover:underline"
                                                        >
                                                            {so.id}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {so.quotation_id ? (
                                                            <Link
                                                                href={route('quotations.show', so.quotation_id)}
                                                                className="text-xs font-mono text-surface-600 hover:text-brand-600 hover:underline"
                                                            >
                                                                {so.quotation_id}
                                                            </Link>
                                                        ) : <span className="text-xs text-surface-400">-</span>}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-surface-600">{formatDate(so.date)}</td>
                                                    <td className="py-3 px-4 text-sm text-surface-700">{so.sales?.name || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        {hasPo ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    {so.po_status || 'Diterima'}
                                                                </span>
                                                                {so.po_number && <span className="text-[10px] font-mono text-surface-600">No: {so.po_number}</span>}
                                                                {so.po_date && <span className="text-[10px] text-surface-400">{formatDate(so.po_date)}</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                                Belum Ada PO
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${soBadge.cls}`}>
                                                            {so.status || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-sm font-extrabold text-surface-900">
                                                        {formatCurrency(so.grand_total)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-surface-50 border-t border-surface-200">
                                            <td colSpan={6} className="py-2.5 px-4 text-xs font-bold text-surface-500">
                                                {filteredSalesOrders.length} sales order
                                            </td>
                                            <td className="py-2.5 px-4 text-right text-sm font-extrabold text-surface-900">
                                                {formatCurrency(filteredSalesOrders.reduce((s, so) => s + (so.grand_total || 0), 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )
                    )}

                    {/* ── PIC List (always visible at bottom) ───────────── */}
                    {customer.pics?.length > 1 && (
                        <div className="border-t border-surface-100 px-5 py-4">
                            <div className="text-xs font-bold text-surface-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" /> Semua PIC ({customer.pics.length})
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {customer.pics.map(pic => (
                                    <div key={pic.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
                                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                                            {pic.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-surface-800 flex items-center gap-1">
                                                {pic.name}
                                                {pic.is_primary && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                                            </div>
                                            {pic.phone && <div className="text-xs text-surface-500">{pic.phone}</div>}
                                            {pic.email && <div className="text-xs text-surface-400 truncate">{pic.email}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
