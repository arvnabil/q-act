import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    ArrowLeft, MapPin, Users, FileText, ShoppingCart,
    CheckCircle2, AlertTriangle, Phone, Mail, Star,
    Building2, TrendingUp, ChevronRight, ExternalLink
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
        case 'approved': return { label: 'PO Diterima', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
        case 'sent':     return { label: 'Sent',        cls: 'bg-blue-100 text-blue-700 border-blue-200',         dot: 'bg-blue-500' };
        case 'created':
        case 'draft':    return { label: 'Draft',       cls: 'bg-zinc-100 text-zinc-600 border-zinc-200',          dot: 'bg-zinc-400' };
        case 'rejected': return { label: 'Rejected',    cls: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500' };
        case 'expired':  return { label: 'Expired',     cls: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500' };
        default:         return { label: status || '-', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200',          dot: 'bg-zinc-400' };
    }
};

export default function CustomerDetail({ customer, quotations = [], salesOrders = [] }) {
    const [activeTab, setActiveTab] = useState('quotations');
    const [search, setSearch] = useState('');

    const totalQuotValue = useMemo(() => quotations.reduce((s, q) => s + (q.grand_total || 0), 0), [quotations]);
    const totalPoValue   = useMemo(() => quotations.filter(q => q.status === 'approved').reduce((s, q) => s + (q.grand_total || 0), 0), [quotations]);
    const totalSoValue   = useMemo(() => salesOrders.reduce((s, so) => s + (so.grand_total || 0), 0), [salesOrders]);
    const approvedCount  = useMemo(() => quotations.filter(q => q.status === 'approved').length, [quotations]);
    const conversionPct  = quotations.length > 0 ? Math.round((approvedCount / quotations.length) * 100) : 0;

    const filteredQuotations = useMemo(() => {
        if (!search.trim()) return quotations;
        const s = search.toLowerCase();
        return quotations.filter(q =>
            q.id?.toLowerCase().includes(s) ||
            q.status?.toLowerCase().includes(s) ||
            q.sales?.name?.toLowerCase().includes(s) ||
            formatDate(q.date).toLowerCase().includes(s) ||
            formatCurrency(q.grand_total).toLowerCase().includes(s)
        );
    }, [quotations, search]);

    const filteredSalesOrders = useMemo(() => {
        if (!search.trim()) return salesOrders;
        const s = search.toLowerCase();
        return salesOrders.filter(so =>
            so.id?.toLowerCase().includes(s) ||
            so.quotation_id?.toLowerCase().includes(s) ||
            so.status?.toLowerCase().includes(s) ||
            so.po_number?.toLowerCase().includes(s) ||
            so.sales?.name?.toLowerCase().includes(s) ||
            formatDate(so.date).toLowerCase().includes(s) ||
            formatCurrency(so.grand_total).toLowerCase().includes(s)
        );
    }, [salesOrders, search]);

    const primaryPic = customer.pics?.find(p => p.is_primary) || customer.pics?.[0];

    const kpis = [
        {
            label: 'Total Nilai Quotation',
            value: formatCurrency(totalQuotValue),
            sub: `${quotations.length} quotation`,
            icon: FileText,
            gradient: 'from-blue-500 to-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            text: 'text-blue-600',
            valueColor: 'text-blue-700',
        },
        {
            label: 'Total Nilai PO',
            value: formatCurrency(totalPoValue),
            sub: `${approvedCount} disetujui`,
            icon: CheckCircle2,
            gradient: 'from-emerald-500 to-teal-500',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            text: 'text-emerald-600',
            valueColor: 'text-emerald-700',
        },
        {
            label: 'Total Nilai SO',
            value: formatCurrency(totalSoValue),
            sub: `${salesOrders.length} sales order`,
            icon: ShoppingCart,
            gradient: 'from-violet-500 to-purple-600',
            bg: 'bg-violet-50',
            border: 'border-violet-100',
            text: 'text-violet-600',
            valueColor: 'text-violet-700',
        },
        {
            label: 'Konversi PO',
            value: quotations.length > 0 ? `${conversionPct}%` : '-',
            sub: conversionPct >= 50 ? 'Sangat baik 🎯' : conversionPct >= 25 ? 'Cukup baik' : 'Perlu ditingkatkan',
            icon: TrendingUp,
            gradient: 'from-amber-400 to-orange-500',
            bg: 'bg-amber-50',
            border: 'border-amber-100',
            text: 'text-amber-600',
            valueColor: 'text-amber-700',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={`Customer – ${customer.name}`} />

            <div className="min-h-screen bg-surface-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                    {/* ── Breadcrumb ─────────────────────────────────────── */}
                    <div className="flex items-center gap-2 text-sm">
                        <Link
                            href={route('customers.index')}
                            className="text-surface-500 hover:text-brand-600 transition-colors flex items-center gap-1.5 font-medium"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Daftar Customer
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 text-surface-300" />
                        <span className="text-surface-800 font-semibold">{customer.name}</span>
                    </div>

                    {/* ── Hero Header ────────────────────────────────────── */}
                    <div className="relative rounded-2xl overflow-hidden shadow-lg">
                        {/* Gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488] via-[#0891b2] to-[#1d4ed8]" />
                        {/* Decorative blobs */}
                        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 left-1/3 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

                        <div className="relative px-6 py-8 sm:px-10">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                                {/* Icon */}
                                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
                                    <Building2 className="w-8 h-8 text-white" />
                                </div>

                                {/* Name + ID */}
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                                        {customer.name}
                                    </h1>
                                    <div className="mt-1 flex items-center gap-3 flex-wrap">
                                        <span className="text-sm text-white/60 font-mono">{customer.id}</span>
                                        {customer.address && (
                                            <span className="flex items-center gap-1 text-xs text-white/70">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {customer.address.length > 60 ? customer.address.slice(0, 60) + '…' : customer.address}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* PIC badge */}
                                {primaryPic && (
                                    <div className="shrink-0 bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-4 py-3">
                                        <div className="text-[10px] text-white/60 font-semibold uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <Star className="w-3 h-3 text-amber-300" /> PIC Utama
                                        </div>
                                        <div className="text-sm font-bold text-white">{primaryPic.name}</div>
                                        {primaryPic.phone && (
                                            <div className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3" /> {primaryPic.phone}
                                            </div>
                                        )}
                                        {primaryPic.email && (
                                            <div className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                                                <Mail className="w-3 h-3" /> {primaryPic.email}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── KPI Cards ──────────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {kpis.map((kpi, i) => (
                            <div
                                key={i}
                                className={`bg-white rounded-2xl border ${kpi.border} p-5 shadow-sm hover:shadow-md transition-all duration-200 group`}
                            >
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                                    <kpi.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className={`text-lg font-extrabold leading-tight ${kpi.valueColor}`}>
                                    {kpi.value}
                                </div>
                                <div className="text-xs font-semibold text-surface-500 mt-0.5">{kpi.label}</div>
                                <div className={`text-[11px] mt-1 ${kpi.text} font-medium`}>{kpi.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Main Tab Card ──────────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">

                        {/* Tab header */}
                        <div className="flex items-center justify-between px-5 pt-1 border-b border-surface-100 flex-wrap gap-2">
                            <div className="flex">
                                {[
                                    { key: 'quotations',  label: 'Quotation',   count: quotations.length,  icon: FileText },
                                    { key: 'salesOrders', label: 'Sales Order', count: salesOrders.length, icon: ShoppingCart },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => { setActiveTab(tab.key); setSearch(''); }}
                                        className={`relative flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-colors ${
                                            activeTab === tab.key
                                                ? 'text-brand-700'
                                                : 'text-surface-500 hover:text-surface-800'
                                        }`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            activeTab === tab.key
                                                ? 'bg-brand-100 text-brand-700'
                                                : 'bg-surface-100 text-surface-500'
                                        }`}>{tab.count}</span>
                                        {activeTab === tab.key && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative py-2">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Cari..."
                                    className="pl-8 pr-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 w-44 transition-all"
                                />
                                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* ── Quotations Table ─────────────────────────── */}
                        {activeTab === 'quotations' && (
                            filteredQuotations.length === 0 ? (
                                <EmptyState icon={FileText} text={search ? 'Tidak ditemukan.' : 'Belum ada quotation.'} />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-surface-50 border-b border-surface-100">
                                                <Th>No. Quotation</Th>
                                                <Th>Tanggal</Th>
                                                <Th>Sales</Th>
                                                <Th>Status</Th>
                                                <Th>No. PO</Th>
                                                <Th right>Nilai</Th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-50">
                                            {filteredQuotations.map(q => {
                                                const badge = quotationStatusConfig(q.status);
                                                return (
                                                    <tr key={q.id} className="hover:bg-surface-50/70 transition-colors group">
                                                        <td className="py-3.5 px-5">
                                                            <Link
                                                                href={route('quotations.show', q.id)}
                                                                className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 font-mono hover:text-brand-800 hover:underline group/link"
                                                            >
                                                                {q.id}
                                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                            </Link>
                                                        </td>
                                                        <td className="py-3.5 px-5 text-sm text-surface-600">{formatDate(q.date)}</td>
                                                        <td className="py-3.5 px-5">
                                                            <span className="text-sm text-surface-700 font-medium">{q.sales?.name || '-'}</span>
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.cls}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                                {badge.label}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            {q.po_number ? (
                                                                <div>
                                                                    <div className="text-xs font-mono font-semibold text-surface-800">{q.po_number}</div>
                                                                    {q.po_date && <div className="text-[10px] text-surface-400 mt-0.5">{formatDate(q.po_date)}</div>}
                                                                </div>
                                                            ) : <span className="text-xs text-surface-300">—</span>}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-right">
                                                            <span className="text-sm font-extrabold text-surface-900">{formatCurrency(q.grand_total)}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gradient-to-r from-surface-50 to-surface-100 border-t border-surface-200">
                                                <td colSpan={5} className="py-3 px-5 text-xs font-bold text-surface-500 uppercase tracking-wide">
                                                    {filteredQuotations.length} quotation
                                                </td>
                                                <td className="py-3 px-5 text-right text-sm font-extrabold text-surface-900">
                                                    {formatCurrency(filteredQuotations.reduce((s, q) => s + (q.grand_total || 0), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )
                        )}

                        {/* ── Sales Orders Table ───────────────────────── */}
                        {activeTab === 'salesOrders' && (
                            filteredSalesOrders.length === 0 ? (
                                <EmptyState icon={ShoppingCart} text={search ? 'Tidak ditemukan.' : 'Belum ada sales order.'} />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-surface-50 border-b border-surface-100">
                                                <Th>No. SO</Th>
                                                <Th>No. Quotation</Th>
                                                <Th>Tanggal</Th>
                                                <Th>Sales</Th>
                                                <Th>Status PO</Th>
                                                <Th>Status SO</Th>
                                                <Th right>Nilai</Th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-surface-50">
                                            {filteredSalesOrders.map(so => {
                                                const hasPo = so.has_po || (so.po_status && so.po_status.trim()) || so.po_number || so.po_date;
                                                const isFinance = so.status === 'Ditambahkan Finance';
                                                return (
                                                    <tr key={so.id} className="hover:bg-surface-50/70 transition-colors">
                                                        <td className="py-3.5 px-5">
                                                            <Link
                                                                href={route('sales-orders.show', so.id)}
                                                                className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 font-mono hover:text-brand-800 hover:underline group/link"
                                                            >
                                                                {so.id}
                                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                            </Link>
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            {so.quotation_id ? (
                                                                <Link
                                                                    href={route('quotations.show', so.quotation_id)}
                                                                    className="text-xs font-mono text-surface-600 hover:text-brand-600 hover:underline"
                                                                >
                                                                    {so.quotation_id}
                                                                </Link>
                                                            ) : <span className="text-xs text-surface-300">—</span>}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-sm text-surface-600">{formatDate(so.date)}</td>
                                                        <td className="py-3.5 px-5 text-sm font-medium text-surface-700">{so.sales?.name || '-'}</td>
                                                        <td className="py-3.5 px-5">
                                                            {hasPo ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 w-fit">
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        {so.po_status || 'Diterima'}
                                                                    </span>
                                                                    {so.po_number && <span className="text-[10px] font-mono text-surface-500 pl-0.5">No: {so.po_number}</span>}
                                                                    {so.po_date  && <span className="text-[10px] text-surface-400 pl-0.5">{formatDate(so.po_date)}</span>}
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    Belum Ada PO
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                                                                isFinance
                                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                                            }`}>
                                                                {so.status || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-5 text-right">
                                                            <span className="text-sm font-extrabold text-surface-900">{formatCurrency(so.grand_total)}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gradient-to-r from-surface-50 to-surface-100 border-t border-surface-200">
                                                <td colSpan={6} className="py-3 px-5 text-xs font-bold text-surface-500 uppercase tracking-wide">
                                                    {filteredSalesOrders.length} sales order
                                                </td>
                                                <td className="py-3 px-5 text-right text-sm font-extrabold text-surface-900">
                                                    {formatCurrency(filteredSalesOrders.reduce((s, so) => s + (so.grand_total || 0), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )
                        )}
                    </div>

                    {/* ── All PICs ───────────────────────────────────────── */}
                    {customer.pics?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-6">
                            <h3 className="text-sm font-bold text-surface-700 mb-4 flex items-center gap-2">
                                <Users className="w-4 h-4 text-brand-500" />
                                Daftar PIC <span className="text-surface-400 font-normal">({customer.pics.length})</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {customer.pics.map(pic => (
                                    <div
                                        key={pic.id}
                                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                                            pic.is_primary
                                                ? 'bg-brand-50 border-brand-200'
                                                : 'bg-surface-50 border-surface-100 hover:border-surface-200'
                                        }`}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                                            pic.is_primary ? 'bg-brand-500 text-white' : 'bg-surface-200 text-surface-600'
                                        }`}>
                                            {pic.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-surface-800 flex items-center gap-1.5">
                                                {pic.name}
                                                {pic.is_primary && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold">
                                                        <Star className="w-2.5 h-2.5" /> Utama
                                                    </span>
                                                )}
                                            </div>
                                            {pic.phone && (
                                                <a href={`tel:${pic.phone}`} className="text-xs text-surface-500 flex items-center gap-1 mt-0.5 hover:text-brand-600 transition-colors">
                                                    <Phone className="w-3 h-3" /> {pic.phone}
                                                </a>
                                            )}
                                            {pic.email && (
                                                <a href={`mailto:${pic.email}`} className="text-xs text-surface-400 flex items-center gap-1 mt-0.5 hover:text-brand-600 transition-colors truncate">
                                                    <Mail className="w-3 h-3 shrink-0" /> {pic.email}
                                                </a>
                                            )}
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

/* ── Helpers ───────────────────────────────────────────────────────────── */
function Th({ children, right }) {
    return (
        <th className={`py-3 px-5 text-[11px] font-bold text-surface-400 uppercase tracking-widest ${right ? 'text-right' : ''}`}>
            {children}
        </th>
    );
}

function EmptyState({ icon: Icon, text }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
                <Icon className="w-7 h-7 text-surface-300" />
            </div>
            <p className="text-sm font-semibold text-surface-500">{text}</p>
        </div>
    );
}
