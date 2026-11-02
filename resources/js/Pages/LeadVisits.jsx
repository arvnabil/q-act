import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    MapPin, Plus, X, Calendar, Clock, CheckCircle2, Navigation,
    Building2, User, ChevronDown, AlertCircle, FileText,
    ClipboardList, History
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const VISIT_TYPES = {
    visit:        { label: 'Kunjungan',   color: 'bg-blue-100 text-blue-700' },
    follow_up:    { label: 'Follow-up',   color: 'bg-amber-100 text-amber-700' },
    demo:         { label: 'Demo',        color: 'bg-violet-100 text-violet-700' },
    presentation: { label: 'Presentasi', color: 'bg-brand-100 text-brand-700' },
    other:        { label: 'Lainnya',     color: 'bg-surface-100 text-surface-600' },
};

// ─── Visit Type Badge ─────────────────────────────────────────────────────────────

function VisitTypeBadge({ type }) {
    const meta = VISIT_TYPES[type] || { label: type, color: 'bg-surface-100 text-surface-600' };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>{meta.label}</span>
    );
}

// ─── Today Visit Card ─────────────────────────────────────────────────────────────

function TodayVisitCard({ visit, onCheckIn }) {
    if (!visit) return null;
    const isCheckedIn = !!visit.checked_in_at;

    return (
        <div className="bg-brand-600 text-white rounded-2xl p-5 mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-brand-200" />
                        <span className="text-brand-200 text-xs font-semibold">Kunjungan Hari Ini</span>
                    </div>
                    <h3 className="text-base font-bold mb-0.5">{visit.subject}</h3>
                    <p className="text-sm text-brand-200">
                        {visit.lead?.title || visit.customer?.name || 'No customer'}
                    </p>
                    {visit.location && (
                        <div className="flex items-center gap-1 mt-2 text-brand-200 text-xs">
                            <Navigation className="w-3.5 h-3.5" />
                            <span>{visit.location}</span>
                        </div>
                    )}
                    <p className="text-brand-200 text-xs mt-1">
                        Check-in {isCheckedIn ? 'pukul ' + formatTime(visit.checked_in_at) : 'belum dilakukan'}
                    </p>
                </div>
                {!isCheckedIn ? (
                    <button
                        onClick={() => onCheckIn(visit)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-brand-700 text-sm font-bold rounded-xl hover:bg-brand-50 transition-colors shrink-0">
                        <Navigation className="w-4 h-4" />
                        Simpan Lokasi
                    </button>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        Sudah Check-in
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Visit Table ──────────────────────────────────────────────────────────────────

function VisitTable({ visits, onCheckIn }) {
    if (visits.length === 0) {
        return (
            <div className="text-center py-16 text-surface-400">
                <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Belum ada kunjungan</p>
                <p className="text-xs mt-1">Tambahkan jadwal kunjungan pertama Anda</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-surface-200 bg-surface-50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Customer / Lead</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Jenis</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Agenda</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Tanggal & Waktu</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Lokasi</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                    {visits.map(visit => {
                        const isCheckedIn = !!visit.checked_in_at;
                        const isPast = new Date(visit.scheduled_at) < new Date();
                        return (
                            <tr key={visit.id} className="hover:bg-surface-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="font-semibold text-surface-800 text-sm">{visit.customer?.name || visit.lead?.title || '—'}</p>
                                        {visit.lead && (
                                            <p className="text-xs text-brand-600">{visit.lead.lead_code} · {visit.lead.title}</p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3"><VisitTypeBadge type={visit.visit_type} /></td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-surface-700">{visit.subject}</p>
                                    {visit.notes && <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{visit.notes}</p>}
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-surface-700">{formatDate(visit.scheduled_at)}</p>
                                    <p className="text-xs text-surface-400">{formatTime(visit.scheduled_at)}</p>
                                </td>
                                <td className="px-4 py-3">
                                    {visit.location ? (
                                        <div className="flex items-center gap-1 text-xs text-surface-600">
                                            <Navigation className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate max-w-[120px]">{visit.location}</span>
                                        </div>
                                    ) : (
                                        <span className="text-surface-300 text-xs">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {isCheckedIn ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Check-in {formatTime(visit.checked_in_at)}
                                        </span>
                                    ) : isPast ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                                            <AlertCircle className="w-3 h-3" />
                                            Terlewat
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                            <Clock className="w-3 h-3" />
                                            Akan Datang
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {!isCheckedIn && (
                                        <button
                                            onClick={() => onCheckIn(visit)}
                                            className="px-3 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-1">
                                            <Navigation className="w-3 h-3" />
                                            Check-in
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Calendar Placeholder ─────────────────────────────────────────────────────────

function CalendarPlaceholder() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-surface-400">
            <Calendar className="w-16 h-16 mb-4 opacity-30" />
            <h3 className="text-base font-bold text-surface-500 mb-1">Fitur Kalender Segera Hadir</h3>
            <p className="text-sm text-center max-w-xs">
                Kalender interaktif untuk melihat jadwal kunjungan dan follow-up dalam tampilan bulanan atau mingguan.
            </p>
        </div>
    );
}

// ─── Add Visit Modal ──────────────────────────────────────────────────────────────

function AddVisitModal({ open, onClose, leads, customers }) {
    const [form, setForm] = useState({
        lead_id: '', customer_id: '', visit_type: 'visit',
        subject: '', location: '', scheduled_at: '', notes: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(route('leads.visits.store'), form, {
            onFinish: () => { setSubmitting(false); onClose(); },
        });
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
                    <h2 className="text-base font-bold text-surface-800 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-brand-600" />
                        Tambah Kunjungan
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {/* Lead */}
                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Lead (opsional)</label>
                        <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={form.lead_id} onChange={e => set('lead_id', e.target.value)}>
                            <option value="">-- Pilih Lead --</option>
                            {leads.map(l => <option key={l.id} value={l.id}>{l.lead_code ? `[${l.lead_code}] ` : ''}{l.title}</option>)}
                        </select>
                    </div>

                    {/* Customer */}
                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Customer (opsional)</label>
                        <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                            <option value="">-- Pilih Customer --</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Type & Subject */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Jenis <span className="text-red-500">*</span></label>
                            <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={form.visit_type} onChange={e => set('visit_type', e.target.value)} required>
                                {Object.entries(VISIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Tanggal & Waktu <span className="text-red-500">*</span></label>
                            <input type="datetime-local" className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Agenda / Subject <span className="text-red-500">*</span></label>
                        <input className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="e.g. Presentasi produk UPVC"
                            value={form.subject} onChange={e => set('subject', e.target.value)} required />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Lokasi</label>
                        <input className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Alamat atau nama tempat"
                            value={form.location} onChange={e => set('location', e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Catatan</label>
                        <textarea className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                            rows={3} placeholder="Catatan tambahan..."
                            value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting}
                            className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2">
                            {submitting ? 'Menyimpan...' : <><Plus className="w-4 h-4" /> Tambah Kunjungan</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function LeadVisits({ visits, stats, todayVisit, leads, customers, isManagerOrAdmin }) {
    const [tab, setTab] = useState('visit');   // visit | follow_up | history
    const [subTab, setSubTab] = useState('table'); // table | calendar
    const [showForm, setShowForm] = useState(false);

    const handleCheckIn = (visit) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    router.post(route('leads.visits.check-in', visit.id), {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    });
                },
                () => {
                    // No GPS permission — check in without location
                    router.post(route('leads.visits.check-in', visit.id), { lat: null, lng: null });
                }
            );
        } else {
            router.post(route('leads.visits.check-in', visit.id), { lat: null, lng: null });
        }
    };

    const today = new Date().toDateString();
    const filteredVisits = visits.filter(v => {
        const d = new Date(v.scheduled_at);
        if (tab === 'visit')     return ['visit', 'demo', 'presentation', 'other'].includes(v.visit_type);
        if (tab === 'follow_up') return v.visit_type === 'follow_up';
        if (tab === 'history')   return !!v.checked_in_at;
        return true;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Visit & Follow-up" />

            <div className="min-h-screen bg-surface-50">
                {/* Page Header */}
                <div className="bg-white border-b border-surface-200 px-6 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-surface-400 mb-1">
                                <span>Sales Workspace</span>
                                <span>/</span>
                                <span className="text-brand-600 font-semibold">Visit & Follow-up</span>
                            </div>
                            <h1 className="text-xl font-bold text-surface-800 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-brand-600" />
                                Visit & Follow-up
                            </h1>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors">
                            <Plus className="w-4 h-4" />
                            Tambah Visit
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        {[
                            { label: 'Akan Datang', value: stats.upcoming, color: 'text-blue-600' },
                            { label: 'Hari Ini',    value: stats.today,    color: 'text-brand-600' },
                            { label: 'Minggu Ini',  value: stats.thisWeek, color: 'text-violet-600' },
                            { label: 'Check-in',    value: stats.checkedIn, color: 'text-emerald-600' },
                        ].map(s => (
                            <div key={s.label} className="bg-surface-50 rounded-xl px-4 py-3 border border-surface-200">
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs font-semibold text-surface-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {/* Today visit highlight */}
                    <TodayVisitCard visit={todayVisit} onCheckIn={handleCheckIn} />

                    {/* Tabs */}
                    <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
                        {/* Main tabs */}
                        <div className="flex border-b border-surface-200 px-4 pt-3 gap-1">
                            {[
                                { key: 'visit', label: 'Visit', icon: MapPin, count: visits.filter(v => ['visit','demo','presentation','other'].includes(v.visit_type)).length },
                                { key: 'follow_up', label: 'Follow-up', icon: ClipboardList, count: visits.filter(v => v.visit_type === 'follow_up').length },
                                { key: 'history', label: 'Riwayat Check-in', icon: History, count: visits.filter(v => v.checked_in_at).length },
                            ].map(t => (
                                <button key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-700'}`}>
                                    <t.icon className="w-4 h-4" />
                                    {t.label}
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-500'}`}>{t.count}</span>
                                </button>
                            ))}
                        </div>

                        {/* Sub-tabs */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-100">
                            {[
                                { key: 'table', label: 'Tabel' },
                                { key: 'calendar', label: 'Kalender' },
                            ].map(st => (
                                <button key={st.key}
                                    onClick={() => setSubTab(st.key)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${subTab === st.key ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-50'}`}>
                                    {st.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {subTab === 'table' ? (
                                <VisitTable visits={filteredVisits} onCheckIn={handleCheckIn} />
                            ) : (
                                <CalendarPlaceholder />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Visit Modal */}
            <AddVisitModal
                open={showForm}
                onClose={() => setShowForm(false)}
                leads={leads}
                customers={customers}
            />
        </AuthenticatedLayout>
    );
}

