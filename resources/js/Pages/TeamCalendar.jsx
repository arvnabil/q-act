import useAgendaCancellation from '@/Components/useAgendaCancellation';
import React, { useState, useMemo } from 'react';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { toast } from 'react-hot-toast';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
    MapPin, Video, Navigation, CheckCircle2, Clock,
    Building2, User, Filter, X, ExternalLink, Trash2,
    CalendarCheck, AlertCircle, ArrowLeft
} from 'lucide-react';

const VISIT_TYPES = {
    installation: { label: 'Instalasi', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
    maintenance: { label: 'Maintenance', bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
    leave: { label: 'Cuti', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    visit:        { label: 'Visit Lapangan',  bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    follow_up:    { label: 'Follow-up',       bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    demo:         { label: 'Demo Produk',     bg: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
    presentation: { label: 'Presentasi',     bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
    other:        { label: 'Lainnya',         bg: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
};

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const calendarDateKey = value => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

export default function TeamCalendar({
    calendarScope = 'own',
    buUserIds = [],
    visits = [],
    users = [],
    leads = [],
    customers = [],
    isManagerOrAdmin = false,
    googleCalendarConfigured = false,
    zoomConfigured = false,
    userHasZoomLicense = false,
}) {
    const { auth } = usePage().props;
    const currentUserId = auth?.user?.id;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedUser, setSelectedUser] = useState('');
    const [agendaScope, setAgendaScope] = useState(calendarScope);
    const [selectedType, setSelectedType] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [initialDateForAdd, setInitialDateForAdd] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const scopeTabs = useMemo(() => {
        const list = [{ key: 'own', label: 'Agenda Saya' }];
        if (calendarScope === 'all') {
            if (buUserIds?.length > 0) {
                list.push({ key: 'bu', label: 'Agenda BU' });
            }
            list.push({ key: 'all', label: 'Semua Agenda' });
        } else if (calendarScope === 'bu') {
            list.push({ key: 'bu', label: 'Agenda BU' });
        }
        return list;
    }, [calendarScope, buUserIds]);

    // Filtered visits
    const filteredVisits = useMemo(() => {
        return visits.filter(v => {
            if (agendaScope === 'own' && String(v.user_id) !== String(currentUserId)) return false;
            if (agendaScope === 'bu' && !buUserIds.includes(Number(v.user_id)) && String(v.user_id) !== String(currentUserId)) return false;
            if (selectedUser && String(v.user_id) !== String(selectedUser)) return false;
            if (selectedType && v.visit_type !== selectedType) return false;
            return true;
        });
    }, [visits, selectedUser, selectedType, agendaScope, currentUserId, buUserIds]);

    // Calendar grid calculation
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Day of week (0 = Sunday, 1 = Monday). We want Monday = 0
        let firstDayIndex = firstDayOfMonth.getDay() - 1;
        if (firstDayIndex === -1) firstDayIndex = 6;

        const daysInMonth = lastDayOfMonth.getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        const grid = [];

        // Previous month padding
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, prevMonthLastDay - i);
            grid.push({ date: d, isCurrentMonth: false });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(year, month, i);
            grid.push({ date: d, isCurrentMonth: true });
        }

        // Next month padding to reach multiple of 7
        const remaining = 7 - (grid.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                const d = new Date(year, month + 1, i);
                grid.push({ date: d, isCurrentMonth: false });
            }
        }

        return grid;
    }, [year, month]);

    // Group visits by date string "YYYY-MM-DD"
    const visitsByDate = useMemo(() => {
        const map = {};
        filteredVisits.forEach(v => {
            if (!v.scheduled_at) return;
            const dateStr = calendarDateKey(v.scheduled_at);
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push(v);
        });
        return map;
    }, [filteredVisits]);

    const isToday = (d) => {
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const { requestCancellation: handleDeleteVisit, cancellationModal } = useAgendaCancellation(() => setSelectedEvent(null));

    const handleCreateZoom = (visitId) => {
        router.post(route('leads.visits.zoom', visitId), {}, {
            preserveScroll: true,
        });
    };

    const openAddForDate = (date) => {
        const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10) + 'T09:00';
        setInitialDateForAdd(localIso);
        setShowAddModal(true);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Kalender" />
            {cancellationModal}

            <div className="space-y-5">
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-surface-200 shadow-2xs">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Agenda kerja</span>
                            <span className="text-surface-300">·</span>
                            <span className="text-xs font-semibold text-surface-500">Follow-up, kunjungan & meeting</span>
                        </div>
                        <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-brand-600" />
                            Kalender
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {googleCalendarConfigured && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <CalendarCheck className="w-3.5 h-3.5" />
                                Google Calendar Aktif
                            </span>
                        )}
                        {zoomConfigured && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                <Video className="w-3.5 h-3.5" />
                                Zoom Auto-Meet
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => { setInitialDateForAdd(null); setShowAddModal(true); }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Jadwal
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2" aria-label="Cakupan agenda">
                    {scopeTabs.map(tab => <button key={tab.key} type="button" aria-pressed={agendaScope === tab.key} onClick={() => { setAgendaScope(tab.key); setSelectedUser(''); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${agendaScope === tab.key ? 'bg-brand-600 text-white' : 'bg-white border border-surface-200 text-surface-600'}`}>{tab.label}</button>)}
                </div>
                {/* Filters & Month Navigator */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-surface-200">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevMonth}
                            className="p-2 rounded-lg border border-surface-200 hover:bg-surface-50 text-surface-600 cursor-pointer"
                            title="Bulan sebelumnya"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleToday}
                            className="px-3 py-1.5 text-xs font-bold text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-50 cursor-pointer"
                        >
                            Hari Ini
                        </button>
                        <button
                            onClick={handleNextMonth}
                            className="p-2 rounded-lg border border-surface-200 hover:bg-surface-50 text-surface-600 cursor-pointer"
                            title="Bulan berikutnya"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <h2 className="text-base font-bold text-surface-900 ml-2">
                            {MONTH_NAMES[month]} {year}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* User filter is only needed for shared agendas. */}
                        {agendaScope !== 'own' && <div className="flex items-center gap-1.5 bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5">
                            <User className="w-3.5 h-3.5 text-surface-400" />
                            <select
                                value={selectedUser}
                                onChange={e => setSelectedUser(e.target.value)}
                                className="bg-transparent text-xs font-semibold text-surface-700 outline-none cursor-pointer"
                            >
                                <option value="">{agendaScope === 'own' ? 'Saya' : calendarScope === 'bu' ? 'Semua anggota BU' : 'Semua pengguna'}</option>
                                {users.filter(u => agendaScope !== 'bu' || buUserIds.includes(Number(u.id)) || String(u.id) === String(currentUserId)).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>}

                        {/* Visit Type Filter */}
                        <div className="flex items-center gap-1.5 bg-surface-50 border border-surface-200 rounded-lg px-2.5 py-1.5">
                            <Filter className="w-3.5 h-3.5 text-surface-400" />
                            <select
                                value={selectedType}
                                onChange={e => setSelectedType(e.target.value)}
                                className="bg-transparent text-xs font-semibold text-surface-700 outline-none cursor-pointer"
                            >
                                <option value="">Semua jenis agenda</option>
                                {Object.entries(VISIT_TYPES).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>

                        <Link
                            href={route('leads.visits')}
                            className="px-3 py-1.5 text-xs font-semibold text-surface-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                        >
                            Tampilan Tabel →
                        </Link>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-surface-600">
                    <span className="font-semibold">Warna = jenis agenda:</span>
                    {Object.entries(VISIT_TYPES).map(([key, type]) => <span key={key} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${type.dot}`} />{type.label}</span>)}
                    <span className="text-surface-400">Status selesai terlihat pada detail agenda.</span>
                </div>
                <div className="bg-white rounded-2xl border border-surface-200 shadow-2xs overflow-hidden">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-surface-200 bg-surface-50/70 text-center text-xs font-bold text-surface-600 uppercase tracking-wider">
                        {DAYS.map(day => (
                            <div key={day} className="py-3 border-r border-surface-100 last:border-r-0">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Day Cells */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-y divide-surface-200">
                        {calendarDays.map((cell, idx) => {
                            const dateStr = calendarDateKey(cell.date);
                            const dayEvents = visitsByDate[dateStr] || [];
                            const today = isToday(cell.date);

                            return (
                                <div
                                    key={idx}
                                    className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors border-r border-surface-100 last:border-r-0 group relative ${
                                        !cell.isCurrentMonth
                                            ? 'bg-surface-50/40 text-surface-300'
                                            : today
                                                ? 'bg-brand-50/20 text-surface-900'
                                                : 'bg-white hover:bg-surface-50/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${
                                                today
                                                    ? 'bg-brand-600 text-white shadow-2xs'
                                                    : cell.isCurrentMonth
                                                        ? 'text-surface-700'
                                                        : 'text-surface-300'
                                            }`}
                                        >
                                            {cell.date.getDate()}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => openAddForDate(cell.date)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-surface-400 hover:text-brand-600 hover:bg-surface-100 rounded transition-opacity cursor-pointer"
                                            title="Tambah jadwal di tanggal ini"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Events list */}
                                    <div className="space-y-1 flex-1 overflow-hidden">
                                        {dayEvents.slice(0, 3).map(ev => {
                                            const typeMeta = VISIT_TYPES[ev.visit_type] || VISIT_TYPES.other;
                                            return (
                                                <button
                                                    key={ev.id}
                                                    type="button"
                                                    onClick={() => setSelectedEvent(ev)}
                                                    className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium border truncate transition-all flex items-center gap-1 cursor-pointer hover:shadow-2xs ${typeMeta.bg}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeMeta.dot}`} />
                                                    <span className="truncate flex-1 font-semibold">{ev.subject}</span>
                                                    {ev.zoom_join_url && <Video className="w-2.5 h-2.5 text-sky-600 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                        {dayEvents.length > 3 && (
                                            <p className="text-[10px] font-bold text-surface-400 pl-1">
                                                +{dayEvents.length - 3} lainnya
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-surface-200">
                        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${(VISIT_TYPES[selectedEvent.visit_type] || VISIT_TYPES.other).bg}`}>
                                    {(VISIT_TYPES[selectedEvent.visit_type] || VISIT_TYPES.other).label}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedEvent(null)}
                                className="text-surface-400 hover:text-surface-600 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-base font-bold text-surface-900">{selectedEvent.subject}</h3>
                                {selectedEvent.notes && (
                                    <p className="text-xs text-surface-500 mt-1 leading-relaxed bg-surface-50 p-2.5 rounded-lg border border-surface-100">
                                        {selectedEvent.notes}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2.5 text-xs text-surface-600">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-surface-400 shrink-0" />
                                    <span>
                                        {new Date(selectedEvent.scheduled_at).toLocaleDateString('id-ID', {
                                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>

                                {selectedEvent.location && (
                                    <div className="flex items-center gap-2">
                                        <Navigation className="w-4 h-4 text-surface-400 shrink-0" />
                                        <span>{selectedEvent.location}</span>
                                    </div>
                                )}

                                {selectedEvent.customer && (
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-surface-400 shrink-0" />
                                        <span className="font-semibold text-surface-800">{selectedEvent.customer.name}</span>
                                    </div>
                                )}

                                {selectedEvent.lead && (
                                    <div className="flex items-center justify-between bg-brand-50/60 p-2.5 rounded-lg border border-brand-100">
                                        <div>
                                            <p className="text-[10px] text-brand-600 font-bold uppercase tracking-wider">Terkait Lead Prospek</p>
                                            <p className="font-bold text-surface-800 text-xs">{selectedEvent.lead.title}</p>
                                        </div>
                                        <Link
                                            href={route('leads.show', selectedEvent.lead.id)}
                                            className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1"
                                        >
                                            Buka Lead <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-surface-400 shrink-0" />
                                    <span>Petugas Sales: <strong>{selectedEvent.user?.name || '—'}</strong></span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${selectedEvent.checked_in_at ? 'text-emerald-600' : 'text-surface-300'}`} />
                                    <span>
                                        Status: {selectedEvent.checked_in_at
                                            ? <strong className="text-emerald-700">Selesai ({new Date(selectedEvent.checked_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})</strong>
                                            : <span className="text-surface-400">Belum selesai</span>
                                        }
                                    </span>
                                </div>
                            </div>

                            {/* Integrations (Zoom & Google Calendar) */}
                            <div className="pt-2 border-t border-surface-100 space-y-2">
                                {selectedEvent.zoom_join_url ? (
                                    <a
                                        href={selectedEvent.zoom_join_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                                    >
                                        <Video className="w-4 h-4" />
                                        Masuk Zoom Meeting (Host / Peserta)
                                    </a>
                                ) : zoomConfigured && (
                                    <button
                                        type="button"
                                        onClick={() => handleCreateZoom(selectedEvent.id)}
                                        className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                        Buat Link Zoom Meeting Instan
                                    </button>
                                )}

                                {selectedEvent.gc_event_id && (
                                    <div className="flex items-center justify-center gap-1.5 text-xs text-blue-700 bg-blue-50 py-1.5 rounded-lg border border-blue-100 font-semibold">
                                        <CalendarCheck className="w-3.5 h-3.5" />
                                        Tersinkron di Google Calendar Kantor
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-3 border-t border-surface-100">
                                <button
                                    type="button"
                                    disabled={!!selectedEvent.checked_in_at || !!selectedEvent.cancelled_at}
                                    onClick={() => handleDeleteVisit(selectedEvent.id)}
                                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus Jadwal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedEvent(null)}
                                    className="px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-100 rounded-lg cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Visit Modal */}
            {showAddModal && (
                <AddCalendarVisitModal
                    open={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    leads={leads}
                    customers={customers}
                    initialDate={initialDateForAdd}
                    googleCalendarConfigured={googleCalendarConfigured}
                    zoomConfigured={zoomConfigured}
                />
            )}
        </AuthenticatedLayout>
    );
}

// ─── Add Calendar Visit Modal ─────────────────────────────────────────────────────

function AddCalendarVisitModal({ open, onClose, leads, customers, initialDate, googleCalendarConfigured, zoomConfigured }) {
    const [form, setForm] = useState({
        lead_id: '',
        customer_id: '',
        visit_type: 'visit',
        subject: '',
        location: '',
        scheduled_at: initialDate || '',
        notes: '',
        sync_calendar: Boolean(googleCalendarConfigured),
        create_zoom: Boolean(zoomConfigured),
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(f => ({
                ...f,
                scheduled_at: initialDate || f.scheduled_at,
                sync_calendar: Boolean(googleCalendarConfigured),
                create_zoom: Boolean(zoomConfigured),
            }));
        }
    }, [open, initialDate, googleCalendarConfigured, zoomConfigured]);

    const handleLeadChange = (leadId) => {
        setForm(f => ({ ...f, lead_id: leadId }));
        if (leadId) {
            const selected = leads.find(l => String(l.id) === String(leadId));
            if (selected?.customer_id) {
                setForm(f => ({ ...f, customer_id: selected.customer_id, location: selected.customer?.address || f.location }));
            }
        }
    };

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(route('leads.visits.store'), { ...form, scheduled_at: new Date(form.scheduled_at).toISOString() }, {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
            onError: () => toast.error('Gagal menambahkan jadwal'),
            onFinish: () => setSubmitting(false),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-surface-200">
                <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
                            <CalendarIcon className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-surface-900">Tambah Jadwal Kunjungan ke Kalender</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-surface-400 hover:text-surface-600 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Tautkan ke Lead Prospek <span className="text-gray-400 font-normal">(opsional)</span></label>
                        <select
                            value={form.lead_id}
                            onChange={e => handleLeadChange(e.target.value)}
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        >
                            <option value="">-- Kunjungan Langsung (Tanpa Lead) --</option>
                            {leads.map(l => (
                                <option key={l.id} value={l.id}>[{l.lead_code}] {l.title}</option>
                            ))}
                        </select>
                    </div>

                    {!form.lead_id && (
                        <div>
                            <label className="block text-xs font-semibold text-surface-700 mb-1">Customer / Perusahaan</label>
                            <select
                                value={form.customer_id}
                                onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                            >
                                <option value="">-- Pilih Customer --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Agenda / Subject <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.subject}
                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                            placeholder="Contoh: Meeting presentasi material proyek PIK 2"
                            required
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                        <div>
                            <label className="block text-xs font-semibold text-surface-700 mb-1">Tanggal & Waktu <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                value={form.scheduled_at}
                                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                                required
                                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Lokasi Kunjungan</label>
                        <input
                            type="text"
                            value={form.location}
                            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                            placeholder="Alamat kantor klien, Google Meet, dll"
                            className="w-full border border-surface-200 rounded-lg px-3 py-2 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-surface-700 mb-1">Catatan Tambahan</label>
                        <textarea
                            rows={2}
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Persiapan materi, dokumen penawaran..."
                            className="w-full border border-surface-200 rounded-lg p-2.5 text-xs text-surface-800 outline-none focus:ring-2 focus:ring-brand-500"
                        />
                    </div>

                    {/* Integrations */}
                    <div className="bg-surface-50 rounded-xl p-3 border border-surface-200 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.sync_calendar}
                                onChange={e => setForm(f => ({ ...f, sync_calendar: e.target.checked }))}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-surface-800 flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" /> Sinkron ke Google Calendar Tim
                            </span>
                        </label>

                        {zoomConfigured && (
                            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                                <input
                                    type="checkbox"
                                    checked={form.create_zoom}
                                    onChange={e => setForm(f => ({ ...f, create_zoom: e.target.checked }))}
                                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-surface-800 flex items-center gap-1.5">
                                    <Video className="w-3.5 h-3.5 text-sky-600" /> Buat Link Zoom Meeting Otomatis
                                </span>
                            </label>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
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

