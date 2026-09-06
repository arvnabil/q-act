import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Calculator, ChevronDown, ChevronUp, Plus, Trash2,
    Save, AlertTriangle, TrendingDown, TrendingUp, Minus,
    Lock, Unlock, Printer, FileText
} from 'lucide-react';
import { calculateSalesMargin, generateAdjId } from '@/utils/salesMargin';
import { printSimulasiSO } from '@/utils/printSimulasiSO';

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtRp = (val) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(val || 0);

const fmtPct = (val) =>
    (typeof val === 'number' && isFinite(val) ? val.toFixed(1) : '—') + '%';

// ─── Save status indicator ─────────────────────────────────────────────────────
function SaveStatus({ status }) {
    if (status === 'saving') return (
        <span className="text-xs text-violet-400 flex items-center gap-1">
            <Save className="w-3 h-3 animate-pulse" /> Menyimpan...
        </span>
    );
    if (status === 'saved') return (
        <span className="text-xs text-emerald-500 flex items-center gap-1">
            <Save className="w-3 h-3" /> Tersimpan ✓
        </span>
    );
    if (status === 'error') return (
        <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Gagal menyimpan
        </span>
    );
    return null;
}

// ─── Margin colour helper ──────────────────────────────────────────────────────
function marginColor(pct, isNegative) {
    if (isNegative || pct < 0) return 'text-red-600';
    if (pct < 10) return 'text-orange-500';
    if (pct < 20) return 'text-amber-600';
    return 'text-emerald-600';
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SalesZoneCard({ items = [], quotationId, quotation = null, currentUser = null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [adjustments, setAdjustments] = useState([]);
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | dirty | saving | saved | error
    const [isLoading, setIsLoading] = useState(false);
    const saveTimer = useRef(null);

    const handleExportSimulasiSO = (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        const targetQ = quotation ? { ...quotation, items: items.length > 0 ? items : quotation.items } : { id: quotationId, items };
        printSimulasiSO(targetQ, adjustments, currentUser);
    };

    // Load saved adjustments when opened
    useEffect(() => {
        if (!isOpen || !quotationId) return;
        setIsLoading(true);
        fetch(`/quotations/${quotationId}/sales-notes`, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(r => r.json())
            .then(data => {
                let adjs = data?.adjustments;
                if (typeof adjs === 'string') {
                    try {
                        adjs = JSON.parse(adjs);
                    } catch {
                        adjs = [];
                    }
                }
                if (Array.isArray(adjs)) {
                    setAdjustments(adjs);
                } else {
                    setAdjustments([]);
                }
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [isOpen, quotationId]);

    // ── Auto-save ────────────────────────────────────────────────────────────────
    const persistAdjustments = useCallback((adjs) => {
        if (!quotationId) return;
        clearTimeout(saveTimer.current);
        setSaveStatus('saving');

        const safeAdjs = Array.isArray(adjs) ? adjs : [];

        // Get CSRF token from meta tag
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        fetch(`/quotations/${quotationId}/sales-notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ adjustments: safeAdjs }),
        })
            .then(r => r.ok ? setSaveStatus('saved') : setSaveStatus('error'))
            .catch(() => setSaveStatus('error'));
    }, [quotationId]);

    const scheduleSave = useCallback((adjs) => {
        setSaveStatus('dirty');
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persistAdjustments(adjs), 800);
    }, [persistAdjustments]);

const CATEGORY_OPTIONS = [
    'BOD Expenses',
    'Entertainment',
    'Administration',
    'Transport & Accommodation',
    'Others / Shipping/ Import',
];

    // ── Adjustment CRUD ───────────────────────────────────────────────────────────
    const handleAddAdjustment = () => {
        const newAdj = { id: generateAdjId(), category: 'Transport & Accommodation', label: '', amount: '' };
        setAdjustments(prev => [...(Array.isArray(prev) ? prev : []), newAdj]);
    };

    const handleChangeAdjustment = (id, field, value) => {
        setAdjustments(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            const next = arr.map(a => a.id === id ? { ...a, [field]: value } : a);
            return next;
        });
        setSaveStatus('dirty');
    };

    const handleBlurAdjustment = () => {
        scheduleSave(adjustments);
    };

    const handleDeleteAdjustment = (id) => {
        setAdjustments(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            const next = arr.filter(a => a.id !== id);
            persistAdjustments(next);
            return next;
        });
    };

    // ── Calculation ───────────────────────────────────────────────────────────────
    const safeAdjustments = Array.isArray(adjustments) ? adjustments : [];
    const normAdjs = safeAdjustments.map(a => ({ ...a, amount: Number(a.amount) || 0 }));
    const result = calculateSalesMargin(items, normAdjs);

    const {
        itemMargins, knownCount, unknownCount,
        knownRevenue, totalHpp,
        grossMargin, grossMarginPct,
        totalAdjustments,
        netMargin, netMarginPct, isNegative,
        hasUnknownHpp,
    } = result;

    // ── Render ────────────────────────────────────────────────────────────────────
    return (
        <div className="mb-6 print:hidden">
            {/* Toggle header */}
            <button
                type="button"
                onClick={() => setIsOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3 rounded-2xl border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors group"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center border border-violet-200">
                        <Calculator className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-bold text-violet-800 flex items-center gap-1.5">
                            Sales Zone
                            {isOpen
                                ? <Unlock className="w-3.5 h-3.5 text-violet-400" />
                                : <Lock className="w-3.5 h-3.5 text-violet-400" />}
                        </span>
                        <span className="text-xs text-violet-400 block">Internal — tidak tampil pada dokumen quotation</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {saveStatus !== 'idle' && <SaveStatus status={saveStatus} />}
                    {isOpen
                        ? <ChevronUp className="w-4 h-4 text-violet-500" />
                        : <ChevronDown className="w-4 h-4 text-violet-500" />}
                </div>
            </button>

            {/* Card body */}
            {isOpen && (
                <div className="mt-2 rounded-2xl border border-violet-200 bg-violet-50/60 overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="p-6 text-center text-sm text-violet-400">Memuat data...</div>
                    ) : (
                        <>
                            {/* ── PROFITABILITY TABLE ── */}
                            <div className="p-5 pb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">
                                        Profitabilitas Item
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleExportSimulasiSO}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-white border border-violet-200 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-all shadow-2xs cursor-pointer"
                                        title="Eksport draft SO simulasi ke PDF"
                                    >
                                        <Printer className="w-3.5 h-3.5 text-violet-600" /> Export PDF Simulasi SO
                                    </button>
                                </div>

                                {hasUnknownHpp && (
                                    <div className="mb-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                                        <span>
                                            <strong>{unknownCount} item</strong> belum memiliki HPP — tidak dihitung dalam margin.
                                            {knownCount > 0 && ` Margin dihitung dari ${knownCount} item yang memiliki HPP.`}
                                        </span>
                                    </div>
                                )}

                                <div className="overflow-x-auto rounded-lg border border-violet-200 bg-white">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-violet-100/60 border-b border-violet-200">
                                                <th className="text-left px-3 py-2 font-bold text-violet-700 w-full">Produk</th>
                                                <th className="text-right px-3 py-2 font-bold text-violet-700 whitespace-nowrap">Total Barang</th>
                                                <th className="text-right px-3 py-2 font-bold text-violet-700 whitespace-nowrap">Modal (HPP)</th>
                                                <th className="text-right px-3 py-2 font-bold text-violet-700 whitespace-nowrap">Margin Rp</th>
                                                <th className="text-right px-3 py-2 font-bold text-violet-700 whitespace-nowrap">Margin %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-violet-100">
                                            {itemMargins.map((im, idx) => (
                                                <tr key={idx} className={!im.hppKnown ? 'opacity-50' : ''}>
                                                    <td className="px-3 py-2 text-surface-800 font-medium">
                                                        {im.name}
                                                        {im.brand && <span className="ml-1 text-[10px] text-surface-400">({im.brand})</span>}
                                                        <span className="ml-1 text-surface-400">×{im.qty}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-surface-700 font-mono">
                                                        {fmtRp(im.revenue)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono text-surface-500">
                                                        {im.hppKnown ? fmtRp(im.cost) : <span className="text-surface-300">—</span>}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-mono font-bold ${im.hppKnown ? marginColor(im.marginPct, im.margin < 0) : 'text-surface-300'}`}>
                                                        {im.hppKnown ? fmtRp(im.margin) : '—'}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-bold ${im.hppKnown ? marginColor(im.marginPct, im.margin < 0) : 'text-surface-300'}`}>
                                                        {im.hppKnown ? fmtPct(im.marginPct) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {knownCount > 0 && (
                                            <tfoot>
                                                <tr className="bg-violet-100/80 border-t-2 border-violet-300">
                                                    <td className="px-3 py-2 text-xs font-bold text-violet-700">
                                                        Gross Margin
                                                        {hasUnknownHpp && <span className="ml-1 font-normal text-amber-600">({knownCount}/{itemMargins.length} item)</span>}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-xs font-bold text-violet-700 font-mono">
                                                        {fmtRp(knownRevenue)}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-xs font-bold text-violet-700 font-mono">
                                                        {fmtRp(totalHpp)}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right text-sm font-extrabold font-mono ${marginColor(grossMarginPct, grossMargin < 0)}`}>
                                                        {fmtRp(grossMargin)}
                                                    </td>
                                                    <td className={`px-3 py-2 text-right text-sm font-extrabold ${marginColor(grossMarginPct, grossMargin < 0)}`}>
                                                        {fmtPct(grossMarginPct)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* ── CASHBACK / ADJUSTMENTS ── */}
                            <div className="border-t border-violet-200 px-5 py-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wider">
                                        Simulasi Cashback / Biaya Tambahan
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleAddAdjustment}
                                        className="flex items-center gap-1 text-xs font-semibold text-violet-600 bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-200 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Tambah
                                    </button>
                                </div>

                                {safeAdjustments.length === 0 ? (
                                    <p className="text-xs text-violet-300 italic mb-2">
                                        Belum ada biaya tambahan — klik "+ Tambah" untuk menambahkan.
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2 mb-3">
                                        {safeAdjustments.map((adj) => (
                                            <div key={adj.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                <select
                                                    value={adj.category || 'Transport & Accommodation'}
                                                    onChange={e => handleChangeAdjustment(adj.id, 'category', e.target.value)}
                                                    onBlur={handleBlurAdjustment}
                                                    className="w-full sm:w-48 text-xs border border-violet-200 bg-white rounded-lg px-2.5 py-1.5 text-surface-700 outline-none focus:border-violet-400 font-medium"
                                                >
                                                    {CATEGORY_OPTIONS.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    placeholder="Label / Keterangan (opsional)"
                                                    value={adj.label || ''}
                                                    onChange={e => handleChangeAdjustment(adj.id, 'label', e.target.value)}
                                                    onBlur={handleBlurAdjustment}
                                                    className="flex-1 min-w-0 text-xs border border-violet-200 bg-white rounded-lg px-3 py-1.5 text-surface-700 outline-none focus:outline-none focus:ring-0 focus:border-violet-400 placeholder-surface-300"
                                                />
                                                <div className="flex items-center bg-white border border-violet-200 rounded-lg px-2 py-1.5 gap-1 w-full sm:w-36 shrink-0 focus-within:border-violet-400">
                                                    <span className="text-xs text-surface-400">Rp</span>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={adj.amount}
                                                        onChange={e => handleChangeAdjustment(adj.id, 'amount', e.target.value)}
                                                        onBlur={handleBlurAdjustment}
                                                        className="w-full text-xs text-right bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-surface-800 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAdjustment(adj.id)}
                                                    className="w-7 h-7 shrink-0 flex items-center justify-center text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* ── NET MARGIN RESULT ── */}
                                {knownCount > 0 && (
                                    <div className={`rounded-xl border p-4 mt-2 ${
                                        isNegative
                                            ? 'bg-red-50 border-red-200'
                                            : netMarginPct < 10
                                                ? 'bg-amber-50 border-amber-200'
                                                : 'bg-emerald-50 border-emerald-200'
                                    }`}>
                                        {safeAdjustments.length > 0 && (
                                            <div className="flex items-center justify-between mb-2 text-xs text-surface-500">
                                                <span>Total Cashback / Biaya</span>
                                                <span className="font-mono font-semibold text-red-500">
                                                    <Minus className="inline w-3 h-3" /> {fmtRp(totalAdjustments)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className={`text-xs font-bold uppercase tracking-wide ${isNegative ? 'text-red-600' : 'text-emerald-700'}`}>
                                                    {isNegative
                                                        ? '⚠ Margin Negatif!'
                                                        : safeAdjustments.length > 0 ? 'Net Margin' : 'Gross Margin'}
                                                </p>
                                                <p className={`text-xl font-extrabold font-mono mt-0.5 ${marginColor(safeAdjustments.length > 0 ? netMarginPct : grossMarginPct, isNegative)}`}>
                                                    {fmtRp(safeAdjustments.length > 0 ? netMargin : grossMargin)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                {isNegative
                                                    ? <TrendingDown className="w-7 h-7 text-red-400 mb-1 ml-auto" />
                                                    : <TrendingUp className="w-7 h-7 text-emerald-400 mb-1 ml-auto" />}
                                                <p className={`text-2xl font-extrabold ${marginColor(safeAdjustments.length > 0 ? netMarginPct : grossMarginPct, isNegative)}`}>
                                                    {fmtPct(safeAdjustments.length > 0 ? netMarginPct : grossMarginPct)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {knownCount === 0 && (
                                    <div className="text-xs text-surface-400 text-center py-3 italic">
                                        Belum ada item dengan HPP — margin tidak dapat dihitung.
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-violet-200 px-5 py-2.5 flex justify-end">
                                <SaveStatus status={saveStatus} />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
