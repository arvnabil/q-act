import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    TrendingUp, Plus, Search, Filter, LayoutGrid, List, X,
    ChevronDown, ChevronLeft, ChevronRight, Building2, User, ArrowRight, MoreHorizontal,
    FileText, DollarSign, Clock, Tag, AlertTriangle, Settings, SlidersHorizontal, Palette
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────────

const STAGE_META = {
    lead_masuk:          { label: 'Lead Masuk',          color: 'bg-surface-100 text-surface-600',  dot: 'bg-surface-400',  border: 'border-surface-200' },
    follow_up:           { label: 'Follow Up',           color: 'bg-blue-100 text-blue-700',        dot: 'bg-blue-500',     border: 'border-blue-200' },
    lead_qualification:  { label: 'Lead Qualification',  color: 'bg-amber-100 text-amber-700',      dot: 'bg-amber-500',    border: 'border-amber-200' },
    negotiation:         { label: 'Negotiation',         color: 'bg-teal-100 text-teal-700',        dot: 'bg-teal-600',     border: 'border-teal-200' },
    win:                 { label: 'Win',                 color: 'bg-violet-100 text-violet-700',    dot: 'bg-violet-500',   border: 'border-violet-200' },
    lost:                { label: 'Lost',                color: 'bg-emerald-100 text-emerald-700',  dot: 'bg-emerald-500',  border: 'border-emerald-200' },
    selesai_terbayar:    { label: 'Selesai (Terbayar)',  color: 'bg-red-100 text-red-600',          dot: 'bg-red-500',      border: 'border-red-200' },
    // Backwards compatibility with previous keys
    data_masuk:          { label: 'Lead Masuk',          color: 'bg-surface-100 text-surface-600',  dot: 'bg-surface-400',  border: 'border-surface-200' },
    sph_terlayang:       { label: 'Follow Up',           color: 'bg-blue-100 text-blue-700',        dot: 'bg-blue-500',     border: 'border-blue-200' },
    hot_progress:        { label: 'Lead Qualification',  color: 'bg-amber-100 text-amber-700',      dot: 'bg-amber-500',    border: 'border-amber-200' },
    proyek_deal:         { label: 'Negotiation',         color: 'bg-teal-100 text-teal-700',        dot: 'bg-teal-600',     border: 'border-teal-200' },
    proyek_berjalan:     { label: 'Win',                 color: 'bg-violet-100 text-violet-700',    dot: 'bg-violet-500',   border: 'border-violet-200' },
    proyek_selesai:      { label: 'Selesai (Terbayar)',  color: 'bg-red-100 text-red-600',          dot: 'bg-red-500',      border: 'border-red-200' },
    no_deal:             { label: 'Lost',                color: 'bg-emerald-100 text-emerald-700',  dot: 'bg-emerald-500',  border: 'border-emerald-200' },
};

const SOURCE_LABEL = {
    referral:   'Referral',
    cold_call:  'Cold Call',
    website:    'Website',
    exhibition: 'Pameran',
    generate_ai:'Generate AI',
    other:      'Lainnya',
};

