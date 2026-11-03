import React, { useState, useEffect, useRef } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    TrendingUp, ArrowLeft, Building2, User, DollarSign, FileText,
    Clock, Plus, X, ChevronRight, Edit2, Trash2, MapPin,
    Phone, Mail, MessageSquare, Calendar, CheckCircle2, Tag,
    MessageCircle, Video, Send, ChevronDown, Pencil, Check,
    Navigation, AlertCircle
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────────

const STAGE_META = {
    data_masuk:     { label: 'Data Masuk',      color: 'bg-surface-100 text-surface-600', dot: 'bg-surface-400' },
    sph_terlayang:  { label: 'SPH Terlayang',   color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
    hot_progress:   { label: 'Hot Progress',    color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
    proyek_deal:    { label: 'Proyek Deal',     color: 'bg-brand-100 text-brand-700',     dot: 'bg-brand-500' },
    proyek_berjalan:{ label: 'Proyek Berjalan', color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
    proyek_selesai: { label: 'Proyek Selesai',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    no_deal:        { label: 'No Deal',         color: 'bg-red-100 text-red-600',         dot: 'bg-red-500' },
};

const ACTIVITY_CONFIG = {
    note:             { label: 'Catatan',              Icon: MessageSquare, color: 'bg-surface-100',  iconColor: 'text-surface-500',  system: false },
    call:             { label: 'Log Telepon',           Icon: Phone,         color: 'bg-blue-50',      iconColor: 'text-blue-500',     system: false },
    whatsapp:         { label: 'Log WhatsApp',          Icon: MessageCircle, color: 'bg-emerald-50',   iconColor: 'text-emerald-500',  system: false },
    email:            { label: 'Log Email',             Icon: Mail,          color: 'bg-violet-50',    iconColor: 'text-violet-500',   system: false },
    meeting:          { label: 'Meeting',               Icon: Video,         color: 'bg-amber-50',     iconColor: 'text-amber-500',    system: false },
    follow_up:        { label: 'Follow-up',             Icon: Clock,         color: 'bg-orange-50',    iconColor: 'text-orange-500',   system: false },
    visit:            { label: 'Kunjungan',             Icon: MapPin,        color: 'bg-teal-50',      iconColor: 'text-teal-500',     system: false },
    stage_change:     { label: 'Perubahan Stage',       Icon: ChevronRight,  color: 'bg-surface-100',  iconColor: 'text-surface-400',  system: true  },
    quotation_linked: { label: 'Quotation Dilampirkan', Icon: FileText,      color: 'bg-brand-50',     iconColor: 'text-brand-500',    system: true  },
    deal_won:         { label: 'Deal Menang',           Icon: CheckCircle2,  color: 'bg-emerald-50',   iconColor: 'text-emerald-500',  system: true  },
    deal_lost:        { label: 'Deal Gagal',            Icon: X,             color: 'bg-red-50',       iconColor: 'text-red-500',      system: true  },
};

const QUICK_LOG_TYPES = [
    { key: 'note',     label: 'Catatan',   Icon: MessageSquare, placeholder: 'Tulis catatan...' },
    { key: 'call',     label: 'Telepon',   Icon: Phone,         placeholder: 'Ringkasan pembicaraan...' },
    { key: 'whatsapp', label: 'WhatsApp',  Icon: MessageCircle, placeholder: 'Ringkasan pesan WhatsApp...' },
    { key: 'email',    label: 'Email',     Icon: Mail,          placeholder: 'Ringkasan email...' },
    { key: 'meeting',  label: 'Meeting',   Icon: Video,         placeholder: 'Hasil / agenda meeting...' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

const formatRp = (n) => {
    if (!n) return 'Rp 0';
    if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
    if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
    return `Rp ${n.toLocaleString('id-ID')}`;
};

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

function StageBadge({ stage }) {
    const meta = STAGE_META[stage] || { label: stage, color: 'bg-surface-100 text-surface-600', dot: 'bg-surface-400' };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
            {meta.label}
        </span>
    );
}

// ─── Quick Log Bar ────────────────────────────────────────────────────────────────

function QuickLogBar({ leadId, onActivityAdded }) {
    const [activeType, setActiveType] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (activeType && inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeType]);

    const handleTypeClick = (key) => {
        if (activeType === key) {
            setActiveType(null);
            setTitle('');
            setDescription('');
        } else {
            setActiveType(key);
            setTitle('');
            setDescription('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            const res = await axios.post(route('leads.activities.store', leadId), {
                type: activeType,
                title: title.trim(),
                description: description.trim() || null,
            });
            toast.success('Aktivitas ditambahkan');
            if (res.data?.activity && onActivityAdded) onActivityAdded(res.data.activity);
            setActiveType(null);
            setTitle('');
            setDescription('');
        } catch {
            toast.error('Gagal menyimpan aktivitas');
        } finally {
            setSubmitting(false);
        }
    };

    const activeConfig = activeType ? QUICK_LOG_TYPES.find(t => t.key === activeType) : null;

    return (
        <div className="mb-4">
            {/* Type buttons */}
            <div className="flex gap-1.5 flex-wrap mb-2">
                {QUICK_LOG_TYPES.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        onClick={() => handleTypeClick(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeType === key
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Inline form */}
            {activeType && activeConfig && (
                <form onSubmit={handleSubmit} className="bg-surface-50 border border-surface-200 rounded-xl p-3 space-y-2 animate-fade-in-up">
                    <input
                        ref={inputRef}
                        className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-surface-400"
                        placeholder={activeConfig.placeholder}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                    <textarea
                        className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none placeholder-surface-400"
                        placeholder="Detail tambahan (opsional)..."
                        rows={2}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                    <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setActiveType(null)}
                            className="px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-200 rounded-lg transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting || !title.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60">
                            {submitting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Simpan
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
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

    const canEdit = !system && (activity.user_id === currentUserId || isManagerOrAdmin);

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
                                <span className="text-[10px] text-surface-400">{activity.user.name}</span>
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
    // Group activities by date
    const grouped = activities.reduce((acc, act) => {
        const group = getDateGroup(act.created_at);
        if (!acc[group]) acc[group] = [];
        acc[group].push(act);
        return acc;
    }, {});

    const groups = Object.entries(grouped);

    return (
        <div>
            <QuickLogBar leadId={leadId} onActivityAdded={onActivityAdded} />

            {groups.length === 0 ? (
                <div className="text-center py-12 text-surface-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-semibold">Belum ada aktivitas</p>
                    <p className="text-xs mt-1">Mulai log aktivitas pertama di atas</p>
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

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function LeadDetail({ lead, stages, sources }) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;
    const isManagerOrAdmin = ['Administrator', 'Sales Manager', 'Manager', 'Super Admin'].includes(currentUser?.role);
    const currentUserId = currentUser?.id;

    const [changingStage, setChangingStage] = useState(false);
    const [currentStage, setCurrentStage] = useState(lead.stage);
    const [activities, setActivities] = useState(lead.activities || []);

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
            title: `Stage diubah: ${STAGE_META[oldStage]?.label || oldStage} → ${STAGE_META[newStage]?.label || newStage}`,
            created_at: new Date().toISOString(),
            user: { name: 'Anda' },
        };
        setActivities(prev => [optimistic, ...prev]);
        try {
            await axios.patch(route('leads.stage.update', lead.id), { stage: newStage });
            toast.success(`Stage diubah ke "${STAGE_META[newStage]?.label || newStage}"`);
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

    const allQuotations = (() => {
        const list = [...(lead.quotations || [])];
        if (lead.quotation && !list.some(q => q.id === lead.quotation.id)) {
            list.unshift(lead.quotation);
        }
        return list;
    })();

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
                                    <span className="text-xs font-mono text-surface-400 bg-surface-100 px-2 py-0.5 rounded">{lead.lead_code}</span>
                                )}
                                <StageBadge stage={currentStage} />
                            </div>
                            <h1 className="text-xl font-bold text-surface-800">{lead.title}</h1>
                            {lead.estimated_value > 0 && (
                                <p className="text-brand-600 font-bold mt-0.5">{formatRp(lead.estimated_value)}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('quotations.create', { lead_id: lead.id, customer_id: lead.customer_id || undefined })}
                                className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Buat Quotation
                            </Link>
                            <button onClick={() => setChangingStage(prev => !prev)}
                                className={`flex items-center gap-2 px-3 py-2 border text-sm font-semibold rounded-xl transition-colors ${changingStage ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-700 hover:bg-surface-50'}`}>
                                <TrendingUp className="w-4 h-4" />
                                Ubah Stage
                            </button>
                            <button onClick={handleArchive}
                                className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Arsipkan">
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
                            {stages.map(s => (
                                <button key={s}
                                    onClick={() => handleStageChange(s)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${s === currentStage ? 'ring-2 ring-brand-500 bg-brand-50 text-brand-700' : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'}`}>
                                    {STAGE_META[s]?.label || s}
                                </button>
                            ))}
                            <button onClick={() => setChangingStage(false)}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-200 text-surface-600 hover:bg-surface-300">
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Info */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Lead Info */}
                        <div className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4">
                            <h2 className="text-sm font-bold text-surface-700">Informasi Lead</h2>

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
                                                className="text-xs text-brand-600 hover:underline">
                                                Lihat profil customer →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {lead.pic_name && (
                                <div className="flex items-start gap-3">
                                    <User className="w-4 h-4 text-surface-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">PIC</p>
                                        <p className="text-sm font-semibold text-surface-800">{lead.pic_name}</p>
                                        {lead.pic_phone && <p className="text-xs text-surface-500">{lead.pic_phone}</p>}
                                    </div>
                                </div>
                            )}

                            {lead.customer_phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Telepon</p>
                                        <p className="text-sm text-surface-800">{lead.customer_phone}</p>
                                    </div>
                                </div>
                            )}

                            {lead.customer_email && (
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Email</p>
                                        <p className="text-sm text-surface-800">{lead.customer_email}</p>
                                    </div>
                                </div>
                            )}

                            {lead.sales && (
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Sales</p>
                                        <p className="text-sm font-semibold text-surface-800">{lead.sales.name}</p>
                                    </div>
                                </div>
                            )}

                            {lead.source && (
                                <div className="flex items-center gap-3">
                                    <Tag className="w-4 h-4 text-surface-400 shrink-0" />
                                    <div>
                                        <p className="text-xs text-surface-400">Sumber</p>
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

                        {/* Quotations Card */}
                        <div className="bg-white rounded-2xl border border-surface-200 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-bold text-surface-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-brand-600" />
                                    Quotation ({allQuotations.length})
                                </h2>
                                <Link
                                    href={route('quotations.create', { lead_id: lead.id, customer_id: lead.customer_id || undefined })}
                                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Buat Baru
                                </Link>
                            </div>

                            {allQuotations.length > 0 ? (
                                <div className="space-y-2">
                                    {allQuotations.map(q => (
                                        <Link
                                            key={q.id}
                                            href={route('quotations.show', q.id)}
                                            className="flex items-center justify-between p-3 bg-surface-50 hover:bg-brand-50/60 rounded-xl border border-surface-100 transition-colors group"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-surface-800 group-hover:text-brand-700">{q.id}</p>
                                                    {q.revision_no > 0 && (
                                                        <span className="text-[10px] font-mono bg-surface-200 text-surface-700 px-1.5 py-0.2 rounded font-semibold">
                                                            Rev {q.revision_no}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-semibold text-brand-600">
                                                        {formatRp(q.grand_total)}
                                                    </span>
                                                    <span className="text-[10px] text-surface-400 capitalize">
                                                        · {q.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-brand-600 transition-colors shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-surface-400">
                                    <p className="text-xs">Belum ada quotation untuk lead ini</p>
                                    <Link
                                        href={route('quotations.create', { lead_id: lead.id, customer_id: lead.customer_id || undefined })}
                                        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-600 hover:underline"
                                    >
                                        <Plus className="w-3 h-3" /> Buat quotation pertama
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {lead.notes && (
                            <div className="bg-white rounded-2xl border border-surface-200 p-5">
                                <h2 className="text-sm font-bold text-surface-700 mb-2">Catatan Lead</h2>
                                <p className="text-sm text-surface-600 leading-relaxed">{lead.notes}</p>
                            </div>
                        )}

                        {/* Visits linked */}
                        {lead.visits && lead.visits.length > 0 && (
                            <div className="bg-white rounded-2xl border border-surface-200 p-5">
                                <h2 className="text-sm font-bold text-surface-700 mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-teal-600" />
                                    Kunjungan ({lead.visits.length})
                                </h2>
                                <div className="space-y-2">
                                    {lead.visits.slice(0, 3).map(v => (
                                        <div key={v.id} className="flex items-center justify-between p-2.5 bg-surface-50 rounded-lg">
                                            <div>
                                                <p className="text-xs font-semibold text-surface-700">{v.subject}</p>
                                                <p className="text-[10px] text-surface-400">
                                                    {new Date(v.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    {v.checked_in_at && ' · ✅ Check-in'}
                                                </p>
                                            </div>
                                            {v.user && <span className="text-[10px] text-surface-400">{v.user.name}</span>}
                                        </div>
                                    ))}
                                    {lead.visits.length > 3 && (
                                        <p className="text-xs text-brand-600 text-center pt-1">+{lead.visits.length - 3} kunjungan lainnya</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Timeline */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-surface-200 p-5">
                            <h2 className="text-sm font-bold text-surface-700 mb-4">Timeline Aktivitas</h2>
                            <Timeline
                                activities={activities}
                                leadId={lead.id}
                                currentUserId={currentUserId}
                                isManagerOrAdmin={isManagerOrAdmin}
                                onActivityAdded={handleActivityAdded}
                                onActivityUpdated={handleActivityUpdated}
                                onActivityDeleted={handleActivityDeleted}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
