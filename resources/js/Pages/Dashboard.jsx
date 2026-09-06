import React, { useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    FileText, DollarSign, TrendingUp, CheckCircle2, ChevronRight,
    Users, Target, Filter, Calendar, ChevronDown, Pencil, X
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatShort = (val) => {
    if (!val || val === 0) return 'Rp 0';
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(0)}jt`;
    return `Rp ${(val / 1_000).toFixed(0)}rb`;
};

const formatFull = (val) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const STATUS_CONFIGS = [
    { key: 'approved', label: 'PO',       color: '#059669', bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'sent',     label: 'Sent',     color: '#2563EB', bg: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'created',  label: 'Draft',    color: '#9CA3AF', bg: 'bg-gray-400',    light: 'bg-gray-50 text-gray-600 border-gray-200' },
    { key: 'rejected', label: 'Rejected', color: '#DC2626', bg: 'bg-red-500',     light: 'bg-red-50 text-red-700 border-red-200' },
    { key: 'expired',  label: 'Expired',  color: '#D97706', bg: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const PERIOD_PRESETS = [
    { key: '1m',     label: '1 Bln',  months: 1 },
    { key: '3m',     label: '3 Bln',  months: 3 },
    { key: '6m',     label: '6 Bln',  months: 6 },
    { key: '12m',    label: '12 Bln', months: 12 },
    { key: 'custom', label: 'Custom', months: null },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconBg, iconColor, value, label, sub, subColor = 'text-emerald-600', extra }) {
    return (
        <div className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-surface-300 transition-all duration-200 flex flex-col gap-2">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="text-2xl font-extrabold text-surface-900 leading-tight">{value}</div>
            <div className="text-sm text-surface-500">{label}</div>
            {sub && <div className={`text-xs font-medium ${subColor}`}>{sub}</div>}
            {extra}
        </div>
    );
}

function ConversionRing({ pct }) {
    const r = 18, circ = 2 * Math.PI * r;
    const dash = circ * (pct / 100);
    const color = pct >= 30 ? '#059669' : pct >= 15 ? '#D97706' : '#DC2626';
    return (
        <svg width="48" height="48" className="shrink-0">
            <circle cx="24" cy="24" r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
            <circle
                cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                transform="rotate(-90 24 24)"
                className="transition-all duration-700"
            />
            <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="800" fill={color}>{pct}%</text>
        </svg>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Dashboard({ stats, salesUsers, filters, auth }) {
    const { user, permissions = [] } = auth || {};
    const canEditTarget = permissions.includes('sales_targets_edit') || ['Administrator', 'Sales Manager', 'Manager'].includes(user?.spatie_role || user?.role);
    const isManagerOrAdmin = ['Administrator', 'Sales Manager', 'Manager'].includes(user?.spatie_role || user?.role);

    const [period, setPeriod] = useState(filters?.period || '6m');
    const [salesFilter, setSalesFilter] = useState(filters?.salesFilter || 'all');
    const [customStart, setCustomStart] = useState(filters?.customStart || '');
    const [customEnd, setCustomEnd] = useState(filters?.customEnd || '');

    const {
        totalQ = 0,
        totalAllValue = 0,
        totalPOValue = 0,
        approvedCount = 0,
        conversionRate = 0,
        statusCounts = {},
        chartMonths = [],
        topCustomers = [],
        salesPerf = [],
    } = stats || {};

    const [editingSales, setEditingSales] = useState(null);
    const [targetInputVal, setTargetInputVal] = useState('');
    const [isSavingTarget, setIsSavingTarget] = useState(false);

    const formatTargetDisplay = (valStr) => {
        if (!valStr && valStr !== 0) return '';
        const num = Number(valStr);
        if (isNaN(num)) return valStr;
        return new Intl.NumberFormat('id-ID').format(num);
    };

    const handleStartEditSales = (s) => {
        setEditingSales(s);
        setTargetInputVal(String(s.target || 600000000));
    };

    const handleTopAturTargetClick = () => {
        if (editingSales) {
            setEditingSales(null);
        } else if (salesPerf.length > 0) {
            handleStartEditSales(salesPerf[0]);
        }
    };

    const handleSaveSalesTarget = (e) => {
        e?.preventDefault();
        if (!editingSales) return;
        const rawNum = Number(String(targetInputVal).replace(/\D/g, ''));
        if (isNaN(rawNum)) return;

        setIsSavingTarget(true);
        router.post(route('dashboard.sales-targets.update'), {
            targets: [
                { user_id: editingSales.id, target_amount: rawNum }
            ]
        }, {
            preserveScroll: true,
            onSuccess: () => setEditingSales(null),
            onFinish: () => setIsSavingTarget(false),
        });
    };

    const applyFilters = (overrides = {}) => {
        const params = {
            period: overrides.period ?? period,
            sales_filter: overrides.salesFilter ?? salesFilter,
            custom_start: overrides.customStart ?? customStart,
            custom_end: overrides.customEnd ?? customEnd,
        };
        router.get('/dashboard', params, { preserveState: true, replace: true });
    };

    const handlePeriodChange = (key) => {
        setPeriod(key);
        applyFilters({ period: key });
    };

    const handleSalesFilterChange = (val) => {
        setSalesFilter(val);
        applyFilters({ salesFilter: val });
    };

    // Donut chart
    const r = 56, circ = 2 * Math.PI * r;
    let cumPct = 0;
    const donutSegs = STATUS_CONFIGS.map(s => {
        const count = statusCounts[s.key] || 0;
        const pct = totalQ > 0 ? count / totalQ : 0;
        const off = circ * (1 - pct);
        const rot = cumPct * 360;
        cumPct += pct;
        return { ...s, count, pct, off, rot };
    });

    const maxChartVal = Math.max(1, ...chartMonths.map(m => Math.max(m.revPO, m.revNonPO)));
    const maxCustomerPO = Math.max(1, ...topCustomers.map(c => c.poValue));
    const totalCustomerPO = topCustomers.reduce((s, c) => s + c.poValue, 0) || 1;

    const handleStatusClick = (statusKey) => {
        router.get('/quotations', { status: statusKey });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="animate-fade-in-up space-y-6">

                {/* ── Filter Bar ─────────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-surface-200 px-5 py-4 flex flex-wrap items-center gap-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-surface-700 shrink-0">
                        <Filter className="w-4 h-4 text-brand-500" />
                        Filter
                    </div>

                    {/* Sales filter (manager only) */}
                    {isManagerOrAdmin && (
                        <div className="relative">
                            <select
                                value={salesFilter}
                                onChange={e => handleSalesFilterChange(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-surface-200 rounded-lg bg-white text-surface-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
                            >
                                <option value="all">Semua Sales</option>
                                {(salesUsers || []).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Period presets */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {PERIOD_PRESETS.map(p => (
                            <button
                                key={p.key}
                                onClick={() => handlePeriodChange(p.key)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 ${
                                    period === p.key
                                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                        : 'bg-white text-surface-600 border-surface-200 hover:border-brand-400 hover:text-brand-600'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom date inputs */}
                    {period === 'custom' && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1 text-xs text-surface-500">
                                <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="date" value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                            />
                            <span className="text-xs text-surface-400">—</span>
                            <input
                                type="date" value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                            />
                            <button
                                onClick={() => applyFilters({ period: 'custom' })}
                                className="px-3 py-1.5 text-xs font-bold bg-brand-600 text-white rounded-lg"
                            >
                                Terapkan
                            </button>
                        </div>
                    )}

                    {/* Period label */}
                    <span className="ml-auto text-xs text-surface-400 hidden sm:block">
                        {filters?.periodStart} — {filters?.periodEnd}
                    </span>
                </div>

                {/* ── 4 KPI Cards ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    <KpiCard
                        icon={FileText} iconBg="bg-blue-50" iconColor="text-blue-600"
                        value={<span>{totalQ}</span>}
                        label="Total Quotation"
                        sub="Dalam periode terpilih"
                    />
                    <KpiCard
                        icon={DollarSign} iconBg="bg-violet-50" iconColor="text-violet-600"
                        value={formatShort(totalAllValue)}
                        label="Value All Quotation"
                        sub={<span title={formatFull(totalAllValue)}>Total semua penawaran</span>}
                        subColor="text-violet-600"
                    />
                    <div className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-surface-300 transition-all duration-200 flex flex-col gap-2">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-extrabold text-surface-900 leading-tight">{formatShort(totalPOValue)}</div>
                        <div className="text-sm text-surface-500">PO Status</div>
                        <div className="text-xs font-medium text-emerald-600">{approvedCount} PO • {formatFull(totalPOValue)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-surface-300 transition-all duration-200 flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <ConversionRing pct={conversionRate} />
                        </div>
                        <div className="text-2xl font-extrabold text-surface-900 leading-tight">{conversionRate}%</div>
                        <div className="text-sm text-surface-500">Conversion Rate</div>
                        <div className={`text-xs font-medium ${conversionRate >= 30 ? 'text-emerald-600' : conversionRate >= 15 ? 'text-amber-600' : 'text-red-500'}`}>
                            {conversionRate >= 30 ? '🔥 Excellent' : conversionRate >= 15 ? '⚡ On Track' : '⚠️ Needs Push'} · {approvedCount}/{totalQ} PO
                        </div>
                    </div>
                </div>

                {/* ── Revenue Chart + Status Donut ──────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Revenue Comparison Chart */}
                    <div className="lg:col-span-8 bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between pb-4 border-b border-surface-100">
                            <h2 className="text-sm font-bold text-surface-800">Revenue Quotation</h2>
                            <div className="flex items-center gap-4 text-xs text-surface-500">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-200 inline-block" />
                                    Non-PO
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                                    PO
                                </span>
                            </div>
                        </div>

                        {chartMonths.length === 0 ? (
                            <div className="flex items-center justify-center h-44 text-sm text-surface-400">
                                Tidak ada data dalam periode ini.
                            </div>
                        ) : (
                            <div className="pt-5 pb-2 overflow-x-auto">
                                <div className="flex items-end gap-2 justify-between min-w-0" style={{ minWidth: chartMonths.length > 8 ? `${chartMonths.length * 56}px` : undefined }}>
                                    {chartMonths.map((m, idx) => {
                                        const totalVal = m.revPO + m.revNonPO;
                                        const hPO = maxChartVal > 0 ? Math.round((m.revPO / maxChartVal) * 130) : 0;
                                        const hNonPO = maxChartVal > 0 ? Math.round((m.revNonPO / maxChartVal) * 130) : 0;
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-1 flex-1 min-w-[60px]">
                                                <div className="text-[10px] font-semibold text-surface-600 whitespace-nowrap">
                                                    {totalVal > 0 ? formatShort(totalVal) : ''}
                                                </div>
                                                <div className="w-full flex items-end justify-center gap-1" style={{ height: '130px' }}>
                                                    <div
                                                        className="w-4 bg-blue-200 hover:bg-blue-300 transition-colors cursor-pointer rounded-t-sm"
                                                        style={{ height: hNonPO > 0 ? `${hNonPO}px` : '4px' }}
                                                        title={`Non-PO: ${formatFull(m.revNonPO)}`}
                                                    />
                                                    <div
                                                        className="w-4 bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer rounded-t-sm"
                                                        style={{ height: hPO > 0 ? `${hPO}px` : '4px' }}
                                                        title={`PO: ${formatFull(m.revPO)}`}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-surface-500 font-medium whitespace-nowrap">{m.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Donut */}
                    <div className="lg:col-span-4 bg-white rounded-xl border border-surface-200 p-5 shadow-sm flex flex-col">
                        <div className="pb-3 border-b border-surface-100 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-surface-800">Status Quotation</h2>
                            {isManagerOrAdmin && (
                                <span className="text-[10px] text-surface-400 bg-surface-50 border border-surface-100 rounded px-2 py-0.5">Klik untuk filter</span>
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-4 py-4 flex-1">
                            <div className="relative w-36 h-36 flex items-center justify-center">
                                <svg width="144" height="144" viewBox="0 0 144 144">
                                    {donutSegs.map((s, idx) => (
                                        <circle
                                            key={idx} cx="72" cy="72" r={r} fill="none"
                                            stroke={s.color} strokeWidth="14"
                                            strokeDasharray={circ} strokeDashoffset={s.off}
                                            transform={`rotate(${s.rot - 90} 72 72)`}
                                            className="transition-all duration-700"
                                        />
                                    ))}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-extrabold text-surface-800">{totalQ}</span>
                                    <span className="text-[10px] text-surface-500">Total</span>
                                </div>
                            </div>

                            <div className="w-full space-y-1.5">
                                {donutSegs.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleStatusClick(s.key)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-150 hover:shadow-sm active:scale-[0.98] ${
                                            isManagerOrAdmin ? 'cursor-pointer' : 'cursor-default pointer-events-none'
                                        } ${s.light}`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${s.bg} shrink-0`} />
                                        <span className="text-xs font-semibold flex-1 text-left">{s.label}</span>
                                        <span className="text-xs font-bold ml-auto">{s.count}</span>
                                        {s.count > 0 && totalQ > 0 && (
                                            <span className="text-[10px] opacity-70">{Math.round((s.count / totalQ) * 100)}%</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Top 5 Customer + Sales Performance ──────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Top 5 Customer by PO Value */}
                    <div className="lg:col-span-5 bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-3">
                            <h2 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                                <Users className="w-4 h-4 text-brand-500" />
                                Top 5 Customer (PO)
                            </h2>
                            <Link href="/customers" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {topCustomers.length === 0 ? (
                            <div className="text-center py-10 text-xs text-surface-400">Belum ada data PO.</div>
                        ) : (
                            <div className="space-y-1">
                                {topCustomers.map((c, i) => {
                                    const barW = maxCustomerPO > 0 ? Math.round((c.poValue / maxCustomerPO) * 100) : 0;
                                    const contribPct = Math.round((c.poValue / totalCustomerPO) * 100);
                                    const rankColors = ['bg-amber-100 text-amber-700', 'bg-gray-100 text-gray-600', 'bg-orange-100 text-orange-700'];
                                    const rankCls = rankColors[i] || 'bg-surface-100 text-surface-500';
                                    return (
                                        <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-50 transition-colors group">
                                            <div className={`w-7 h-7 rounded-md ${rankCls} flex items-center justify-center text-xs font-bold shrink-0`}>
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-surface-800 truncate">{c.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${barW}%` }} />
                                                    </div>
                                                    <span className="text-[10px] text-surface-400 shrink-0">{contribPct}%</span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-sm font-bold text-surface-800">{formatShort(c.poValue)}</div>
                                                <div className="text-[10px] text-surface-400">{c.poCount} PO</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sales Team Performance */}
                    <div className="lg:col-span-7 bg-white rounded-xl border border-surface-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-3">
                            <h2 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                                <Target className="w-4 h-4 text-brand-500" />
                                Performa Sales Team
                            </h2>
                            {canEditTarget && (
                                <button
                                    type="button"
                                    onClick={handleTopAturTargetClick}
                                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                        editingSales
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                            : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50 hover:text-surface-900 shadow-2xs'
                                    }`}
                                    title="Atur Target Sales"
                                >
                                    <Pencil className="w-3.5 h-3.5 text-surface-400" />
                                    <span>Atur Target</span>
                                </button>
                            )}
                        </div>

                        {/* Inline Target Box */}
                        {canEditTarget && editingSales && (
                            <form onSubmit={handleSaveSalesTarget} className="mb-4 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-300 animate-fade-in space-y-2">
                                <label className="text-xs font-bold text-emerald-800 block">
                                    Target: {editingSales.name}
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-surface-400">Rp</span>
                                        <input
                                            type="text"
                                            value={formatTargetDisplay(targetInputVal)}
                                            onChange={e => {
                                                const raw = e.target.value.replace(/\D/g, '');
                                                setTargetInputVal(raw);
                                            }}
                                            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono font-bold text-surface-800 bg-white border border-emerald-400 rounded-lg outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs"
                                            placeholder="600.000.000"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSavingTarget}
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 shrink-0"
                                    >
                                        {isSavingTarget ? '...' : 'Simpan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingSales(null)}
                                        className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer shrink-0"
                                        title="Batal"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </form>
                        )}

                        {salesPerf.length === 0 ? (
                            <div className="text-center py-10 text-xs text-surface-400">Belum ada data tim sales.</div>
                        ) : (
                            <div className="space-y-3">
                                {salesPerf.map((s, idx) => {
                                    const pct = s.target > 0 ? Math.min(100, Math.round((s.achieved / s.target) * 100)) : 0;
                                    const barColor = pct >= 100 ? 'bg-brand-600' : pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';
                                    const badge = pct >= 100 ? { label: 'Exceeded 🚀', cls: 'text-brand-700 bg-brand-50 border-brand-200' }
                                               : pct >= 80  ? { label: 'On Track ✅',   cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
                                               : pct >= 50  ? { label: 'Progressing ⚡', cls: 'text-amber-700 bg-amber-50 border-amber-200' }
                                               :              { label: 'Needs Push ⚠️',  cls: 'text-red-700 bg-red-50 border-red-200' };
                                    const isEditingThis = editingSales?.id === s.id;

                                    return (
                                        <div
                                            key={s.id || idx}
                                            onClick={() => canEditTarget && handleStartEditSales(s)}
                                            className={`flex items-center gap-3 py-1.5 px-2 rounded-xl transition-all ${
                                                canEditTarget ? 'cursor-pointer hover:bg-surface-50' : 'cursor-default'
                                            } ${isEditingThis ? 'bg-emerald-50/60 ring-1 ring-emerald-300' : ''}`}
                                            title={canEditTarget ? `Klik untuk edit target ${s.name}` : undefined}
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0 border border-brand-100">
                                                {s.avatar}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1 gap-2">
                                                    <span className="text-sm font-semibold text-surface-800 truncate">{s.name}</span>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 ${badge.cls}`}>{badge.label}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between mt-1 text-[11px] text-surface-400">
                                                    <span className="font-medium text-surface-600">{formatShort(s.achieved)}</span>
                                                    <span className="flex items-center gap-1">
                                                        Target: {formatShort(s.target)} · <span className={`font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
                                                        {canEditTarget && <Pencil className="w-3 h-3 text-surface-300 group-hover:text-emerald-600 transition-colors" />}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
