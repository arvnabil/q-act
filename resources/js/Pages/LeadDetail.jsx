import useAgendaCancellation from '@/Components/useAgendaCancellation';
import LeadInformationEditor from '@/Components/LeadInformationEditor';
import WorkflowPanel from '@/Components/WorkflowPanel';
import React, { useState, useEffect, useRef } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatRupiah, formatCompactRupiah } from '@/utils/money';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    TrendingUp, ArrowLeft, Building2, User, DollarSign, FileText,
    Clock, Plus, X, ChevronRight, Edit2, Trash2, MapPin,
    Phone, Mail, MessageSquare, Calendar, CheckCircle2, Tag,
    MessageCircle, Video, Send, ChevronDown, Pencil, Check,
    Navigation, AlertCircle, ShoppingCart, Users, Briefcase,
    ExternalLink, ShieldCheck
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────────

const STAGE_META = {
    lead_masuk:          { label: 'Lead Masuk',          color: 'bg-surface-100 text-surface-600', dot: 'bg-surface-400' },
    follow_up:           { label: 'Follow Up',           color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
    lead_qualification:  { label: 'Lead Qualification',  color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
    negotiation:         { label: 'Negotiation',         color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-600' },
    win:                 { label: 'Win',                 color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
    lost:                { label: 'Lost',                color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    selesai_terbayar:    { label: 'Selesai (Terbayar)',  color: 'bg-red-100 text-red-600',         dot: 'bg-red-500' },
    // Backwards compatibility with previous keys
    data_masuk:          { label: 'Lead Masuk',          color: 'bg-surface-100 text-surface-600', dot: 'bg-surface-400' },
    sph_terlayang:       { label: 'Follow Up',           color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
    hot_progress:        { label: 'Lead Qualification',  color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
    proyek_deal:         { label: 'Negotiation',         color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-600' },
    proyek_berjalan:     { label: 'Win',                 color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
    proyek_selesai:      { label: 'Selesai (Terbayar)',  color: 'bg-red-100 text-red-600',         dot: 'bg-red-500' },
    no_deal:             { label: 'Lost',                color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

const ACTIVITY_CONFIG = {
    note:             { label: 'Catatan',              Icon: MessageSquare, color: 'bg-surface-100',  iconColor: 'text-surface-500',  system: false },
    call:             { label: 'Catatan Telepon',           Icon: Phone,         color: 'bg-blue-50',      iconColor: 'text-blue-500',     system: false },
    whatsapp:         { label: 'Catatan WhatsApp',          Icon: MessageCircle, color: 'bg-emerald-50',   iconColor: 'text-emerald-500',  system: false },
    email:            { label: 'Catatan Email',             Icon: Mail,          color: 'bg-violet-50',    iconColor: 'text-violet-500',   system: false },
    meeting:          { label: 'Catatan Meeting',       Icon: Video,         color: 'bg-amber-50',     iconColor: 'text-amber-500',    system: false },
    follow_up:        { label: 'Follow-up',             Icon: Clock,         color: 'bg-orange-50',    iconColor: 'text-orange-500',   system: false },
    visit:            { label: 'Kunjungan',             Icon: MapPin,        color: 'bg-teal-50',      iconColor: 'text-teal-500',     system: false },
    stage_change:     { label: 'Perubahan Stage',       Icon: ChevronRight,  color: 'bg-surface-100',  iconColor: 'text-surface-400',  system: true  },
    quotation_linked: { label: 'Quotation Dilampirkan', Icon: FileText,      color: 'bg-brand-50',     iconColor: 'text-brand-500',    system: true  },
    deal_won:         { label: 'Deal Menang',           Icon: CheckCircle2,  color: 'bg-emerald-50',   iconColor: 'text-emerald-500',  system: true  },
    deal_lost:        { label: 'Deal Gagal',            Icon: X,             color: 'bg-red-50',       iconColor: 'text-red-500',      system: true  },
};

const QUICK_LOG_TYPES = [
    { key: 'note',     label: 'Catatan',   Icon: MessageSquare, placeholder: 'Tulis catatan progress proyek...' },
    { key: 'call',     label: 'Telepon',   Icon: Phone,         placeholder: 'Ringkasan hasil panggilan telepon...' },
    { key: 'whatsapp', label: 'WhatsApp',  Icon: MessageCircle, placeholder: 'Ringkasan pesan WhatsApp dengan klien...' },
    { key: 'email',    label: 'Email',     Icon: Mail,          placeholder: 'Ringkasan email / dokumen terkirim...' },
    { key: 'meeting',  label: 'Meeting',   Icon: Video,         placeholder: 'Notulen meeting tatap muka atau video call...' },
];

const PIC_ROLES = {
    primary:    { label: 'Kontak Utama',         color: 'bg-teal-50 text-teal-700 border-teal-200' },
    technical:  { label: 'User Teknis',          color: 'bg-blue-50 text-blue-700 border-blue-200' },
    purchasing: { label: 'Purchasing / Pengadaan',color: 'bg-amber-50 text-amber-700 border-amber-200' },
    finance:    { label: 'Keuangan / Finance',   color: 'bg-violet-50 text-violet-700 border-violet-200' },
    other:      { label: 'Lainnya',              color: 'bg-surface-100 text-surface-600 border-surface-200' },
};

const QUOT_STATUS_COLORS = {
    created:     'bg-surface-100 text-surface-700',
    draft:       'bg-surface-100 text-surface-700',
    pending:     'bg-amber-100 text-amber-700',
    sent:        'bg-blue-100 text-blue-700',
    approved:    'bg-emerald-100 text-emerald-700',
    rejected:    'bg-red-100 text-red-700',
    revised:     'bg-purple-100 text-purple-700',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

const formatRp = (n) => formatCompactRupiah(n);

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatVisitSchedule = (v) => {
    if (!v?.scheduled_at) return '—';
    const start = new Date(v.scheduled_at);
    if (v.is_all_day) {
        const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        if (v.end_at) {
            const end = new Date(v.end_at);
            if (end >= start) {
                const endStr = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                return startStr === endStr ? `${startStr} (Seharian)` : `${startStr} – ${endStr} (Seharian)`;
            }
        }
        return `${startStr} (Seharian)`;
    }
    const startStr = start.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (v.end_at) {
        const end = new Date(v.end_at);
        const isSameDay = start.toDateString() === end.toDateString();
        if (isSameDay) {
            const endTimeStr = end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            return `${startStr} – ${endTimeStr}`;
        }
        const endStr = end.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `${startStr} – ${endStr}`;
    }
    return startStr;
};

const formatTimeOnly = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const getDateGroup = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Hari ini';
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// ─── StageBadge ───────────────────────────────────────────────────────────────────

function StageBadge({ stage, meta: customMeta }) {
    const meta = customMeta || STAGE_META[stage] || { label: stage, color: 'bg-surface-100 text-surface-600', dot: 'bg-surface-400' };
    const colorHex = meta.colorHex;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color || 'bg-surface-100 text-surface-600'}`}>
            <span
                className={`w-2 h-2 rounded-full shrink-0 ${!colorHex ? (meta.dot || 'bg-surface-400') : ''}`}
                style={colorHex ? { backgroundColor: colorHex } : undefined}
            />
            {meta.label}
        </span>
    );
}

// ─── Quick Log Bar ────────────────────────────────────────────────────────────────

function QuickLogBar({ leadId, onActivityAdded }) {
    const outcomes = ['Belum ada respons', 'Sudah dihubungi', 'Minta penawaran', 'Sedang dipertimbangkan', 'Tulis catatan sendiri'];
    const [outcome, setOutcome] = useState('');
    const [channel, setChannel] = useState('note');
    const [note, setNote] = useState('');
    const [reminder, setReminder] = useState('none');
    const [date, setDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const custom = outcome === 'Tulis catatan sendiri';
    const reset = () => { setOutcome(''); setNote(''); setReminder('none'); setDate(''); setChannel('note'); setError(''); };
    const submit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setError('');
        if (!outcome || (custom && !note.trim())) { setError('Pilih hasil atau tulis catatan terlebih dahulu.'); return; }
        if (reminder === 'custom' && !date) { setError('Pilih tanggal dan waktu agenda follow-up.'); return; }
        let scheduled = null;
        if (reminder === 'custom') scheduled = date;
        else if (reminder !== 'none') {
            const d = new Date(); d.setDate(d.getDate() + Number(reminder)); d.setHours(9, 0, 0, 0);
            const pad = n => String(n).padStart(2, '0');
            scheduled = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T09:00`;
        }
        setSubmitting(true);
        try {
            const res = await axios.post(route('leads.activities.store', leadId), {
                type: channel, title: custom ? note.trim().slice(0, 255) : outcome,
                description: note.trim() || null, scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
            });
            if (res.data?.activity) onActivityAdded?.(res.data.activity);
            toast.success(scheduled ? 'Catatan tersimpan. Agenda dibuat di Visit & Follow-up dan Kalender internal.' : 'Catatan tersimpan di timeline.');
            window.dispatchEvent(new Event('workflow-updated'));
            if (scheduled) router.reload({ only: ['lead'] });
            reset();
        } catch (err) {
            setError(Object.values(err.response?.data?.errors || {}).flat()[0] || 'Gagal menyimpan. Silakan coba lagi.');
        } finally { setSubmitting(false); }
    };
    return <form onSubmit={submit} className="mb-5 rounded-2xl border border-surface-200 bg-surface-50/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h3 className="text-sm font-bold text-surface-900">Catat hasil komunikasi</h3>
                <p className="mt-1 text-xs text-surface-500">Setelah menghubungi customer, pilih hasilnya untuk riwayat tim.</p>
            </div>
            <button type="button" disabled={submitting} onClick={() => { reset(); window.dispatchEvent(new CustomEvent('workflow-schedule', { detail: { leadId, visit_type: 'other' } })); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-600 hover:border-brand-300 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50">
                <Calendar className="h-3.5 w-3.5" />Buat agenda meeting
            </button>
        </div>
        <p id="communication-log-help" className="mt-2 mb-4 text-xs leading-relaxed text-surface-500">Form ini mencatat aktivitas Anda; tidak mengirim WhatsApp, email, atau melakukan panggilan.</p>
        <fieldset disabled={submitting} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{outcomes.map(label => <button type="button" key={label} aria-pressed={outcome === label} onClick={() => { setOutcome(label); setError(''); }} className={`rounded-xl border px-3 py-3 text-left text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${outcome === label ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 bg-white text-surface-600 hover:border-brand-300'}`}>{outcome === label && <Check className="mr-1 inline h-3.5 w-3.5" />}{label}</button>)}</div>
            {outcome && <>
                {outcome === 'Minta penawaran' && <Link href={`/quotations/create?lead_id=${leadId}`} className="inline-flex rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white">Buat quotation dari lead ini →</Link>}
                <div><label htmlFor="progress-channel" className="mr-3 text-xs font-medium text-surface-600">Media komunikasi yang digunakan <span className="text-surface-400">(opsional)</span></label><select id="progress-channel" aria-describedby="communication-log-help" value={channel} onChange={e => setChannel(e.target.value)} className="rounded-lg border-surface-200 text-xs"><option value="note">Tidak ditentukan</option><option value="call">Telepon</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">Meeting</option></select></div>
                <div><p className="mb-2 text-xs font-semibold text-surface-700">Agenda follow-up berikutnya <span className="font-normal text-surface-400">(opsional)</span></p><div className="flex flex-wrap gap-2">{[['none','Catatan saja'],['1','Besok'],['3','3 hari lagi'],['7','Minggu depan'],['custom','Pilih tanggal']].map(([key,label]) => <button type="button" key={key} aria-pressed={reminder === key} onClick={() => setReminder(key)} className={`rounded-lg border px-3 py-2 text-xs ${reminder === key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 bg-white text-surface-600'}`}>{label}</button>)}</div>
                    {reminder === 'custom' && <input aria-label="Tanggal dan waktu follow-up" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required className="mt-2 rounded-lg border-surface-200 text-sm" />}
                    {reminder !== 'none' && <p className="mt-2 text-xs text-surface-500">{reminder === 'custom' ? 'Sesuai waktu pilihan Anda.' : 'Agenda pukul 09.00 pada tanggal pilihan.'} Agenda untuk Anda muncul di Visit & Follow-up dan Kalender internal. Tindak lanjut dilakukan oleh Anda.</p>}
                </div>
                <div><label htmlFor="progress-note" className="mb-1 block text-xs text-surface-600">{custom ? 'Catatan *' : 'Catatan tambahan (opsional)'}</label><textarea id="progress-note" rows={2} value={note} onChange={e => setNote(e.target.value)} required={custom} placeholder="Misalnya: customer minta dihubungi setelah rapat." className="w-full rounded-xl border-surface-200 text-sm placeholder:text-surface-400" /></div>
                <div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-xs text-surface-500">{reminder === 'none' ? 'Menyimpan catatan ke timeline.' : 'Menyimpan catatan ke timeline dan membuat 1 agenda tindak lanjut.'}</p><div className="flex gap-2"><button type="button" onClick={reset} className="rounded-lg px-3 py-2 text-xs text-surface-500">Batal</button><button type="submit" disabled={submitting} className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{submitting ? 'Menyimpan…' : reminder === 'none' ? 'Simpan catatan' : 'Simpan & buat agenda'}</button></div></div>
            </>}
        </fieldset>
        {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
    </form>;
}

// ─── Activity Item ────────────────────────────────────────────────────────────────

function ActivityItem({ activity, currentUserId, isManagerOrAdmin, onDelete, onUpdate }) {
    const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.note;
    const { Icon, color, iconColor, system } = config;
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(activity.title || '');
    const [editDesc, setEditDesc] = useState(activity.description || '');
    const [saving, setSaving] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const canEdit = !activity.visit && !system && (activity.user_id === currentUserId || isManagerOrAdmin);

    const handleSaveEdit = async () => {
        if (!editTitle.trim()) return;
        setSaving(true);
        try {
            const res = await axios.patch(
                route('leads.activities.update', { lead: activity.lead_id, activity: activity.id }),
                { title: editTitle.trim(), description: editDesc.trim() || null }
            );
            toast.success('Aktivitas diperbarui');
            onUpdate(res.data.activity);
            setIsEditing(false);
        } catch {
            toast.error('Gagal memperbarui');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Hapus aktivitas ini?')) return;
        try {
            await axios.delete(
                route('leads.activities.destroy', { lead: activity.lead_id, activity: activity.id })
            );
            toast.success('Aktivitas dihapus');
            onDelete(activity.id);
        } catch {
            toast.error('Gagal menghapus');
        }
    };

    if (isEditing) {
        return (
            <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="flex-1 bg-surface-50 border border-surface-200 rounded-xl p-3 space-y-2">
                    <input
                        className="w-full bg-white border border-surface-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        autoFocus
                    />
                    <textarea
                        className="w-full bg-white border border-surface-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                        rows={2}
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder="Detail (opsional)..."
                    />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-200 rounded-lg">Batal</button>
                        <button onClick={handleSaveEdit} disabled={saving || !editTitle.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 rounded-lg disabled:opacity-60">
                            <Check className="w-3.5 h-3.5" /> Simpan
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex gap-3 group"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${system ? 'text-surface-500' : 'text-surface-800'}`}>
                            {activity.title}
                        </p>
                        {activity.visit && <p className="mt-1 rounded-lg bg-brand-50 px-2 py-1.5 text-xs text-brand-700">Agenda: {formatVisitSchedule(activity.visit)} · {activity.visit.cancelled_at ? 'Dibatalkan' : activity.visit.checked_in_at ? 'Selesai' : 'Terjadwal'} <Link href="/leads/visits" className="ml-1 underline">Lihat agenda</Link></p>}
                        {activity.description && (
                            <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{activity.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                system ? 'bg-surface-100 text-surface-400' : `${color} ${iconColor}`
                            }`}>
                                {config.label}
                            </span>
                            {activity.user && (
                                <span className="text-[10px] text-surface-400">{system ? activity.user.name : `Dicatat oleh ${activity.user.name}`}</span>
                            )}
                            <span className="text-[10px] text-surface-300">{formatTimeOnly(activity.created_at)}</span>
                        </div>
                    </div>
                    {/* Action buttons — show on hover, only for non-system activities */}
                    {canEdit && (
                        <div className={`flex items-center gap-1 shrink-0 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
                            <button
                                onClick={() => { setEditTitle(activity.title || ''); setEditDesc(activity.description || ''); setIsEditing(true); }}
                                className="p-1 rounded-md hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
                                title="Edit"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="p-1 rounded-md hover:bg-red-50 text-surface-400 hover:text-red-500 transition-colors"
                                title="Hapus"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Timeline grouped by date ─────────────────────────────────────────────────────

function Timeline({ activities, leadId, currentUserId, isManagerOrAdmin, onActivityAdded, onActivityUpdated, onActivityDeleted }) {
    const grouped = activities.reduce((acc, act) => {
        const group = getDateGroup(act.created_at);
        if (!acc[group]) acc[group] = [];
        acc[group].push(act);
        return acc;
    }, {});

    const groups = Object.entries(grouped);

    return (
        <div>
            <WorkflowPanel leadId={leadId} />

            {groups.length === 0 ? (
                <div className="text-center py-12 text-surface-400 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-surface-300" />
                    <p className="text-xs font-semibold text-surface-600">Belum ada aktivitas tercatat</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Mulai catat interaksi dengan menekan salah satu tombol di atas</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map(([dateLabel, items]) => (
                        <div key={dateLabel}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{dateLabel}</span>
                                <div className="flex-1 h-px bg-surface-100" />
                            </div>
                            <div className="space-y-4">
                                {items.map(act => (
                                    <ActivityItem
                                        key={act.id}
                                        activity={act}
                                        currentUserId={currentUserId}
                                        isManagerOrAdmin={isManagerOrAdmin}
                                        onDelete={onActivityDeleted}
                                        onUpdate={onActivityUpdated}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Quotations Tab ───────────────────────────────────────────────────────────────

function QuotationsTab({ allQuotations, lead }) {
    const totalValue = allQuotations.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0);
    const approvedCount = allQuotations.filter(q => q.status === 'approved' || q.po_status === 'approved').length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-sm font-bold text-surface-800">Daftar Quotation / Penawaran</h3>
                    <p className="text-xs text-surface-400">Semua penawaran harga & revisi terikat ke lead ini</p>
                </div>
                <Link
                    href={route('quotations.create', { lead_id: lead.id, customer_id: lead.customer_id || undefined })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Buat Quotation Baru
                </Link>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Total Dokumen</p>
                    <p className="text-base font-bold text-surface-900 mt-0.5">{allQuotations.length} Quotation</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Total Nilai Penawaran</p>
                    <p className="text-base font-bold text-brand-600 mt-0.5" title={formatRupiah(totalValue)}>{formatCompactRupiah(totalValue)}</p>
                </div>
                <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Deal / PO Masuk</p>
                    <p className="text-base font-bold text-emerald-600 mt-0.5">{approvedCount} Selesai</p>
                </div>
            </div>

            {allQuotations.length === 0 ? (
                <div className="text-center py-12 text-surface-400 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-surface-300" />
                    <p className="text-xs font-semibold text-surface-600">Belum ada quotation terhubung</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Buat penawaran harga pertama untuk memulai transaksi lead ini</p>
                    <Link
                        href={route('quotations.create', { lead_id: lead.id, customer_id: lead.customer_id || undefined })}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"
                    >
                        <Plus className="w-3 h-3" /> Buat Quotation Sekarang
                    </Link>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="px-4 py-3">No. Quotation</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Status PO</th>
                                <th className="px-4 py-3 text-right">Nilai Total</th>
                                <th className="px-4 py-3">Tanggal</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {allQuotations.map(q => (
                                <tr key={q.id} className="hover:bg-surface-50 transition-colors">
                                    <td className="px-4 py-3 font-semibold">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold text-surface-800">{q.id}</span>
                                            {q.revision_no > 0 && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-surface-200 text-surface-700 rounded">
                                                    Rev {q.revision_no}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${QUOT_STATUS_COLORS[q.status] || 'bg-surface-100 text-surface-700'}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {q.po_number ? (
                                            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
                                                PO: {q.po_number}
                                            </span>
                                        ) : (
                                            <span className="text-surface-400 text-[11px]">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-brand-600" title={formatCompactRupiah(q.grand_total)}>
                                        {formatRupiah(q.grand_total)}
                                    </td>
                                    <td className="px-4 py-3 text-surface-500 whitespace-nowrap">
                                        {q.created_at ? new Date(q.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={route('quotations.show', q.id)}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
                                        >
                                            Lihat <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── PO & Sales Order Tab ─────────────────────────────────────────────────────────

function PoSoTab({ allPurchaseOrders, allSalesOrders }) {
    const hasAny = allPurchaseOrders.length > 0 || allSalesOrders.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-bold text-surface-800">Status PO & Sales Order (SO)</h3>
                <p className="text-xs text-surface-400">Jejak dokumen Purchase Order dari customer dan Sales Order yang diterbitkan</p>
            </div>

            {!hasAny ? (
                <div className="text-center py-12 text-surface-400 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-surface-300" />
                    <p className="text-xs font-semibold text-surface-600">Belum ada PO / SO terbit</p>
                    <p className="text-[11px] text-surface-400 mt-1 max-w-sm mx-auto">
                        Ketika customer menyetujui penawaran harga dan nomor PO dimasukkan ke sistem, dokumen transaksi penjualan akan otomatis terhubung di sini.
                    </p>
                </div>
            ) : (
                <>
                    {/* Purchase Orders */}
                    {allPurchaseOrders.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Purchase Order (PO) Customer ({allPurchaseOrders.length})
                            </h4>
                            <div className="space-y-2">
                                {allPurchaseOrders.map(q => (
                                    <div key={q.id} className="p-3.5 rounded-xl border border-surface-200 bg-white flex items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-surface-900">
                                                    PO: {q.po_number || 'Dalam Proses'}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                                    {q.po_status || 'Diterima'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-surface-400 mt-0.5">
                                                Dari Quotation: <Link href={route('quotations.show', q.id)} className="font-mono text-brand-600 hover:underline">{q.id}</Link>
                                                {q.po_date && ` · Tanggal PO: ${q.po_date}`}
                                            </p>
                                        </div>
                                        <div className="text-right font-bold text-brand-600 text-sm" title={formatCompactRupiah(q.grand_total)}>
                                            {formatRupiah(q.grand_total)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sales Orders */}
                    {allSalesOrders.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <ShoppingCart className="w-4 h-4 text-brand-600" />
                                Sales Order (SO) Terbit ({allSalesOrders.length})
                            </h4>
                            <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider text-[10px]">
                                            <th className="px-4 py-2.5">No. SO</th>
                                            <th className="px-4 py-2.5">Quotation Asal</th>
                                            <th className="px-4 py-2.5">Status SO</th>
                                            <th className="px-4 py-2.5">Tanggal</th>
                                            <th className="px-4 py-2.5 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-100">
                                        {allSalesOrders.map(so => (
                                            <tr key={so.id} className="hover:bg-surface-50 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-surface-900">{so.id}</td>
                                                <td className="px-4 py-3 font-mono text-surface-600">{so.quotation_id}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 uppercase">
                                                        {so.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-surface-500">
                                                    {so.created_at ? new Date(so.created_at).toLocaleDateString('id-ID') : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        href={route('sales-orders.show', so.id)}
                                                        className="font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
                                                    >
                                                        Lihat SO <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Visits Tab ───────────────────────────────────────────────────────────────────

function VisitsTab({ visits = [], leadId, onOpenSchedule, googleCalendarConfigured, zoomConfigured }) {
    const { requestCancellation: handleDeleteVisit, cancellationModal } = useAgendaCancellation();

    const handleCreateZoom = (visitId) => {
        router.post(route('leads.visits.zoom', visitId), {}, {
            preserveScroll: true,
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
            {cancellationModal}
                    <h3 className="text-sm font-bold text-surface-800">Jadwal & Riwayat Kunjungan</h3>
                    <p className="text-xs text-surface-400">Aktivitas visit, demo, dan survey lapangan untuk lead ini</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={route('team-calendar')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 hover:bg-surface-200 text-surface-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        Buka di Kalender Tim
                    </Link>
                    <button
                        type="button"
                        onClick={onOpenSchedule}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Jadwalkan Kunjungan Baru
                    </button>
                </div>
            </div>

            {visits.length === 0 ? (
                <div className="text-center py-12 text-surface-400 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-surface-300" />
                    <p className="text-xs font-semibold text-surface-600">Belum ada jadwal kunjungan untuk lead ini</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Jadwalkan presentasi, demo produk, atau survey lapangan</p>
                    <button
                        type="button"
                        onClick={onOpenSchedule}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                    >
                        <Plus className="w-3 h-3" /> Buat Jadwal Kunjungan
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-2xs">
                    <table className="w-full text-xs text-left">
                        <thead>
                            <tr className="bg-surface-50 border-b border-surface-200 text-surface-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="px-4 py-3">Agenda / Subject</th>
                                <th className="px-4 py-3">Jenis</th>
                                <th className="px-4 py-3">Waktu Pelaksanaan</th>
                                <th className="px-4 py-3">Lokasi</th>
                                <th className="px-4 py-3">Integrasi</th>
                                <th className="px-4 py-3">Status Agenda</th>
                                <th className="px-4 py-3">Petugas</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {visits.map(v => (
                                <tr key={v.id} className="hover:bg-surface-50 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-surface-900">
                                        <div>{v.subject}</div>
                                        {v.notes && <div className="text-[11px] text-surface-400 font-normal line-clamp-1">{v.notes}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="capitalize px-2 py-0.5 bg-surface-100 text-surface-700 rounded text-[10px] font-semibold">
                                            {v.visit_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-surface-600 whitespace-nowrap">
                                        {formatDateTime(v.scheduled_at)}
                                    </td>
                                    <td className="px-4 py-3 text-surface-500">
                                        {v.location ? (
                                            <span className="flex items-center gap-1">
                                                <Navigation className="w-3 h-3 text-surface-400 shrink-0" />
                                                <span className="truncate max-w-[150px]">{v.location}</span>
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            {v.zoom_join_url ? (
                                                <a
                                                    href={v.zoom_join_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors w-fit"
                                                >
                                                    <Video className="w-3 h-3" />
                                                    Join Zoom
                                                </a>
                                            ) : (
                                                zoomConfigured && !v.checked_in_at && !v.cancelled_at && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCreateZoom(v.id)}
                                                        className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer w-fit"
                                                    >
                                                        <Video className="w-2.5 h-2.5" /> + Buat Zoom
                                                    </button>
                                                )
                                            )}

                                            {v.gc_event_id && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                                                    <Calendar className="w-2.5 h-2.5" /> Google Calendar
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {v.cancelled_at ? <span className="text-xs text-red-500">Dibatalkan</span> : v.checked_in_at ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                <CheckCircle2 className="w-3 h-3" /> Selesai: {formatTimeOnly(v.checked_in_at)}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-surface-400">Belum selesai</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-surface-700 font-medium">
                                        {v.user?.name || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            disabled={!!v.checked_in_at || !!v.cancelled_at}
                                            onClick={() => handleDeleteVisit(v.id, v.subject)}
                                            className="text-surface-400 hover:text-red-600 p-1 rounded hover:bg-surface-100 transition-colors cursor-pointer"
                                            title="Batalkan agenda"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Pics Tab ─────────────────────────────────────────────────────────────────────

function PicsTab({ lead, pics, onOpenAdd }) {
    const handleDeletePic = (picId) => {
        if (!confirm('Hapus kontak PIC ini dari lead?')) return;
        router.delete(route('leads.pics.destroy', { lead: lead.id, pic: picId }), {
            preserveScroll: true,
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="text-sm font-bold text-surface-800">Daftar PIC & Stakeholder Proyek</h3>
                    <p className="text-xs text-surface-400">Kontak pengambil keputusan teknis, purchasing, dan keuangan</p>
                </div>
                <button
                    onClick={onOpenAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah PIC Lead
                </button>
            </div>

            {pics.length === 0 ? (
                <div className="text-center py-12 text-surface-400 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
                    <Users className="w-8 h-8 mx-auto mb-2 text-surface-300" />
                    <p className="text-xs font-semibold text-surface-600">Belum ada kontak PIC tersimpan di Lead ini</p>
                    <p className="text-[11px] text-surface-400 mt-0.5">Tambahkan kontak dari data customer atau personil proyek</p>
                    <button
                        onClick={onOpenAdd}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                    >
                        <Plus className="w-3 h-3" /> Tambah PIC Pertama
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pics.map(p => {
                        const roleMeta = PIC_ROLES[p.role] || PIC_ROLES.other;
                        return (
                            <div key={p.id} className="p-4 rounded-xl border border-surface-200 bg-white hover:border-brand-200 transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.color}`}>
                                                {roleMeta.label}
                                            </span>
                                            {p.is_primary && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                                    UTAMA
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeletePic(p.id)}
                                            className="text-surface-300 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                                            title="Hapus PIC"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <h4 className="text-sm font-bold text-surface-800">{p.name}</h4>
                                    {p.position && <p className="text-xs text-surface-500 font-medium">{p.position}</p>}
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-surface-100 flex items-center justify-between text-xs">
                                    <div className="space-y-1">
                                        {p.phone && (
                                            <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 text-surface-600 hover:text-brand-600">
                                                <Phone className="w-3 h-3 text-surface-400" />
                                                <span>{p.phone}</span>
                                            </a>
                                        )}
                                        {p.email && (
                                            <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-surface-600 hover:text-brand-600">
                                                <Mail className="w-3 h-3 text-surface-400" />
                                                <span className="truncate max-w-[170px]">{p.email}</span>
                                            </a>
                                        )}
                                    </div>
                                    {p.phone && (
                                        <a
                                            href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            <MessageCircle className="w-3 h-3" /> Chat WA
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Schedule Visit Modal ─────────────────────────────────────────────────────────

function ScheduleVisitModal({ open, onClose, lead, customerPics = [], googleCalendarConfigured, zoomConfigured }) {
    const [form, setForm] = useState({
        visit_type: 'visit',
        subject: '',
        location: lead.customer?.address || '',
        scheduled_at: '',
        end_at: '',
        is_all_day: false,
        notes: '',
        sync_calendar: Boolean(googleCalendarConfigured),
        create_zoom: Boolean(zoomConfigured),
        attendee_emails: [],
    });
    const [submitting, setSubmitting] = useState(false);
    const [customEmail, setCustomEmail] = useState('');

    const addAttendeeEmail = (emailToAdd) => {
        const trimmed = (emailToAdd || customEmail).trim().toLowerCase();
        if (!trimmed || !trimmed.includes('@')) return;
        if (!(form.attendee_emails || []).includes(trimmed)) {
            setForm((f) => ({
                ...f,
                attendee_emails: [...(f.attendee_emails || []), trimmed],
            }));
        }
        setCustomEmail('');
    };

    const removeAttendeeEmail = (emailToRemove) => {
        setForm((f) => ({
            ...f,
            attendee_emails: (f.attendee_emails || []).filter((e) => e !== emailToRemove),
        }));
    };

    useEffect(() => {
        if (open) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            const isoLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

            setForm({
                visit_type: 'visit',
                subject: `Kunjungan Prospek: ${lead.title}`,
                location: lead.customer?.address || '',
                scheduled_at: isoLocal,
                end_at: '',
                is_all_day: false,
                notes: '',
                sync_calendar: Boolean(googleCalendarConfigured),
                create_zoom: Boolean(zoomConfigured),
                attendee_emails: [],
            });
        }
    }, [open, lead, googleCalendarConfigured, zoomConfigured]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(route('leads.visits.store'), {
            lead_id: lead.id,
            customer_id: lead.customer_id || null,
            visit_type: form.visit_type,
            subject: form.subject,
            location: form.location,
            scheduled_at: form.is_all_day ? (form.scheduled_at?.includes('T') ? form.scheduled_at : `${form.scheduled_at}T00:00:00`) : new Date(form.scheduled_at).toISOString(),
            end_at: form.end_at ? (form.is_all_day ? (form.end_at?.includes('T') ? form.end_at : `${form.end_at}T23:59:59`) : new Date(form.end_at).toISOString()) : null,
            is_all_day: Boolean(form.is_all_day),
            notes: form.notes,
            sync_calendar: form.sync_calendar,
            create_zoom: form.create_zoom,
            attendee_emails: form.attendee_emails,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onError: () => toast.error('Gagal menjadwalkan kunjungan'),
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-surface-200 max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-surface-900">Jadwalkan Kunjungan Baru</h3>
                            <p className="text-[11px] text-surface-500">Lead: {lead.title} ({lead.lead_code})</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-surface-400 hover:text-surface-600 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Agenda / Subject <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.subject}
                            onChange={e => setForm({ ...form, subject: e.target.value })}
                            required
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Jenis Kunjungan <span className="text-red-500">*</span></label>
                        <select
                            value={form.visit_type}
                            onChange={e => {
                                const val = e.target.value;
                                setForm(f => ({
                                    ...f,
                                    visit_type: val,
                                    create_zoom: f.create_zoom
                                }));
                            }}
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        >
                            <option value="visit">Visit Lapangan</option>
                            <option value="follow_up">Follow Up</option>
                            <option value="demo">Demo Produk</option>
                            <option value="presentation">Presentasi / Pitching</option><option value="installation">Instalasi</option><option value="maintenance">Maintenance</option><option value="leave">Cuti</option>
                            <option value="other">Lainnya</option>
                        </select>
                    </div>

                    <div className="space-y-2 rounded-xl bg-surface-50 p-3 border border-surface-200">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={Boolean(form.is_all_day)}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    setForm(f => ({
                                        ...f,
                                        is_all_day: checked,
                                        scheduled_at: checked ? (f.scheduled_at ? f.scheduled_at.slice(0, 10) : '') : (f.scheduled_at ? `${f.scheduled_at.slice(0, 10)}T10:00` : ''),
                                        end_at: ''
                                    }));
                                }}
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-surface-800">Kegiatan Seharian (All-day) / Multi-hari</span>
                        </label>

                        {form.is_all_day ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-surface-700 mb-1">Tanggal Mulai <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        value={form.scheduled_at?.slice(0, 10) || ''}
                                        onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                                        required
                                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-700 mb-1">Tanggal Selesai (opsional)</label>
                                    <input
                                        type="date"
                                        min={form.scheduled_at?.slice(0, 10) || ''}
                                        value={form.end_at?.slice(0, 10) || ''}
                                        onChange={e => setForm({ ...form, end_at: e.target.value })}
                                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-surface-700 mb-1">Waktu Mulai <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        value={form.scheduled_at}
                                        onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                                        required
                                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-700 mb-1">Waktu Selesai (opsional)</label>
                                    <input
                                        type="datetime-local"
                                        min={form.scheduled_at}
                                        value={form.end_at}
                                        onChange={e => setForm({ ...form, end_at: e.target.value })}
                                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Lokasi Kunjungan</label>
                        <input
                            type="text"
                            value={form.location}
                            onChange={e => setForm({ ...form, location: e.target.value })}
                            placeholder="Alamat kantor klien, Google Meet, dll"
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Catatan / Detail Persiapan</label>
                        <textarea
                            rows={2}
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            placeholder="Materi yang dibawa, PIC yang akan ditemui..."
                            className="w-full border border-surface-200 rounded-lg p-2.5 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {/* Integration Options */}
                    <div className="bg-surface-50 rounded-xl p-3 border border-surface-200/80 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.sync_calendar}
                                onChange={e => setForm({ ...form, sync_calendar: e.target.checked })}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="text-xs">
                                <span className="font-semibold text-surface-800 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-blue-600" /> Sinkron ke Google Calendar Tim
                                </span>
                                <p className="text-[10px] text-surface-400">Jadwal akan otomatis masuk ke Google Calendar kantor dan handphone tim</p>
                            </div>
                        </label>

                        {zoomConfigured && (
                            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                                <input
                                    type="checkbox"
                                    checked={form.create_zoom}
                                    onChange={e => setForm({ ...form, create_zoom: e.target.checked })}
                                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                />
                                <div className="text-xs">
                                    <span className="font-semibold text-surface-800 flex items-center gap-1.5">
                                        <Video className="w-3.5 h-3.5 text-sky-600" /> Buat Link Zoom Meeting Otomatis
                                    </span>
                                    <p className="text-[10px] text-surface-400">Menghasilkan link Zoom meeting instan dari lisensi akun perusahaan</p>
                                </div>
                            </label>
                        )}

                        {/* PIC & Attendee Emails */}
                        {form.sync_calendar && (
                            <div className="pt-2.5 border-t border-surface-200 space-y-1.5 opacity-80">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-surface-700 flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-surface-400" /> Undang Peserta / Tamu (Google Calendar)
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                                        Coming Soon
                                    </span>
                                </div>
                                <div className="p-2.5 bg-surface-50 border border-dashed border-surface-300 rounded-lg text-xs text-surface-500">
                                    <p className="text-[11px] text-surface-500 leading-relaxed">
                                        Pengiriman undangan email langsung ke peserta sedang dinonaktifkan sementara dan akan hadir pada pembaruan Google OAuth.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    </div>

                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-surface-100 bg-surface-50 shrink-0">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-100 rounded-lg cursor-pointer">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-60 cursor-pointer">
                            {submitting ? 'Menyimpan...' : 'Jadwalkan Kunjungan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Add Lead Pic Modal ───────────────────────────────────────────────────────────

function AddLeadPicModal({ open, onClose, lead, customerPics = [] }) {
    const [source, setSource] = useState(customerPics.length > 0 ? 'customer' : 'manual');
    const [selectedCustomerPicId, setSelectedCustomerPicId] = useState('');
    const [form, setForm] = useState({
        name: '', phone: '', email: '', position: '', role: 'primary', is_primary: false,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (selectedCustomerPicId) {
            const pic = customerPics.find(p => String(p.id) === String(selectedCustomerPicId));
            if (pic) {
                setForm(f => ({
                    ...f,
                    name: pic.name || '',
                    phone: pic.phone || '',
                    email: pic.email || '',
                    position: pic.position || '',
                }));
            }
        }
    }, [selectedCustomerPicId]);

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(route('leads.pics.store', lead.id), {
            customer_pic_id: source === 'customer' ? (selectedCustomerPicId || null) : null,
            ...form,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onError: (err) => {
                Object.values(err).forEach(m => toast.error(m));
            },
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                    <h3 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-600" />
                        Tambah Kontak PIC ke Lead
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {customerPics.length > 0 && (
                        <div className="flex rounded-lg bg-surface-100 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setSource('customer')}
                                className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${source === 'customer' ? 'bg-white shadow text-brand-700' : 'text-surface-600'}`}
                            >
                                Dari Customer ({customerPics.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSource('manual')}
                                className={`flex-1 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${source === 'manual' ? 'bg-white shadow text-brand-700' : 'text-surface-600'}`}
                            >
                                PIC Lapangan / Baru
                            </button>
                        </div>
                    )}

                    {source === 'customer' && customerPics.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Pilih PIC Customer</label>
                            <select
                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                value={selectedCustomerPicId}
                                onChange={e => setSelectedCustomerPicId(e.target.value)}
                                required
                            >
                                <option value="">-- Pilih PIC Customer --</option>
                                {customerPics.map(cp => (
                                    <option key={cp.id} value={cp.id}>
                                        {cp.name} {cp.position ? `(${cp.position})` : ''} {cp.phone ? `· ${cp.phone}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Nama kontak PIC..."
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Peran di Proyek <span className="text-red-500">*</span></label>
                            <select
                                value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value })}
                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                            >
                                <option value="primary">Kontak Utama</option>
                                <option value="technical">User Teknis</option>
                                <option value="purchasing">Purchasing</option>
                                <option value="finance">Keuangan</option>
                                <option value="other">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Jabatan / Posisi</label>
                            <input
                                type="text"
                                value={form.position}
                                onChange={e => setForm({ ...form, position: e.target.value })}
                                placeholder="e.g. Site Manager"
                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">No. Telepon / WA</label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                placeholder="08xxxxxxxx"
                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                placeholder="email@perusahaan.com"
                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                            type="checkbox"
                            checked={form.is_primary}
                            onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
                        />
                        <span className="text-xs text-surface-700 font-medium">Jadikan Kontak Utama untuk Lead ini</span>
                    </label>

                    <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-100 rounded-lg cursor-pointer">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-60 cursor-pointer">
                            {submitting ? 'Menyimpan...' : 'Simpan Kontak PIC'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page: Lead 360° Cockpit ────────────────────────────────────────────────

export default function LeadDetail({ 
    lead, 
    customerPics = [], 
    stages = [], 
    sources = [],
    pipelineSettings = null,
    googleCalendarConfigured = false,
    zoomConfigured = false,
    userHasZoomLicense = false
}) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;
    const isManagerOrAdmin = ['Administrator', 'Sales Manager', 'Manager', 'Super Admin'].includes(currentUser?.role);
    const currentUserId = currentUser?.id;

    const [activeTab, setActiveTab] = useState('timeline');
    const [showAddPicModal, setShowAddPicModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [changingStage, setChangingStage] = useState(false);
    const [currentStage, setCurrentStage] = useState(lead.stage);
    const [activities, setActivities] = useState(lead.activities || []);

    // Build stage meta with updated custom labels and colors
    const stageMetaMap = { ...STAGE_META };
    (pipelineSettings?.stages || []).forEach(st => {
        stageMetaMap[st.key] = {
            ...(stageMetaMap[st.key] || {
                color: 'bg-surface-100 text-surface-600',
                dot: 'bg-surface-400',
            }),
            label: st.name || stageMetaMap[st.key]?.label || st.key,
            type: st.type || 'normal',
            colorHex: st.color,
        };
    });

    const activeStagesList = (pipelineSettings?.stages && pipelineSettings.stages.length > 0)
        ? pipelineSettings.stages
        : stages.map(s => ({ key: s, name: STAGE_META[s]?.label || s, color: STAGE_META[s]?.colorHex }));

    useEffect(() => { setCurrentStage(lead.stage); }, [lead.stage]);
    useEffect(() => { setActivities(lead.activities || []); }, [lead.activities]);

    const handleStageChange = async (newStage) => {
        if (newStage === currentStage) { setChangingStage(false); return; }
        const oldStage = currentStage;
        setCurrentStage(newStage);
        setChangingStage(false);
        const optimistic = {
            id: 'temp-' + Date.now(),
            lead_id: lead.id,
            type: 'stage_change',
            title: `Stage diubah: ${stageMetaMap[oldStage]?.label || oldStage} → ${stageMetaMap[newStage]?.label || newStage}`,
            created_at: new Date().toISOString(),
            user: { name: 'Anda' },
        };
        setActivities(prev => [optimistic, ...prev]);
        try {
            await axios.patch(route('leads.stage.update', lead.id), { stage: newStage });
            toast.success(`Stage diubah ke "${stageMetaMap[newStage]?.label || newStage}"`);
        } catch {
            toast.error('Gagal mengubah stage lead.');
            setCurrentStage(oldStage);
            setActivities(lead.activities || []);
        }
    };

    const handleArchive = () => {
        if (!confirm('Arsipkan lead ini?')) return;
        router.delete(route('leads.destroy', lead.id));
    };

    const handleActivityAdded = (newAct) => setActivities(prev => [newAct, ...prev]);
    const handleActivityUpdated = (updatedAct) => setActivities(prev => prev.map(a => a.id === updatedAct.id ? updatedAct : a));
    const handleActivityDeleted = (id) => setActivities(prev => prev.filter(a => a.id !== id));

    // Deduplicate quotations
    const allQuotations = (() => {
        const list = [...(lead.quotations || [])];
        if (lead.quotation && !list.some(q => q.id === lead.quotation.id)) {
            list.unshift(lead.quotation);
        }
        return list;
    })();

    // All Sales Orders extracted from allQuotations
    const allSalesOrders = allQuotations.flatMap(q =>
        (q.sales_orders || []).map(so => ({ ...so, quotation: q }))
    );

    // All Purchase Orders
    const allPurchaseOrders = allQuotations.filter(q => q.po_number || q.po_status);

    // All Lead PICs
    const allLeadPics = lead.pics || [];

    const TABS = [
        { key: 'timeline',   label: 'Timeline & Aktivitas', icon: MessageSquare, count: activities.length },
        { key: 'quotations', label: 'Quotation',            icon: FileText,      count: allQuotations.length },
        { key: 'poso',       label: 'PO & Sales Order',     icon: ShoppingCart,  count: allPurchaseOrders.length + allSalesOrders.length },
        { key: 'visits',     label: 'Agenda',            icon: MapPin,        count: (lead.visits || []).length },
        { key: 'pics',       label: 'Kontak PIC',           icon: Users,         count: allLeadPics.length },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={lead.title} />

            <div className="min-h-screen bg-surface-50">
                {/* Header */}
                <div className="bg-white border-b border-surface-200 px-6 py-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Link href={route('leads.index')}
                            className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Kembali ke Lead Pipeline
                        </Link>
                    </div>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {lead.lead_code && (
                                    <span className="text-xs font-mono text-surface-500 bg-surface-100 px-2 py-0.5 rounded font-bold">{lead.lead_code}</span>
                                )}
                                <StageBadge stage={currentStage} meta={stageMetaMap[currentStage]} />
                            </div>
                            <h1 className="text-xl font-bold text-surface-900">{lead.title}</h1>
                            {lead.estimated_value > 0 && (
                                <p className="text-brand-600 font-bold mt-0.5 text-sm">
                                    Estimasi Nilai: {formatRupiah(lead.estimated_value)} <span className="text-xs text-brand-500 font-normal">({formatCompactRupiah(lead.estimated_value)})</span>
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link
                                href={route('quotations.create', { lead_id: lead.id, customer_id: lead.customer_id || undefined })}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Buat Quotation
                            </Link>
                            <button onClick={() => setChangingStage(prev => !prev)}
                                className={`flex items-center gap-2 px-3 py-2 border text-xs font-semibold rounded-xl transition-colors cursor-pointer ${changingStage ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-700 hover:bg-surface-50'}`}>
                                <TrendingUp className="w-4 h-4" />
                                Ubah Stage
                            </button>
                            <button onClick={handleArchive}
                                className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Arsipkan">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stage change panel */}
                {changingStage && (
                    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
                        <p className="text-xs font-semibold text-amber-700 mb-2">Pindahkan ke Stage:</p>
                        <div className="flex flex-wrap gap-2">
                            {activeStagesList.map(st => (
                                <button key={st.key}
                                    onClick={() => handleStageChange(st.key)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${st.key === currentStage ? 'ring-2 ring-brand-500 bg-brand-50 text-brand-700 font-bold' : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'}`}>
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: st.color || stageMetaMap[st.key]?.colorHex || '#94A3B8' }}
                                    />
                                    {st.name || stageMetaMap[st.key]?.label || st.key}
                                </button>
                            ))}
                            <button onClick={() => setChangingStage(false)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-200 text-surface-600 hover:bg-surface-300 cursor-pointer">
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Info Card */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Lead Info */}
                        <div className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-surface-800">Informasi Lead</h2><LeadInformationEditor lead={lead} sources={sources} /></div>

                            {(lead.customer_name || lead.customer) && (
                                <div className="flex items-start gap-3">
                                    <Building2 className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Perusahaan</p>
                                        <p className="text-sm font-semibold text-surface-800">
                                            {lead.customer?.name || lead.customer_name}
                                        </p>
                                        {lead.customer_id && (
                                            <Link href={route('customers.show', lead.customer_id)}
                                                className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1 mt-0.5">
                                                Profil Customer <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {lead.pic_name && (
                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">PIC Utama</p>
                                        <p className="text-sm font-semibold text-surface-800">{lead.pic_name}</p>
                                        {lead.pic_phone && <p className="text-xs text-surface-500">{lead.pic_phone}</p>}
                                    </div>
                                </div>
                            )}

                            {lead.customer_phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Telepon Perusahaan</p>
                                        <p className="text-sm text-surface-800">{lead.customer_phone}</p>
                                    </div>
                                </div>
                            )}

                            {lead.customer_email && (
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Email Perusahaan</p>
                                        <p className="text-sm text-surface-800">{lead.customer_email}</p>
                                    </div>
                                </div>
                            )}

                            {lead.sales && (
                                <div className="flex items-center gap-3">
                                    <Briefcase className="w-4 h-4 text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Sales In-charge</p>
                                        <p className="text-sm font-semibold text-surface-800">{lead.sales.name}</p>
                                    </div>
                                </div>
                            )}

                            {lead.source && (
                                <div className="flex items-center gap-3">
                                    <Tag className="w-4 h-4 text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Sumber Lead</p>
                                        <p className="text-sm text-surface-800 capitalize">{lead.source.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-surface-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-surface-400">Dibuat</p>
                                    <p className="text-sm text-surface-800">{formatDateTime(lead.created_at)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Catat hasil komunikasi */}
                        <QuickLogBar leadId={lead.id} onActivityAdded={handleActivityAdded} />

                        {/* Notes */}
                        {lead.notes && (
                            <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm">
                                <h2 className="text-sm font-bold text-surface-800 mb-2">Catatan Lead</h2>
                                <p className="text-xs text-surface-600 leading-relaxed whitespace-pre-line">{lead.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Lead 360° Cockpit Tabs */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Tab Switcher Bar */}
                        <div className="bg-white rounded-2xl border border-surface-200 p-1.5 shadow-sm">
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                                {TABS.map(tab => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                                isActive
                                                    ? 'bg-brand-600 text-white shadow-sm font-bold'
                                                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            <span>{tab.label}</span>
                                            {tab.count > 0 && (
                                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                                    isActive ? 'bg-white/20 text-white' : 'bg-surface-200 text-surface-700'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tab Content Box */}
                        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
                            {activeTab === 'timeline' && (
                                <Timeline
                                    activities={activities}
                                    leadId={lead.id}
                                    currentUserId={currentUserId}
                                    isManagerOrAdmin={isManagerOrAdmin}
                                    onActivityAdded={handleActivityAdded}
                                    onActivityUpdated={handleActivityUpdated}
                                    onActivityDeleted={handleActivityDeleted}
                                />
                            )}

                            {activeTab === 'quotations' && (
                                <QuotationsTab
                                    allQuotations={allQuotations}
                                    lead={lead}
                                />
                            )}

                            {activeTab === 'poso' && (
                                <PoSoTab
                                    allPurchaseOrders={allPurchaseOrders}
                                    allSalesOrders={allSalesOrders}
                                />
                            )}

                            {activeTab === 'visits' && (
                                <VisitsTab
                                    visits={lead.visits || []}
                                    leadId={lead.id}
                                    onOpenSchedule={() => setShowScheduleModal(true)}
                                    googleCalendarConfigured={googleCalendarConfigured}
                                    zoomConfigured={zoomConfigured}
                                />
                            )}

                            {activeTab === 'pics' && (
                                <PicsTab
                                    lead={lead}
                                    pics={allLeadPics}
                                    onOpenAdd={() => setShowAddPicModal(true)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Jadwalkan Kunjungan */}
            <ScheduleVisitModal
                open={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                lead={lead}
                customerPics={customerPics}
                googleCalendarConfigured={googleCalendarConfigured}
                zoomConfigured={zoomConfigured}
            />

            {/* Modal Tambah PIC */}
            <AddLeadPicModal
                open={showAddPicModal}
                onClose={() => setShowAddPicModal(false)}
                lead={lead}
                customerPics={customerPics}
            />
        </AuthenticatedLayout>
    );
}
