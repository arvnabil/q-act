import useAgendaCancellation from '@/Components/useAgendaCancellation';
import React, { useState, useEffect } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    MapPin, Plus, X, Calendar, Clock, CheckCircle2, Navigation,
    Building2, User, ChevronDown, AlertCircle, FileText,
    ClipboardList, History, Video, Trash2, CalendarCheck, Users
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
    installation: { label: 'Instalasi', color: 'bg-indigo-100 text-indigo-700' },
    maintenance: { label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
    leave: { label: 'Cuti', color: 'bg-rose-100 text-rose-700' },
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
                        {isCheckedIn ? 'Selesai pukul ' + formatTime(visit.checked_in_at) : 'Belum selesai'}
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
                        Selesai
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Visit Table ──────────────────────────────────────────────────────────────────

function VisitTable({ visits, onCheckIn, zoomConfigured, onDeleteVisit, onCreateZoom }) {
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
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-2xs">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-surface-200 bg-surface-50">
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Customer / Lead</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Jenis</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Agenda</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Tanggal & Waktu</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Lokasi</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Integrasi</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-surface-500 uppercase tracking-wider">Aksi</th>
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
                                            <Link href={route('leads.show', visit.lead.id)} className="text-xs text-brand-600 hover:underline">
                                                [{visit.lead.lead_code}] {visit.lead.title}
                                            </Link>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3"><VisitTypeBadge type={visit.visit_type} /></td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-surface-700 font-medium">{visit.subject}</p>
                                    {visit.notes && <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{visit.notes}</p>}
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-sm text-surface-700">
                                        {visit.is_all_day && visit.end_at && formatDate(visit.scheduled_at) !== formatDate(visit.end_at)
                                            ? `${formatDate(visit.scheduled_at)} – ${formatDate(visit.end_at)}`
                                            : formatDate(visit.scheduled_at)}
                                    </p>
                                    <p className="text-xs font-semibold text-surface-400">
                                        {visit.is_all_day ? (
                                            <span className="text-brand-600">Seharian Penuh</span>
                                        ) : visit.end_at ? (
                                            `${formatTime(visit.scheduled_at)} – ${formatTime(visit.end_at)}`
                                        ) : (
                                            formatTime(visit.scheduled_at)
                                        )}
                                    </p>
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
                                    <div className="flex flex-col gap-1">
                                        {visit.zoom_join_url ? (
                                            <a
                                                href={visit.zoom_join_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors w-fit"
                                            >
                                                <Video className="w-3 h-3" />
                                                Join Zoom
                                            </a>
                                        ) : zoomConfigured && (
                                            <button
                                                type="button"
                                                onClick={() => onCreateZoom(visit.id)}
                                                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer w-fit"
                                            >
                                                <Video className="w-3 h-3" /> + Zoom
                                            </button>
                                        )}

                                        {visit.gc_event_id && (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                                                <Calendar className="w-3 h-3" /> G-Cal
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {isCheckedIn ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Selesai {formatTime(visit.checked_in_at)}
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
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        {!isCheckedIn && (
                                            <button
                                                onClick={() => onCheckIn(visit)}
                                                className="px-2.5 py-1 text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                                                <Navigation className="w-3 h-3" />
                                                Tandai Selesai
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!!visit.checked_in_at || !!visit.cancelled_at}
                                            onClick={() => onDeleteVisit(visit.id, visit.subject)}
                                            className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
                                            title="Batalkan agenda"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
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
        <div className="flex flex-col items-center justify-center py-16 text-surface-400 bg-surface-50/50 rounded-xl border border-dashed border-surface-200">
            <Calendar className="w-12 h-12 mb-3 text-brand-600 opacity-60" />
            <h3 className="text-base font-bold text-surface-800 mb-1">Tampilan Kalender Tim Komprehensif</h3>
            <p className="text-xs text-center max-w-sm text-surface-500 mb-4">
                Lihat seluruh jadwal kunjungan dan meeting tim dalam kalender bulanan interaktif terpadu dengan sinkronisasi Google Calendar dan Zoom.
            </p>
            <Link
                href={route('team-calendar')}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
                Buka Kalender Tim Lengkap →
            </Link>
        </div>
    );
}

// ─── Add Visit Modal ──────────────────────────────────────────────────────────────

function AddVisitModal({ open, onClose, leads, customers, customerPics = [], googleCalendarConfigured, zoomConfigured, userHasZoomLicense }) {
    const [form, setForm] = useState({
        lead_id: '', customer_id: '', visit_type: 'visit',
        subject: '', location: '', scheduled_at: '', end_at: '', is_all_day: false, notes: '',
        sync_calendar: googleCalendarConfigured,
        create_zoom: false,
        attendee_emails: [],
    });
    const [submitting, setSubmitting] = useState(false);
    const [showDirectCustomer, setShowDirectCustomer] = useState(false);
    const [errors, setErrors] = useState({});
    const [customEmail, setCustomEmail] = useState('');
    const canCreateZoom = Boolean(zoomConfigured && userHasZoomLicense);

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
            setForm(f => ({
                ...f,
                sync_calendar: Boolean(googleCalendarConfigured),
                create_zoom: Boolean(canCreateZoom),
                attendee_emails: [],
            }));
        }
    }, [open, googleCalendarConfigured, canCreateZoom]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleLeadChange = (leadId) => {
        set('lead_id', leadId);
        if (leadId) {
            const selected = leads.find(l => String(l.id) === String(leadId));
            if (selected?.customer_id) {
                set('customer_id', selected.customer_id);
                if (selected.customer?.address) set('location', selected.customer.address);
            }
        } else {
            set('customer_id', '');
        }
    };

    const selectedLead = leads.find(l => String(l.id) === String(form.lead_id));

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        setSubmitting(true);
        router.post(route('leads.visits.store'), {
            ...form,
            create_zoom: canCreateZoom && form.create_zoom,
            scheduled_at: form.is_all_day ? (form.scheduled_at?.includes('T') ? form.scheduled_at : `${form.scheduled_at}T00:00:00`) : new Date(form.scheduled_at).toISOString(),
            end_at: form.end_at ? (form.is_all_day ? (form.end_at?.includes('T') ? form.end_at : `${form.end_at}T23:59:59`) : new Date(form.end_at).toISOString()) : null,
            is_all_day: Boolean(form.is_all_day),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onError: setErrors,
            onFinish: () => setSubmitting(false),
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
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                    {Object.keys(errors).length > 0 && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{Object.entries(errors).map(([field, message]) => <p key={field}>{message}</p>)}</div>}
                    {/* Lead */}
                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Lead</label>
                        <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                            value={form.lead_id} onChange={e => handleLeadChange(e.target.value)}>
                            <option value="">-- Pilih Lead (atau kosongkan untuk kunjungan langsung) --</option>
                            {leads.map(l => <option key={l.id} value={l.id}>{l.lead_code ? `[${l.lead_code}] ` : ''}{l.title}</option>)}
                        </select>
                    </div>

                    {/* Customer info or direct customer selector */}
                    {selectedLead?.customer ? (
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Building2 className="w-4 h-4 text-brand-600 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-surface-400 font-medium">Customer otomatis dari Lead:</p>
                                    <p className="text-xs font-bold text-surface-800">{selectedLead.customer.name}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDirectCustomer(!showDirectCustomer)}
                                className="text-[11px] text-brand-600 hover:underline font-semibold cursor-pointer"
                            >
                                {showDirectCustomer ? 'Tutup' : 'Ubah'}
                            </button>
                        </div>
                    ) : !form.lead_id ? (
                        <div>
                            {!showDirectCustomer ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDirectCustomer(true)}
                                    className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Kunjungan langsung ke Customer (tanpa Lead)
                                </button>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-semibold text-surface-600">Pilih Customer</label>
                                        <button
                                            type="button"
                                            onClick={() => { setShowDirectCustomer(false); set('customer_id', ''); }}
                                            className="text-[11px] text-surface-400 hover:text-red-500 cursor-pointer"
                                        >
                                            Sembunyikan
                                        </button>
                                    </div>
                                    <select
                                        className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                        value={form.customer_id}
                                        onChange={e => set('customer_id', e.target.value)}
                                    >
                                        <option value="">-- Pilih Customer --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {showDirectCustomer && selectedLead?.customer && (
                        <div className="mt-2 animate-fade-in">
                            <label className="block text-xs font-semibold text-surface-600 mb-1">Pilih Customer Pengganti</label>
                            <select
                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                value={form.customer_id}
                                onChange={e => set('customer_id', e.target.value)}
                            >
                                <option value={selectedLead.customer_id}>-- Gunakan Customer dari Lead ({selectedLead.customer.name}) --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Type & Subject */}
                    <div>
                        <label className="block text-xs font-semibold text-surface-600 mb-1">Jenis <span className="text-red-500">*</span></label>
                        <select className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                            value={form.visit_type}
                            onChange={e => {
                                const val = e.target.value;
                                setForm(f => ({
                                    ...f,
                                    visit_type: val,
                                    create_zoom: f.create_zoom
                                }));
                            }}
                            required>
                            {Object.entries(VISIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                                        scheduled_at: checked ? (f.scheduled_at ? f.scheduled_at.slice(0, 10) : '') : (f.scheduled_at ? `${f.scheduled_at.slice(0, 10)}T09:00` : ''),
                                        end_at: ''
                                    }));
                                }}
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-surface-800">Kegiatan Seharian (All-day) / Multi-hari</span>
                        </label>

                        {form.is_all_day ? (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-surface-600 mb-1">Tanggal Mulai <span className="text-red-500">*</span></label>
                                    <input type="date" className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                        value={form.scheduled_at?.slice(0, 10) || ''} onChange={e => set('scheduled_at', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-600 mb-1">Tanggal Selesai (opsional)</label>
                                    <input type="date" min={form.scheduled_at?.slice(0, 10) || ''} className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                        value={form.end_at?.slice(0, 10) || ''} onChange={e => set('end_at', e.target.value)} />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-surface-600 mb-1">Waktu Mulai <span className="text-red-500">*</span></label>
                                    <input type="datetime-local" className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                        value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-surface-600 mb-1">Waktu Selesai (opsional)</label>
                                    <input type="datetime-local" min={form.scheduled_at} className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                        value={form.end_at} onChange={e => set('end_at', e.target.value)} />
                                </div>
                            </div>
                        )}
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

                    {/* Integration Options */}
                    <div className="bg-surface-50 rounded-xl p-3 border border-surface-200 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.sync_calendar}
                                onChange={e => set('sync_calendar', e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-surface-800 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Sinkron ke Google Calendar Tim
                            </span>
                        </label>

                        {canCreateZoom && (
                            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                                <input
                                    type="checkbox"
                                    checked={form.create_zoom}
                                    onChange={e => set('create_zoom', e.target.checked)}
                                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-surface-800 flex items-center gap-1.5">
                                    <Video className="w-3.5 h-3.5 text-sky-600" /> Buat Link Zoom Meeting Otomatis
                                </span>
                            </label>
                        )}

                        {/* PIC & Attendee Emails */}
                        {form.sync_calendar && (() => {
                            const leadPics = form.lead_id
                                ? customerPics.filter(p => {
                                    const lead = leads.find(l => String(l.id) === String(form.lead_id));
                                    return lead && String(p.customer_id) === String(lead.customer_id);
                                  })
                                : form.customer_id
                                ? customerPics.filter(p => String(p.customer_id) === String(form.customer_id))
                                : [];

                            return (
                                <div className="pt-2.5 border-t border-surface-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-surface-800 flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-blue-600" /> Undang Peserta / Tamu (Google Calendar)
                                        </span>
                                        <span className="text-[10px] text-surface-400">Opsional</span>
                                    </div>

                                    {leadPics.length > 0 && (
                                        <div className="bg-white p-2.5 rounded-lg border border-surface-200 space-y-1">
                                            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Pilih PIC Customer:</p>
                                            {leadPics.map((p) => {
                                                const hasEmail = Boolean(p.email);
                                                const isChecked = hasEmail && (form.attendee_emails || []).includes(p.email.toLowerCase());
                                                return (
                                                    <div key={p.id || p.name} className="flex items-center justify-between text-xs py-0.5">
                                                        <label className={`flex items-center gap-2 ${hasEmail ? "cursor-pointer text-surface-800" : "text-surface-400"}`}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={!hasEmail}
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    if (!hasEmail) return;
                                                                    if (e.target.checked) {
                                                                        addAttendeeEmail(p.email);
                                                                    } else {
                                                                        removeAttendeeEmail(p.email.toLowerCase());
                                                                    }
                                                                }}
                                                                className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer disabled:opacity-40"
                                                            />
                                                            <span className="font-medium">{p.name}</span>
                                                            {p.position && <span className="text-surface-400">({p.position})</span>}
                                                        </label>
                                                        <span className={`text-[11px] ${hasEmail ? "text-surface-500" : "text-amber-600 font-medium"}`}>
                                                            {hasEmail ? p.email : "Belum ada email"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex gap-1.5">
                                            <input
                                                type="email"
                                                placeholder="Ketik email tamu (misal: client@gmail.com)"
                                                value={customEmail}
                                                onChange={(e) => setCustomEmail(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        addAttendeeEmail();
                                                    }
                                                }}
                                                className="flex-1 text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addAttendeeEmail()}
                                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 cursor-pointer"
                                            >
                                                + Tambah
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-surface-400 mt-1">Tekan Enter atau klik + Tambah untuk memasukkan email tamu yang akan diundang.</p>

                                        {(form.attendee_emails || []).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {form.attendee_emails.map((email) => (
                                                    <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                                        {email}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAttendeeEmail(email)}
                                                            className="hover:text-red-600 cursor-pointer ml-0.5 font-bold"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors cursor-pointer">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting}
                            className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer">
                            {submitting ? 'Menyimpan...' : <><Plus className="w-4 h-4" /> Tambah Kunjungan</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function LeadVisits({ 
    visits = [], 
    stats = {}, 
    todayVisit = null, 
    leads = [], 
    customers = [],
    customerPics = [],
    isManagerOrAdmin = false,
    googleCalendarConfigured = false,
    zoomConfigured = false,
    userHasZoomLicense = false
}) {
    const [tab, setTab] = useState('visit');   // visit | follow_up | history
    const [subTab, setSubTab] = useState('table'); // table | calendar
    const [showForm, setShowForm] = useState(false);

    const handleCheckIn = (visit) => {
        router.post(route('leads.visits.check-in', visit.id), {}, { preserveScroll: true });
    };

    const { requestCancellation: handleDeleteVisit, cancellationModal } = useAgendaCancellation();

    const handleCreateZoom = (visitId) => {
        router.post(route('leads.visits.zoom', visitId), {}, {
            preserveScroll: true,
        });
    };

    const today = new Date().toDateString();
    const filteredVisits = visits.filter(v => {
        const d = new Date(v.scheduled_at);
        if (tab === 'visit')     return ['visit', 'demo', 'presentation', 'installation', 'maintenance', 'leave', 'other'].includes(v.visit_type);
        if (tab === 'follow_up') return v.visit_type === 'follow_up';
        if (tab === 'history')   return !!v.checked_in_at;
        return true;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Visit & Follow-up" />
            {cancellationModal}

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
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('team-calendar')}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                                <Calendar className="w-4 h-4 text-blue-600" />
                                Kalender Tim
                            </Link>
                            <button
                                onClick={() => setShowForm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer">
                                <Plus className="w-4 h-4" />
                                Tambah Visit
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        {[
                            { label: 'Akan Datang', value: stats.upcoming || 0, color: 'text-blue-600' },
                            { label: 'Hari Ini',    value: stats.today || 0,    color: 'text-brand-600' },
                            { label: 'Minggu Ini',  value: stats.thisWeek || 0, color: 'text-violet-600' },
                            { label: 'Selesai',    value: stats.checkedIn || 0, color: 'text-emerald-600' },
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
                                { key: 'history', label: 'Riwayat Selesai', icon: History, count: visits.filter(v => v.checked_in_at).length },
                            ].map(t => (
                                <button key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px cursor-pointer ${tab === t.key ? 'border-brand-500 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-700'}`}>
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
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${subTab === st.key ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-50'}`}>
                                    {st.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {subTab === 'table' ? (
                                <VisitTable
                                    visits={filteredVisits}
                                    onCheckIn={handleCheckIn}
                                    zoomConfigured={zoomConfigured}
                                    onDeleteVisit={handleDeleteVisit}
                                    onCreateZoom={handleCreateZoom}
                                />
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
                customerPics={customerPics}
                googleCalendarConfigured={googleCalendarConfigured}
                zoomConfigured={zoomConfigured}
                userHasZoomLicense={userHasZoomLicense}
            />
        </AuthenticatedLayout>
    );
}

