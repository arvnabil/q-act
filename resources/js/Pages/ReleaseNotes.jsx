import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { 
    Sparkles, 
    Calendar, 
    Tag, 
    CheckCircle2, 
    Layers, 
    Search, 
    ChevronDown, 
    ChevronUp, 
    GitCommit, 
    ExternalLink,
    Rocket,
    Clock,
    Flame,
    ArrowUpRight
} from 'lucide-react';

export default function ReleaseNotes({ currentVersion, lastUpdated, releases = [] }) {
    const [search, setSearch] = useState('');
    const [expandedVersions, setExpandedVersions] = useState(() => {
        // Default expand first 2 versions
        const init = {};
        if (releases.length > 0) init[releases[0].version] = true;
        if (releases.length > 1) init[releases[1].version] = true;
        return init;
    });

    const toggleExpand = (ver) => {
        setExpandedVersions(prev => ({
            ...prev,
            [ver]: !prev[ver]
        }));
    };

    const expandAll = () => {
        const all = {};
        releases.forEach(r => { all[r.version] = true; });
        setExpandedVersions(all);
    };

    const collapseAll = () => {
        setExpandedVersions({});
    };

    // Filter releases based on search keyword
    const filteredReleases = releases.filter(r => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const inVersion = r.version.toLowerCase().includes(q);
        const inWeek = r.week.toLowerCase().includes(q);
        const inSummary = r.summary.toLowerCase().includes(q);
        const inTag = (r.tag || '').toLowerCase().includes(q);
        const inHighlights = (r.highlights || []).some(h => h.toLowerCase().includes(q));
        const inCategories = Object.entries(r.categories || {}).some(([cat, items]) => 
            cat.toLowerCase().includes(q) || items.some(item => item.toLowerCase().includes(q))
        );
        return inVersion || inWeek || inSummary || inTag || inHighlights || inCategories;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Info Versi & Rilis Pembaruan" />

            {/* Header Hero Banner */}
            <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-700 rounded-2xl p-6 md:p-8 text-white shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute right-40 bottom-0 translate-y-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-white/20">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Changelog & Siklus Rilis Mingguan</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Info Versi & Pembaruan Sistem
                        </h1>
                        <p className="text-brand-100 text-sm leading-relaxed">
                            Dokumentasi resmi seluruh pembaruan fitur, perbaikan bug, dan optimasi performa 
                            portal penjualan ACTiV yang dikelompokkan secara berkala per minggu.
                        </p>
                    </div>

                    <div className="flex md:flex-col items-start md:items-end justify-between gap-3 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                        <div>
                            <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold block">Versi Saat Ini</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-2xl font-black font-mono tracking-tight">{currentVersion}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-400 text-brand-950 uppercase tracking-wide">
                                    Latest
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[11px] text-brand-100 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-200" />
                                Terakhir diperbarui: {new Date(lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats / Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-3 shadow-2xs">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                        <Rocket className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-xs text-surface-500 font-medium block">Total Siklus Rilis</span>
                        <span className="text-lg font-bold text-surface-900">{releases.length} Versi Mingguan</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-3 shadow-2xs">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-xs text-surface-500 font-medium block">Fokus Rilis Terkini</span>
                        <span className="text-sm font-bold text-surface-900 truncate block max-w-[180px]" title="Lead Pipeline 360 & Workflow">
                            Lead Pipeline 360 & Workflow
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-3 shadow-2xs">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <GitCommit className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-xs text-surface-500 font-medium block">Dasar Analisis</span>
                        <span className="text-sm font-bold text-surface-900">Git Commit History</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-3 shadow-2xs">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-xs text-surface-500 font-medium block">Siklus Pembaruan</span>
                        <span className="text-sm font-bold text-surface-900">Mingguan (Weekly Batches)</span>
                    </div>
                </div>
            </div>

            {/* Filter & Controls Bar */}
            <div className="bg-white rounded-xl border border-surface-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari fitur, perbaikan, atau versi..."
                        className="w-full pl-9 pr-3 py-2 text-xs bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={expandAll}
                        className="px-3 py-1.5 rounded-lg border border-surface-200 text-xs font-semibold text-surface-600 hover:bg-surface-50 hover:text-surface-800 transition-colors cursor-pointer"
                    >
                        Buka Semua
                    </button>
                    <button
                        type="button"
                        onClick={collapseAll}
                        className="px-3 py-1.5 rounded-lg border border-surface-200 text-xs font-semibold text-surface-600 hover:bg-surface-50 hover:text-surface-800 transition-colors cursor-pointer"
                    >
                        Tutup Semua
                    </button>
                </div>
            </div>

            {/* Release Timeline List */}
            <div className="space-y-5">
                {filteredReleases.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-surface-300 p-12 text-center">
                        <Search className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                        <h3 className="text-sm font-bold text-surface-700">Tidak ada pembaruan ditemukan</h3>
                        <p className="text-xs text-surface-400 mt-1">Coba kata kunci pencarian yang lain.</p>
                    </div>
                ) : (
                    filteredReleases.map((release, idx) => {
                        const isExpanded = !!expandedVersions[release.version];
                        const isLatest = release.is_current;

                        return (
                            <div 
                                key={release.version}
                                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                                    isLatest 
                                        ? 'border-brand-300 ring-2 ring-brand-500/10 shadow-md' 
                                        : 'border-surface-200 hover:border-surface-300 shadow-2xs'
                                }`}
                            >
                                {/* Release Card Header */}
                                <div 
                                    onClick={() => toggleExpand(release.version)}
                                    className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors ${
                                        isLatest ? 'bg-gradient-to-r from-brand-50/50 via-white to-white' : 'hover:bg-surface-50/60'
                                    }`}
                                >
                                    <div className="flex items-start md:items-center gap-3.5">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                                            isLatest ? 'bg-brand-600 text-white shadow-xs' : 'bg-surface-100 text-surface-700'
                                        }`}>
                                            <Tag className="w-5 h-5" />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-lg font-black font-mono text-surface-900 tracking-tight">
                                                    {release.version}
                                                </span>
                                                {isLatest && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        VERSI AKTIF
                                                    </span>
                                                )}
                                                {release.tag && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-100 text-surface-600 border border-surface-200">
                                                        {release.tag}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-surface-500 flex items-center gap-1.5 font-medium">
                                                <Calendar className="w-3.5 h-3.5 text-surface-400" />
                                                <span>{release.week}</span>
                                                <span>•</span>
                                                <span>Rilis: {new Date(release.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-surface-100">
                                        <p className="text-xs text-surface-600 max-w-md line-clamp-1 hidden lg:block text-right">
                                            {release.summary}
                                        </p>
                                        <button
                                            type="button"
                                            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                                            aria-label={isExpanded ? 'Tutup rincian' : 'Buka rincian'}
                                        >
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Release Content */}
                                {isExpanded && (
                                    <div className="px-5 pb-6 pt-2 border-t border-surface-100 space-y-5 animate-fade-in">
                                        {/* Release Overview Summary */}
                                        <div className="bg-surface-50/80 rounded-xl p-4 border border-surface-200">
                                            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-1">
                                                Ringkasan Pembaruan
                                            </h4>
                                            <p className="text-sm font-medium text-surface-800 leading-relaxed">
                                                {release.summary}
                                            </p>
                                        </div>

                                        {/* Highlight Features */}
                                        {release.highlights && release.highlights.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                                    Poin Utama (Key Highlights)
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                    {release.highlights.map((highlight, hIdx) => (
                                                        <div 
                                                            key={hIdx}
                                                            className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-50/40 border border-brand-100/60 text-xs font-medium text-surface-800"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                                                            <span className="leading-relaxed">{highlight}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Detailed Changelog by Category */}
                                        {release.categories && Object.keys(release.categories).length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                    <Layers className="w-4 h-4 text-surface-500" />
                                                    Rincian Pembaruan per Modul
                                                </h4>
                                                <div className="space-y-3">
                                                    {Object.entries(release.categories).map(([category, items]) => (
                                                        <div key={category} className="border border-surface-200 rounded-xl p-4 bg-white shadow-2xs">
                                                            <h5 className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                                                <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                                                                {category}
                                                            </h5>
                                                            <ul className="space-y-1.5">
                                                                {items.map((item, iIdx) => (
                                                                    <li key={iIdx} className="text-xs text-surface-600 flex items-start gap-2 leading-relaxed">
                                                                        <span className="text-surface-400 font-bold select-none">•</span>
                                                                        <span>{item}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer Notice */}
            <div className="bg-surface-100/70 rounded-xl p-4 text-center text-xs text-surface-500 border border-surface-200 mt-4">
                <p>
                    PT Alfa Cipta Teknologi Virtual • Portal Penjualan ACTiV (Qsales). Seluruh riwayat pembaruan dipetakan secara otomatis berdasarkan log commit repositori.
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