const formatRp = (n) => {
    if (!n) return 'Rp 0';
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
    if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
    if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)}rb`;
    return `Rp ${n.toLocaleString('id-ID')}`;
};

const daysSince = (dateStr) => {
    if (!dateStr) return 0;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / 86400000);
};

const initials = (name) => {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

// ─── Stage Badge ─────────────────────────────────────────────────────────────────

function StageBadge({ stage }) {
    const meta = STAGE_META[stage] || { label: stage, color: 'bg-surface-100 text-surface-600' };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
        </span>
    );
}

// ─── Lead Card ───────────────────────────────────────────────────────────────────

const ACTIVE_STAGE_KEYS = ['lead_masuk', 'follow_up', 'lead_qualification', 'negotiation', 'win', 'lost', 'selesai_terbayar'];

function LeadCard({ lead, onStageChange, onViewDetail }) {
    const [showMenu, setShowMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const days = daysSince(lead.created_at);
    const isStale = days > 3 && !['selesai_terbayar', 'win', 'lost', 'proyek_selesai', 'no_deal'].includes(lead.stage);

    const handleDragStart = (e) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', JSON.stringify({ leadId: lead.id, fromStage: lead.stage }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`bg-white rounded-xl border ${
                STAGE_META[lead.stage]?.border || 'border-surface-200'
            } shadow-sm p-3.5 space-y-2.5 hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none group relative ${
                isDragging ? 'opacity-30 scale-95 border-dashed border-brand-500 shadow-none' : ''
            }`}
            onClick={() => onViewDetail(lead)}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {lead.lead_code && (
                        <span className="text-[10px] text-surface-400 font-mono">{lead.lead_code}</span>
                    )}
                    <p className="text-sm font-semibold text-surface-800 leading-snug line-clamp-2">{lead.title}</p>
                </div>
                <div className="relative shrink-0" onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }}>
                    <button className="p-1 rounded-lg text-surface-400 hover:bg-surface-100 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-7 bg-white border border-surface-200 rounded-xl shadow-xl z-20 w-44 py-1 text-sm">
                            {ACTIVE_STAGE_KEYS.map(key => key !== lead.stage && STAGE_META[key] && (
                                <button key={key}
                                    className="w-full text-left px-3 py-2 hover:bg-surface-50 flex items-center gap-2"
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onStageChange(lead, key); }}>
                                    <span className={`w-2 h-2 rounded-full ${STAGE_META[key].dot}`} />
                                    {STAGE_META[key].label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Customer */}
            {(lead.customer_name || lead.customer?.name) && (
                <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lead.customer?.name || lead.customer_name}</span>
                </div>
            )}

            {/* Value */}
            {lead.estimated_value > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatRp(lead.estimated_value)}</span>
                </div>
            )}

            {/* Quotation link */}
            {lead.quotation && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>SPH terlampir</span>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-surface-100">
                {/* Sales initials */}
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                        {initials(lead.sales?.name)}
                    </div>
                    <span className="text-[10px] text-surface-400 truncate max-w-[80px]">{lead.sales?.name}</span>
                </div>

                {/* Days */}
                <div className={`flex items-center gap-1 text-[10px] ${isStale ? 'text-amber-600 font-semibold' : 'text-surface-400'}`}>
                    {isStale && <AlertTriangle className="w-3 h-3" />}
                    <Clock className="w-3 h-3" />
                    <span>{days}h lalu</span>
                </div>
            </div>
        </div>
    );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────────

function KanbanColumn({ stage, leads, onStageChange, onViewDetail, onAddLead, onDropCard }) {
    const meta = STAGE_META[stage];
    const totalValue = leads.reduce((s, l) => s + (l.estimated_value || 0), 0);
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isOver) setIsOver(true);
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsOver(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsOver(false);
        try {
            const raw = e.dataTransfer.getData('text/plain');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && data.leadId && data.fromStage !== stage) {
                onDropCard(data.leadId, stage, data.fromStage);
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col w-72 shrink-0 h-[calc(100vh-270px)] min-h-[520px] transition-all rounded-xl ${
                isOver ? 'ring-2 ring-brand-500 scale-[1.01]' : ''
            }`}
        >
            {/* Column header */}
            <div className={`rounded-t-xl px-3 py-2.5 border-b-2 ${meta.border} bg-white border border-b-0 border-surface-200 shrink-0`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                        <span className="text-sm font-bold text-surface-700">{meta.label}</span>
                        <span className="text-xs font-bold text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded-full">{leads.length}</span>
                    </div>
                    <button
                        className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-brand-600 transition-colors"
                        onClick={() => onAddLead(stage)}
                        title="Tambah lead di stage ini">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                {totalValue > 0 && (
                    <p className="text-xs text-surface-400 mt-0.5 pl-4">{formatRp(totalValue)}</p>
                )}
            </div>

            {/* Cards */}
            <div className={`flex-1 overflow-y-auto space-y-2.5 p-2.5 border border-t-0 border-surface-200 rounded-b-xl flex flex-col transition-colors ${
                isOver ? 'bg-brand-50/40 border-brand-300' : 'bg-surface-50'
            }`}>
                {leads.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-surface-400 text-xs">
                        <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
                        <span>{isOver ? 'Lepaskan di sini' : 'Belum ada lead'}</span>
                    </div>
                ) : (
                    leads.map(lead => (
                        <LeadCard key={lead.id} lead={lead}
                            onStageChange={onStageChange}
                            onViewDetail={onViewDetail} />
                    ))
                )}
            </div>
        </div>
    );
}

