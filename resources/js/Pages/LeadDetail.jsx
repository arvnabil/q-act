import React, { useState, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    TrendingUp, ArrowLeft, Building2, User, DollarSign, FileText,
    Clock, Plus, X, ChevronRight, Edit2, Trash2, MapPin,
    Phone, Mail, MessageSquare, Calendar, CheckCircle2, Tag
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const STAGE_META = {
    data_masuk:     { label: 'Data Masuk',      color: 'bg-surface-100 text-surface-600', dot: 'bg-surface-400' },
    sph_terlayang:  { label: 'SPH Terlayang',   color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
    hot_progress:   { label: 'Hot Progress',    color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
    proyek_deal:    { label: 'Proyek Deal',     color: 'bg-brand-100 text-brand-700',     dot: 'bg-brand-500' },
    proyek_berjalan:{ label: 'Proyek Berjalan', color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
    proyek_selesai: { label: 'Proyek Selesai',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    no_deal:        { label: 'No Deal',         color: 'bg-red-100 text-red-600',         dot: 'bg-red-500' },
};

const ACTIVITY_ICON = {
    note:             MessageSquare,
    call:             Phone,
    email:            Mail,
    visit:            MapPin,
    follow_up:        Clock,
    stage_change:     ChevronRight,
    quotation_linked: FileText,
    deal_won:         CheckCircle2,
    deal_lost:        X,
};

const ACTIVITY_TYPE_LABEL = {
    note:             'Catatan',
    call:             'Telepon',
    email:            'Email',
    visit:            'Kunjungan',
    follow_up:        'Follow-up',
    stage_change:     'Perubahan Stage',
    quotation_linked: 'SPH Dilampirkan',
    deal_won:         'Deal Menang',
    deal_lost:        'Deal Gagal',
};

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

function StageBadge({ stage }) {
    const meta = STAGE_META[stage] || { label: stage, color: 'bg-surface-100 text-surface-600', dot: 'bg-surface-400' };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
            {meta.label}
        </span>
    );
}

// ─── Activity Item ────────────────────────────────────────────────────────────────

function ActivityItem({ activity }) {
    const Icon = ACTIVITY_ICON[activity.type] || MessageSquare;
    const isSystem = ['stage_change', 'quotation_linked', 'deal_won', 'deal_lost'].includes(activity.type);

    return (
        <div className={`flex gap-3 ${isSystem ? 'opacity-70' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isSystem ? 'bg-surface-100' : 'bg-brand-50'}`}>
                <Icon className={`w-4 h-4 ${isSystem ? 'text-surface-400' : 'text-brand-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-surface-800">{activity.title}</p>
                    <span className="text-[10px] text-surface-400 whitespace-nowrap">{formatDateTime(activity.created_at)}</span>
                </div>
                {activity.description && (
                    <p className="text-xs text-surface-500 mt-0.5">{activity.description}</p>
                )}
                <p className="text-[10px] text-surface-400 mt-0.5">
                    {ACTIVITY_TYPE_LABEL[activity.type] || activity.type}
                    {activity.user && ` · ${activity.user.name}`}
                </p>
            </div>
        </div>
    );
}

// ─── Add Activity Modal ───────────────────────────────────────────────────────────

function AddActivityModal({ open, onClose, leadId, onActivityAdded }) {
    const [form, setForm] = useState({ type: 'note', title: '', description: '', scheduled_at: '' });
    const [submitting, setSubmitting] = useState(false);

    const TYPES = [
        { key: 'note', label: 'Catatan' },
        { key: 'call', label: 'Telepon' },
        { key: 'email', label: 'Email' },
        { key: 'follow_up', label: 'Follow-up' },
        { key: 'visit', label: 'Kunjungan' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await axios.post(route('leads.activities.store', leadId), form);
            toast.success('Aktivitas berhasil ditambahkan');
            if (res.data?.activity && onActivityAdded) {
                onActivityAdded(res.data.activity);
            }
            setForm({ type: 'note', title: '', description: '', scheduled_at: '' });
            onClose();
        } catch (err) {
            console.error('Failed to add activity:', err);
            toast.error('Gagal menambahkan aktivitas');
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                    <h2 className="text-sm font-bold text-surface-800">Tambah Aktivitas</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        {TYPES.map(t => (
                            <button key={t.key} type="button"
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${form.type === t.key ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}
                                onClick={() => setForm(f => ({ ...f, type: t.key }))}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Judul <span className="text-red-500">*</span></label>
                        <input className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Ringkasan aktivitas..."
                            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Keterangan</label>
                        <textarea className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            rows={3} placeholder="Detail aktivitas..."
                            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg">Batal</button>
                        <button type="submit" disabled={submitting}
                            className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-60">
                            {submitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function LeadDetail({ lead, stages, sources }) {
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [changingStage, setChangingStage] = useState(false);
    const [currentStage, setCurrentStage] = useState(lead.stage);
    const [activities, setActivities] = useState(lead.activities || []);

    useEffect(() => {
        setCurrentStage(lead.stage);
    }, [lead.stage]);

    useEffect(() => {
        setActivities(lead.activities || []);
    }, [lead.activities]);

    const handleStageChange = async (newStage) => {
        if (newStage === currentStage) {
            setChangingStage(false);
            return;
        }

        const oldStage = currentStage;
        setCurrentStage(newStage);
        setChangingStage(false);

        // Optimistically insert stage change activity to timeline
        const optimisticActivity = {
            id: 'temp-' + Date.now(),
            type: 'stage_change',
            title: `Stage diubah: ${oldStage} → ${newStage}`,
            created_at: new Date().toISOString(),
            user: { name: 'Anda' },
        };
        setActivities(prev => [optimisticActivity, ...prev]);

        try {
            await axios.patch(route('leads.stage.update', lead.id), { stage: newStage });
            toast.success(`Stage berhasil diubah ke "${STAGE_META[newStage]?.label || newStage}"`);
        } catch (err) {
            console.error('Failed to update stage:', err);
            toast.error('Gagal mengubah stage lead.');
            setCurrentStage(oldStage);
            setActivities(lead.activities || []);
        }
    };

    const handleArchive = () => {
        if (!confirm('Arsipkan lead ini?')) return;
        router.delete(route('leads.destroy', lead.id));
    };

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
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${s === currentStage ? 'ring-2 ring-brand-500 bg-brand-50 text-brand-700 font-bold' : 'bg-white border border-surface-200 text-surface-700 hover:bg-surface-50'}`}>
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

                        {/* Quotation */}
                        {lead.quotation && (
                            <div className="bg-white rounded-2xl border border-surface-200 p-5">
                                <h2 className="text-sm font-bold text-surface-700 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-brand-600" />
                                    SPH Terlampir
                                </h2>
                                <Link href={route('quotations.show', lead.quotation_id)}
                                    className="flex items-center justify-between p-3 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-brand-700">{lead.quotation_id}</p>
                                        <p className="text-xs text-brand-500 capitalize">{lead.quotation.status}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-brand-600" />
                                </Link>
                            </div>
                        )}

                        {/* Notes */}
                        {lead.notes && (
                            <div className="bg-white rounded-2xl border border-surface-200 p-5">
                                <h2 className="text-sm font-bold text-surface-700 mb-2">Catatan</h2>
                                <p className="text-sm text-surface-600 leading-relaxed">{lead.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Activity feed */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-surface-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-bold text-surface-700">Timeline Aktivitas</h2>
                                <button onClick={() => setShowActivityModal(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors">
                                    <Plus className="w-3.5 h-3.5" />
                                    Tambah Aktivitas
                                </button>
                            </div>

                            <div className="space-y-4">
                                {activities && activities.length > 0 ? (
                                    activities.map(activity => (
                                        <ActivityItem key={activity.id} activity={activity} />
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-surface-400">
                                        <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm font-semibold">Belum ada aktivitas</p>
                                        <p className="text-xs mt-1">Tambahkan catatan atau log aktivitas pertama</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddActivityModal
                open={showActivityModal}
                onClose={() => setShowActivityModal(false)}
                leadId={lead.id}
                onActivityAdded={(newAct) => setActivities(prev => [newAct, ...prev])}
            />
        </AuthenticatedLayout>
    );
}

