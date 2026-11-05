import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatRupiah, formatCompactRupiah } from '@/utils/money';
import {
    Trophy, ChevronLeft, ChevronRight, Eye, EyeOff, Search,
    Calendar, Building2, User, DollarSign, TrendingUp, TrendingDown,
    FileText, ArrowRight
} from 'lucide-react';

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatRp = (n) => formatCompactRupiah(n);

export default function Achievements({
    deals,
    tab,
    selectedMonth,
    currentRevenue,
    dealCount,
    prevMonthRevenue,
    diffPercentage,
    trend,
    filters,
    isManagerOrAdmin,
}) {
    const [activeTab, setActiveTab] = useState(tab || 'win');
    const [search, setSearch] = useState(filters?.search || '');
    const [startDate, setStartDate] = useState(filters?.start_date || '');
    const [endDate, setEndDate] = useState(filters?.end_date || '');
    const [hideRevenue, setHideRevenue] = useState(false);

    // Current parsed date from selectedMonth (e.g. "2026-11")
    const isAll = selectedMonth === 'all';
    const now = new Date();
    const currentYear = isAll ? now.getFullYear() : parseInt(selectedMonth.split('-')[0], 10);
    const currentMonthNum = isAll ? now.getMonth() + 1 : parseInt(selectedMonth.split('-')[1], 10);

    const monthLabel = isAll ? 'Semua Periode' : `${MONTH_NAMES[currentMonthNum - 1]} ${currentYear}`;

    const applyFilter = (newParams = {}) => {
        router.get(route('achievements.index'), {
            tab: activeTab,
            month: selectedMonth,
            search: search || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            ...newParams,
        }, { preserveState: true, replace: true });
    };

    const handleTabChange = (t) => {
        setActiveTab(t);
        applyFilter({ tab: t });
    };

    const handlePrevMonth = () => {
        if (isAll) return;
        const d = new Date(currentYear, currentMonthNum - 2, 1);
        const nextM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        applyFilter({ month: nextM });
    };

    const handleNextMonth = () => {
        if (isAll) return;
        const d = new Date(currentYear, currentMonthNum, 1);
        const nextM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        applyFilter({ month: nextM });
    };

    const handleToggleAllOrMonth = (target) => {
        if (target === 'all') {
            applyFilter({ month: 'all' });
        } else {
            const thisM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            applyFilter({ month: thisM });
        }
    };

    const handleSelectTrendMonth = (mKey) => {
        applyFilter({ month: mKey });
    };

    // Calculate max value for chart bars
    const maxTrendVal = Math.max(...trend.map(t => t.value), 1);

    return (
        <AuthenticatedLayout>
            <Head title="Pencapaian" />

            <div className="flex flex-col gap-6 animate-fade-in-up">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Trophy className="h-6 w-6 text-brand-600" />
                            <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Pencapaian</h1>
                        </div>
                        <p className="text-xs text-surface-500 mt-1 max-w-2xl leading-relaxed">
                            Ringkasan estimasi nilai lead pada tahap deal. Periode saat ini mengikuti tanggal pembaruan lead, bukan tanggal PO atau pembayaran.
                        </p>
                    </div>

                    {/* Deal Menang / Selesai Terbayar Tabs */}
                    <div className="flex items-center bg-white border border-surface-200 shadow-sm p-1 rounded-xl shrink-0">
                        <button
                            onClick={() => handleTabChange('win')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'win' || activeTab === 'proyek_deal' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}>
                            Deal Menang
                        </button>
                        <button
                            onClick={() => handleTabChange('selesai_terbayar')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'selesai_terbayar' || activeTab === 'proyek_selesai' ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-600 hover:text-surface-900'}`}>
                            Selesai Terbayar
                        </button>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-[11px] font-semibold text-surface-500 mb-1">Nama lead</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari nama lead..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyFilter()}
                                className="w-full border border-surface-200 rounded-lg pl-3 pr-8 py-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            />
                            <Search className="w-3.5 h-3.5 text-surface-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => applyFilter()} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold text-surface-500 mb-1">Dari tanggal</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); applyFilter({ start_date: e.target.value }); }}
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none text-surface-700"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold text-surface-500 mb-1">Sampai tanggal</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); applyFilter({ end_date: e.target.value }); }}
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none text-surface-700"
                        />
                    </div>
                                        <div><label className="block text-[11px] font-semibold text-surface-500 mb-1">Tipe pembayaran</label><select disabled className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs text-surface-400 cursor-not-allowed"><option>Belum tersedia</option></select><p className="mt-1 text-[11px] text-surface-500">Belum terhubung ke data pembayaran.</p></div>
                </div>

                {/* Dark Widget Panel */}
                <div className="bg-white text-surface-900 border border-surface-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8">
                        {/* Left Section: Month nav & Omzet stats */}
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                {/* Month Navigator & Toggle */}
                                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                        {!isAll && (
                                            <button onClick={handlePrevMonth} className="p-1 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-brand-700 transition-colors">
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                        )}
                                        <span className="text-base font-bold text-surface-900">{monthLabel}</span>
                                        {!isAll && (
                                            <button onClick={handleNextMonth} className="p-1 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-brand-700 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center bg-surface-100 rounded-lg p-1 text-xs">
                                        <button
                                            onClick={() => handleToggleAllOrMonth('month')}
                                            className={`px-3 py-1 rounded-lg font-semibold transition-all ${!isAll ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-500 hover:text-brand-700'}`}>
                                            Bulan ini
                                        </button>
                                        <button
                                            onClick={() => handleToggleAllOrMonth('all')}
                                            className={`px-3 py-1 rounded-lg font-semibold transition-all ${isAll ? 'bg-brand-600 text-white shadow-sm' : 'text-surface-500 hover:text-brand-700'}`}>
                                            Semua
                                        </button>
                                    </div>
                                </div>

                                {/* Omzet */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-surface-500">Omzet {monthLabel}</span>
                                        <button onClick={() => setHideRevenue(!hideRevenue)} className="text-surface-500 hover:text-brand-700 transition-colors">
                                            {hideRevenue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <div className="text-3xl font-extrabold tracking-tight" title={formatRupiah(currentRevenue)}>
                                        {hideRevenue ? '••••••••' : formatCompactRupiah(currentRevenue)}
                                    </div>
                                    <div className="text-xs text-surface-500 mt-1">
                                        {dealCount} {activeTab === 'selesai_terbayar' ? 'lead pada tahap selesai' : 'lead pada tahap deal'}
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Stats */}
                            <div className="pt-4 border-t border-surface-200 grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[11px] text-surface-500 block mb-0.5">Dibanding bulan lalu</span>
                                    <span className={`text-sm font-bold ${diffPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isAll ? '—' : diffPercentage >= 0 ? '+' + diffPercentage + '%' : diffPercentage + '%'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[11px] text-surface-500 block mb-0.5">Capaian target</span>
                                    <span className="text-sm font-bold text-surface-700">—</span>
                                    <span className="text-[10px] text-surface-500 block">Target belum terhubung pada laporan ini.</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Section: 6-Month Trend Bar Chart */}
                        <div className="w-full lg:w-96 flex flex-col justify-between pt-4 lg:pt-0 lg:pl-6 lg:border-l lg:border-surface-200">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-surface-700">Omzet 6 bulan terakhir</span>
                                <span className="text-[10px] text-surface-500">Klik batang untuk memilih bulan</span>
                            </div>

                            {/* Bar Chart Bars */}
                            <div className="flex items-end justify-between gap-3 h-32 px-2 pb-2">
                                {trend.map((item) => {
                                    const heightPct = Math.max(Math.round((item.value / maxTrendVal) * 100), 8);
                                    const isSelected = selectedMonth === item.key;
                                    return (
                                        <div
                                            key={item.key}
                                            onClick={() => handleSelectTrendMonth(item.key)}
                                            className="h-full flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                                            title={`${item.label}: ${formatRp(item.value)}`}
                                        >
                                            <div className="w-full h-24 flex items-end justify-center">
                                                <div
                                                    style={{ height: `${heightPct}%` }}
                                                    className={`w-full max-w-[28px] rounded-t-md transition-all group-hover:opacity-100 ${
                                                        isSelected
                                                            ? 'bg-brand-500 opacity-100'
                                                            : item.value > 0
                                                            ? 'bg-brand-300 group-hover:bg-brand-400'
                                                            : 'bg-surface-200'
                                                    }`}
                                                />
                                            </div>
                                            <span className={`text-[11px] font-medium transition-colors ${isSelected ? 'text-brand-700 font-bold' : 'text-surface-500 group-hover:text-surface-700'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deals List or Empty State */}
                <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
                    {deals.length === 0 ? (
                        <div className="border border-dashed border-surface-200 rounded-xl py-16 flex flex-col items-center justify-center text-center">
                            <h3 className="text-sm font-bold text-surface-800 mb-1">
                                Belum ada deal di {monthLabel}
                            </h3>
                            <p className="text-xs text-surface-400 max-w-sm">
                                Pilih bulan lain di atas, atau pilih Semua untuk melihat seluruh deal.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-surface-100 text-surface-400 uppercase tracking-wider font-semibold">
                                        <th className="pb-3">Lead / Proyek</th>
                                        <th className="pb-3">Customer</th>
                                        <th className="pb-3">Sales</th>
                                        <th className="pb-3 text-right">Estimasi Nilai</th>
                                        <th className="pb-3 text-center">Diperbarui</th>
                                        <th className="pb-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                    {deals.map(deal => (
                                        <tr key={deal.id} className="hover:bg-surface-50 transition-colors">
                                            <td className="py-3">
                                                <div className="font-bold text-surface-800 text-sm">{deal.title}</div>
                                                <span className="text-[10px] text-surface-400 font-mono">{deal.lead_code}</span>
                                            </td>
                                            <td className="py-3 text-surface-600">
                                                {deal.customer?.name || deal.customer_name || '—'}
                                            </td>
                                            <td className="py-3 text-surface-600">
                                                {deal.sales?.name || '—'}
                                            </td>
                                            <td className="py-3 text-right font-extrabold text-brand-700 text-sm" title={formatCompactRupiah(deal.estimated_value)}>
                                                {formatRupiah(deal.estimated_value)}
                                            </td>
                                            <td className="py-3 text-center text-surface-400">
                                                {new Date(deal.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="py-3 text-right">
                                                <button
                                                    onClick={() => router.visit(route('leads.show', deal.id))}
                                                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-semibold text-xs">
                                                    Lihat Lead <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