// ─── Lead Form Modal ──────────────────────────────────────────────────────────────

function LeadFormModal({ open, onClose, defaultStage, customers, salesUsers, sources, stages, isManagerOrAdmin, currentUser }) {
    const [form, setForm] = useState({
        title: '', customer_id: '', customer_name: '', customer_phone: '',
        customer_email: '', sales_id: currentUser?.id || '', stage: defaultStage || 'data_masuk',
        source: '', estimated_value: '', notes: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(route('leads.store'), form, {
            onFinish: () => { setSubmitting(false); onClose(); },
            onSuccess: () => setForm({ title: '', customer_id: '', customer_name: '', customer_phone: '', customer_email: '', sales_id: currentUser?.id || '', stage: defaultStage || 'data_masuk', source: '', estimated_value: '', notes: '' }),
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                    <h2 className="text-base font-bold text-surface-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-600" />
                        Tambah Lead Baru
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Judul Lead <span className="text-red-500">*</span></label>
                        <input className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="e.g. Proyek Renovasi Kantor PT XYZ"
                            value={form.title} onChange={e => set('title', e.target.value)} required />
                    </div>

                    {/* Customer */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Pilih Customer (opsional)</label>
                            <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                                <option value="">-- Manual Input --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Nama Perusahaan</label>
                            <input className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Nama perusahaan"
                                value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">No. Telepon</label>
                            <input className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="08xx-xxxx-xxxx"
                                value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Email</label>
                            <input type="email" className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="email@company.com"
                                value={form.customer_email} onChange={e => set('customer_email', e.target.value)} />
                        </div>
                    </div>

                    {/* Stage & Source */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Stage</label>
                            <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={form.stage} onChange={e => set('stage', e.target.value)}>
                                {stages.map(s => <option key={s} value={s}>{STAGE_META[s]?.label || s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Sumber Lead</label>
                            <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={form.source} onChange={e => set('source', e.target.value)}>
                                <option value="">-- Pilih Sumber --</option>
                                {sources.map(s => <option key={s} value={s}>{SOURCE_LABEL[s] || s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Sales & Value */}
                    <div className="grid grid-cols-2 gap-3">
                        {isManagerOrAdmin && (
                            <div>
                                <label className="block text-xs font-semibold text-surface-600 mb-1">Sales</label>
                                <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={form.sales_id} onChange={e => set('sales_id', e.target.value)}>
                                    <option value="">-- Pilih Sales --</option>
                                    {salesUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className={isManagerOrAdmin ? '' : 'col-span-2'}>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Estimasi Nilai (Rp)</label>
                            <input type="number" className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="0"
                                value={form.estimated_value} onChange={e => set('estimated_value', e.target.value)} />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Catatan</label>
                        <textarea className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            rows={3} placeholder="Catatan awal mengenai lead ini..."
                            value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting}
                            className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2">
                            {submitting ? 'Menyimpan...' : <><Plus className="w-4 h-4" /> Tambah Lead</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── List View ────────────────────────────────────────────────────────────────────

function ListView({ grouped, onStageChange, onViewDetail }) {
    const allLeads = Object.values(grouped).flat();

    return (
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-surface-200 bg-surface-50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Lead</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Sales</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Stage</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-surface-500 uppercase tracking-wider">Est. Nilai</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Tanggal</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Quotation</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                    {allLeads.map(lead => {
                        const days = daysSince(lead.created_at);
                        const isStale = days > 3 && !['selesai_terbayar', 'win', 'lost', 'proyek_selesai', 'no_deal'].includes(lead.stage);
                        return (
                            <tr key={lead.id}
                                className="hover:bg-surface-50 cursor-pointer transition-colors"
                                onClick={() => onViewDetail(lead)}>
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="font-semibold text-surface-800 text-sm line-clamp-1">{lead.title}</p>
                                        {lead.lead_code && <p className="text-xs text-surface-400 font-mono">{lead.lead_code}</p>}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-surface-600 text-sm">{lead.customer?.name || lead.customer_name || '—'}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                                            {initials(lead.sales?.name)}
                                        </div>
                                        <span className="text-sm text-surface-600 truncate max-w-[80px]">{lead.sales?.name || '—'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3"><StageBadge stage={lead.stage} /></td>
                                <td className="px-4 py-3 text-right font-semibold text-surface-700">{formatRp(lead.estimated_value)}</td>
                                <td className="px-4 py-3">
                                    <div className={`flex items-center gap-1 text-xs ${isStale ? 'text-amber-600 font-semibold' : 'text-surface-400'}`}>
                                        {isStale && <AlertTriangle className="w-3.5 h-3.5" />}
                                        {days}h lalu
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {lead.quotation ? (
                                        <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">Ada SPH</span>
                                    ) : (
                                        <span className="text-xs text-surface-300">—</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {allLeads.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-4 py-16 text-center text-surface-400">
                                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="font-semibold">Belum ada lead</p>
                                <p className="text-xs mt-1">Tambahkan lead pertama Anda</p>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ─── Pipeline Settings Modal ──────────────────────────────────────────────────────

function PipelineSettingsModal({ open, onClose, settings, stages, onSave }) {
    const [stagesList, setStagesList] = useState(settings?.stages || []);
    const [fStage1, setFStage1] = useState(settings?.featured_stage_1 || 'negotiation');
    const [fStage2, setFStage2] = useState(settings?.featured_stage_2 || 'win');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (settings?.stages) {
            setStagesList(settings.stages);
        }
        if (settings?.featured_stage_1) setFStage1(settings.featured_stage_1);
        if (settings?.featured_stage_2) setFStage2(settings.featured_stage_2);
    }, [settings, open]);

    if (!open) return null;

    const handleStageNameChange = (key, name) => {
        setStagesList(prev => prev.map(s => s.key === key ? { ...s, name } : s));
    };

    const handleStageColorChange = (key, color) => {
        setStagesList(prev => prev.map(s => s.key === key ? { ...s, color } : s));
    };

    const handleStageTypeChange = (key, type) => {
        setStagesList(prev => prev.map(s => s.key === key ? { ...s, type } : s));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                featured_stage_1: fStage1,
                featured_stage_2: fStage2,
                stages: stagesList,
            };
            const res = await axios.post(route('leads.settings.update'), payload);
            toast.success(res.data?.message || 'Pengaturan pipeline berhasil disimpan');
            if (onSave) onSave(res.data?.settings || payload);
            onClose();
        } catch (err) {
            console.error('Save pipeline settings error:', err);
            toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan pipeline');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                            <Settings className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-surface-800">Pengaturan Tahap Pipeline</h2>
                            <p className="text-xs text-surface-500">Khusus Manager & Administrator</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form content */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Ringkasan Dashboard Card Section */}
                    <div className="bg-surface-50 rounded-xl p-4 border border-surface-200 space-y-3">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                            <h3 className="text-sm font-bold text-surface-800">Card Ringkasan Pipeline (Header)</h3>
                        </div>
                        <p className="text-xs text-surface-500">
                            Pilih 2 status stage yang ingin dipantau pada card ringkasan di bagian atas dashboard pipeline.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-semibold text-surface-600 mb-1">Card Status 1</label>
                                <select
                                    value={fStage1}
                                    onChange={e => setFStage1(e.target.value)}
                                    className="w-full bg-white border border-surface-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    {stagesList.map(s => (
                                        <option key={s.key} value={s.key}>{s.name} ({s.key})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-600 mb-1">Card Status 2</label>
                                <select
                                    value={fStage2}
                                    onChange={e => setFStage2(e.target.value)}
                                    className="w-full bg-white border border-surface-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                >
                                    {stagesList.map(s => (
                                        <option key={s.key} value={s.key}>{s.name} ({s.key})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tahap Pipeline Section */}
                    <div>
                        <div className="mb-3">
                            <h3 className="text-sm font-bold text-surface-800">Tahap pipeline</h3>
                            <p className="text-xs text-surface-500 leading-relaxed mt-0.5">
                                Tipe menentukan perhitungan dashboard: <strong>Deal</strong> = menang, <strong>Lost</strong> = gugur, <strong>Normal</strong> = masih jalan. Hanya owner/manager yang dapat mengubah tahap pipeline; tim mengikuti pengaturan ini.
                            </p>
                        </div>

                        <div className="space-y-2.5">
                            {stagesList.map(s => (
                                <div key={s.key} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-surface-200 hover:border-surface-300 transition-colors">
                                    <div className="relative group shrink-0">
                                        <label
                                            className="relative w-8 h-8 rounded-lg flex items-center justify-center shadow-xs cursor-pointer border border-black/10 overflow-hidden hover:ring-2 hover:ring-brand-500 hover:ring-offset-1 transition-all"
                                            style={{ backgroundColor: s.color || '#94A3B8' }}
                                            title="Klik untuk ubah warna tahap"
                                        >
                                            <input
                                                type="color"
                                                value={s.color || '#94A3B8'}
                                                onChange={e => handleStageColorChange(s.key, e.target.value)}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                            />
                                            <Palette className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-90 drop-shadow pointer-events-none transition-opacity" />
                                        </label>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="text"
                                            value={s.name}
                                            onChange={e => handleStageNameChange(s.key, e.target.value)}
                                            placeholder="Nama Tahap..."
                                            className="w-full border border-surface-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                    <div className="w-36 shrink-0">
                                        <select
                                            value={s.type || 'normal'}
                                            onChange={e => handleStageTypeChange(s.key, e.target.value)}
                                            className="w-full border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-surface-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="deal">Deal (menang)</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-xl transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-60 shadow-xs"
                        >
                            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function Leads({ grouped, stats, salesUsers, filters, isManagerOrAdmin, stages, sources, customers, pipelineSettings }) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;

    const [view, setView] = useState('kanban');
    const [search, setSearch] = useState(filters?.search || '');
    const [filterStage, setFilterStage] = useState(filters?.stage || '');
    const [filterSales, setFilterSales] = useState(filters?.sales_id || '');
    const [showForm, setShowForm] = useState(false);
    const [defaultFormStage, setDefaultFormStage] = useState('lead_masuk');
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const [localGrouped, setLocalGrouped] = useState(grouped);
    const [localStats, setLocalStats] = useState(stats);

    const defaultPipelineSettings = {
        featured_stage_1: 'negotiation',
        featured_stage_2: 'win',
        stages: stages.map(s => ({
            key: s,
            name: STAGE_META[s]?.label || s,
            type: (s === 'win' || s === 'selesai_terbayar' || s === 'proyek_deal' || s === 'proyek_selesai') ? 'deal' : (s === 'lost' || s === 'no_deal') ? 'lost' : 'normal',
            color: s === 'lead_masuk' ? '#94A3B8' : s === 'follow_up' ? '#3B82F6' : s === 'lead_qualification' ? '#F59E0B' : s === 'negotiation' ? '#009680' : s === 'win' ? '#8B5CF6' : s === 'lost' ? '#10B981' : s === 'selesai_terbayar' ? '#EF4444' : '#94A3B8',
        })),
    };

    const [localSettings, setLocalSettings] = useState(pipelineSettings || defaultPipelineSettings);

    useEffect(() => {
        setLocalGrouped(grouped);
        setLocalStats(stats);
    }, [grouped, stats]);

    useEffect(() => {
        if (pipelineSettings) {
            const hasLegacySph = pipelineSettings.stages?.some(s => s.key === 'sph_terlayang');
            if (hasLegacySph) {
                setLocalSettings(defaultPipelineSettings);
            } else {
                setLocalSettings(pipelineSettings);
            }
        }
    }, [pipelineSettings]);

    // Build stage meta with updated custom labels and types
    const stageMetaMap = { ...STAGE_META };
    (localSettings?.stages || []).forEach(st => {
        if (stageMetaMap[st.key]) {
            stageMetaMap[st.key] = {
                ...stageMetaMap[st.key],
                label: st.name || stageMetaMap[st.key].label,
                type: st.type || 'normal',
            };
        }
    });

    const curFeatured1 = localSettings?.featured_stage_1 || 'negotiation';
    const curFeatured2 = localSettings?.featured_stage_2 || 'win';

    const activeStagesList = (localSettings?.stages && localSettings.stages.length > 0)
        ? localSettings.stages
        : stages.map(s => ({ key: s, name: STAGE_META[s]?.label || s }));

    // Dynamically calculate counts directly from localGrouped so filters & drag-and-drop always match!
    const totalLeadsCount = Object.values(localGrouped).reduce((sum, list) => sum + (list?.length || 0), 0);
    const totalEstValue = Object.values(localGrouped).flat().reduce((sum, l) => sum + (Number(l.estimated_value) || 0), 0);

    const handleQuickChangeFeatured = async (cardIndex, newStageKey) => {
        const payload = cardIndex === 1
            ? { featured_stage_1: newStageKey }
            : { featured_stage_2: newStageKey };

        setLocalSettings(prev => ({ ...prev, ...payload }));

        try {
            await axios.post(route('leads.settings.update'), payload);
            toast.success(`Card ${cardIndex} diubah ke "${stageMetaMap[newStageKey]?.label || newStageKey}"`);
        } catch (err) {
            console.error('Quick change featured stage error:', err);
            toast.error('Gagal mengubah card status');
        }
    };

    const kanbanRef = useRef(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [visibleRange, setVisibleRange] = useState('Tahap 1–4 dari 7');

    const handleKanbanScroll = () => {
        if (!kanbanRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = kanbanRef.current;
        const maxScroll = scrollWidth - clientWidth;
        if (maxScroll > 0) {
            setScrollProgress((scrollLeft / maxScroll) * 100);
            const colWidth = 304;
            const first = Math.min(stages.length, Math.floor(scrollLeft / colWidth) + 1);
            const count = Math.max(1, Math.round(clientWidth / colWidth));
            const last = Math.min(stages.length, first + count - 1);
            setVisibleRange(`Tahap ${first}–${last} dari ${stages.length}`);
        } else {
            setVisibleRange(`Tahap 1–${stages.length} dari ${stages.length}`);
        }
    };

    const scrollKanban = (dir) => {
        if (!kanbanRef.current) return;
        const amount = dir === 'left' ? -320 : 320;
        kanbanRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    };

    useEffect(() => {
        if (view === 'kanban') {
            handleKanbanScroll();
        }
    }, [view, stages]);

    const applyFilters = useCallback(() => {
        router.get(route('leads.index'), {
            search: search || undefined,
            stage: filterStage || undefined,
            sales_id: filterSales || undefined,
        }, { preserveState: true, replace: true });
    }, [search, filterStage, filterSales]);

    const handleStageChange = (lead, newStage) => {
        handleDropCard(lead.id, newStage, lead.stage);
    };

    const handleDropCard = (leadId, targetStage, fromStage) => {
        if (targetStage === fromStage) return;

        // Instant optimistic update
        setLocalGrouped(prev => {
            const copy = {};
            stages.forEach(st => {
                copy[st] = [...(prev[st] || [])];
            });

            const leadIndex = (copy[fromStage] || []).findIndex(l => l.id === leadId);
            if (leadIndex === -1) return prev;

            const [movedLead] = copy[fromStage].splice(leadIndex, 1);
            movedLead.stage = targetStage;
            copy[targetStage] = [movedLead, ...(copy[targetStage] || [])];
            return copy;
        });

        // Update local stats instantly
        setLocalStats(prev => {
            const next = { ...prev };
            if (fromStage === 'hot_progress') next.hotProgress = Math.max(0, (next.hotProgress || 1) - 1);
            if (targetStage === 'hot_progress') next.hotProgress = (next.hotProgress || 0) + 1;
            if (fromStage === 'proyek_deal') next.proyekDeal = Math.max(0, (next.proyekDeal || 1) - 1);
            if (targetStage === 'proyek_deal') next.proyekDeal = (next.proyekDeal || 0) + 1;
            return next;
        });

        // Persist to database silently via background AJAX (no Inertia loading bar)
        axios.patch(route('leads.stage.update', leadId), { stage: targetStage })
            .then(() => {
                toast.success(`Stage dipindahkan ke "${STAGE_META[targetStage]?.label || targetStage}"`);
            })
            .catch(err => {
                console.error('Failed to update stage in background:', err);
                toast.error('Gagal memindahkan stage');
                setLocalGrouped(grouped);
                setLocalStats(stats);
            });
    };

    const handleViewDetail = (lead) => {
        router.visit(route('leads.show', lead.id));
    };

    const handleAddLead = (stage = 'data_masuk') => {
        setDefaultFormStage(stage);
        setShowForm(true);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Lead Pipeline" />

            <div className="flex-1 flex flex-col -m-5 lg:-m-7 bg-surface-50 min-h-screen">
                {/* Page Header */}
                <div className="bg-white border-b border-surface-200 px-6 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-surface-400 mb-1">
                                <span>Sales Workspace</span>
                                <span>/</span>
                                <span className="text-brand-600 font-semibold">Lead Pipeline</span>
                            </div>
                            <h1 className="text-xl font-bold text-surface-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-brand-600" />
                                Lead Pipeline
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {isManagerOrAdmin && (
                                <button
                                    onClick={() => setShowSettingsModal(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 border border-surface-200 hover:bg-surface-50 text-surface-700 text-sm font-semibold rounded-xl transition-colors">
                                    <Settings className="w-4 h-4 text-surface-500" />
                                    Pengaturan Pipeline
                                </button>
                            )}
                            <button
                                onClick={() => handleAddLead('data_masuk')}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors">
                                <Plus className="w-4 h-4" />
                                Tambah Lead
                            </button>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        {/* Card 1: Total Lead */}
                        <div className="bg-surface-50 rounded-xl px-4 py-3 border border-surface-200">
                            <p className="text-lg font-bold text-surface-800">{totalLeadsCount}</p>
                            <p className="text-xs font-semibold text-surface-600">Total Lead</p>
                            <p className="text-[10px] text-surface-400">
                                {search || filterStage || filterSales ? 'Sesuai filter aktif' : 'Semua aktif'}
                            </p>
                        </div>

                        {/* Card 2: Status 1 (Dinamis) */}
                        <div className="bg-surface-50 rounded-xl px-4 py-3 border border-surface-200">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-lg font-bold text-amber-600">
                                    {localGrouped[curFeatured1]?.length || 0}
                                </p>
                                {isManagerOrAdmin && (
                                    <select
                                        value={curFeatured1}
                                        onChange={(e) => handleQuickChangeFeatured(1, e.target.value)}
                                        className="text-[10px] font-semibold text-surface-600 bg-white border border-surface-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer max-w-[120px] truncate"
                                        title="Pilih status card 1"
                                    >
                                        {activeStagesList.map(s => (
                                            <option key={s.key} value={s.key}>{s.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-surface-600 truncate mt-0.5">
                                {stageMetaMap[curFeatured1]?.label || curFeatured1}
                            </p>
                            <p className="text-[10px] text-surface-400">
                                {stageMetaMap[curFeatured1]?.type === 'deal' ? 'Deal (menang)' : stageMetaMap[curFeatured1]?.type === 'lost' ? 'Lost (gugur)' : 'Sedang proses'}
                            </p>
                        </div>

                        {/* Card 3: Status 2 (Dinamis) */}
                        <div className="bg-surface-50 rounded-xl px-4 py-3 border border-surface-200">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-lg font-bold text-brand-600">
                                    {localGrouped[curFeatured2]?.length || 0}
                                </p>
                                {isManagerOrAdmin && (
                                    <select
                                        value={curFeatured2}
                                        onChange={(e) => handleQuickChangeFeatured(2, e.target.value)}
                                        className="text-[10px] font-semibold text-surface-600 bg-white border border-surface-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer max-w-[120px] truncate"
                                        title="Pilih status card 2"
                                    >
                                        {activeStagesList.map(s => (
                                            <option key={s.key} value={s.key}>{s.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-surface-600 truncate mt-0.5">
                                {stageMetaMap[curFeatured2]?.label || curFeatured2}
                            </p>
                            <p className="text-[10px] text-surface-400">
                                {stageMetaMap[curFeatured2]?.type === 'deal' ? 'Deal terkonfirmasi' : stageMetaMap[curFeatured2]?.type === 'lost' ? 'Lost (gugur)' : 'Sedang proses'}
                            </p>
                        </div>

                        {/* Card 4: Est. Total Nilai */}
                        <div className="bg-surface-50 rounded-xl px-4 py-3 border border-surface-200">
                            <p className="text-lg font-bold text-emerald-600">{formatRp(totalEstValue)}</p>
                            <p className="text-xs font-semibold text-surface-600">Est. Total Nilai</p>
                            <p className="text-[10px] text-surface-400">Pipeline value</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 bg-white border-b border-surface-200 flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                        <input
                            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Cari lead, customer..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()}
                        />
                    </div>

                    {/* Stage filter */}
                    <select
                        className="border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={filterStage}
                        onChange={e => { setFilterStage(e.target.value); }}>
                        <option value="">Semua Stage</option>
                        {stages.map(s => <option key={s} value={s}>{STAGE_META[s]?.label || s}</option>)}
                    </select>

                    {/* Sales filter (manager only) */}
                    {isManagerOrAdmin && (
                        <select
                            className="border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={filterSales}
                            onChange={e => setFilterSales(e.target.value)}>
                            <option value="">Semua Sales</option>
                            {salesUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    )}

                    <button onClick={applyFilters}
                        className="px-3 py-2 text-sm font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-1.5">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>

                    {/* View toggle */}
                    <div className="ml-auto flex items-center border border-surface-200 rounded-lg overflow-hidden">
                        <button
                            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'kanban' ? 'bg-brand-600 text-white' : 'bg-white text-surface-500 hover:bg-surface-50'}`}
                            onClick={() => setView('kanban')}>
                            <LayoutGrid className="w-4 h-4" />
                            Kanban
                        </button>
                        <button
                            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-brand-600 text-white' : 'bg-white text-surface-500 hover:bg-surface-50'}`}
                            onClick={() => setView('list')}>
                            <List className="w-4 h-4" />
                            List
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                    {view === 'kanban' ? (
                        <>
                            {/* Top Kanban Horizontal Scroll Controller */}
                            <div className="flex items-center gap-3 py-1.5 px-3 mb-3 bg-white rounded-xl border border-surface-200 shadow-xs">
                                <button
                                    onClick={() => scrollKanban('left')}
                                    className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-surface-600 hover:text-brand-600 transition-colors"
                                    title="Geser ke kiri"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex-1 relative flex items-center px-1">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={scrollProgress}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setScrollProgress(val);
                                            if (kanbanRef.current) {
                                                const max = kanbanRef.current.scrollWidth - kanbanRef.current.clientWidth;
                                                kanbanRef.current.scrollLeft = (max * val) / 100;
                                            }
                                        }}
                                        className="w-full h-1.5 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                                    />
                                </div>

                                <button
                                    onClick={() => scrollKanban('right')}
                                    className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center text-surface-600 hover:text-brand-600 transition-colors"
                                    title="Geser ke kanan"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>

                                <span className="text-xs font-semibold text-surface-500 shrink-0 px-2 min-w-[120px] text-right">
                                    {visibleRange}
                                </span>
                            </div>

                            <div
                                ref={kanbanRef}
                                onScroll={handleKanbanScroll}
                                className="flex gap-4 overflow-x-auto pb-4 flex-1 items-stretch"
                            >
                                {stages.map(stage => (
                                    <KanbanColumn
                                        key={stage}
                                        stage={stage}
                                        leads={localGrouped[stage] || []}
                                        onStageChange={handleStageChange}
                                        onViewDetail={handleViewDetail}
                                        onAddLead={handleAddLead}
                                        onDropCard={handleDropCard}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <ListView
                            grouped={localGrouped}
                            onStageChange={handleStageChange}
                            onViewDetail={handleViewDetail}
                        />
                    )}
                </div>
            </div>

            {/* Add Lead Modal */}
            <LeadFormModal
                open={showForm}
                onClose={() => setShowForm(false)}
                defaultStage={defaultFormStage}
                customers={customers}
                salesUsers={salesUsers}
                sources={sources}
                stages={stages}
                isManagerOrAdmin={isManagerOrAdmin}
                currentUser={currentUser}
            />

            {/* Pipeline Settings Modal (Manager & Admin only) */}
            {isManagerOrAdmin && (
                <PipelineSettingsModal
                    open={showSettingsModal}
                    onClose={() => setShowSettingsModal(false)}
                    settings={localSettings}
                    stages={stages}
                    onSave={(newSettings) => setLocalSettings(newSettings)}
                />
            )}
        </AuthenticatedLayout>
    );
}

