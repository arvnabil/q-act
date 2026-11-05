import React, { useState, useEffect, useCallback } from 'react';
import { Link, router } from '@inertiajs/react';
import { DialogTitle } from '@headlessui/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Modal from '@/Components/Modal';
import { Calendar, Link2, Plus, X, Check, ArrowRight } from 'lucide-react';

const formatVisitPeriod = (v) => {
    if (!v?.scheduled_at) return '';
    const start = new Date(v.scheduled_at);
    if (v.is_all_day) {
        const startStr = start.toLocaleDateString('id-ID', { dateStyle: 'medium' });
        if (v.end_at) {
            const end = new Date(v.end_at);
            const endStr = end.toLocaleDateString('id-ID', { dateStyle: 'medium' });
            return startStr === endStr ? `${startStr} (Seharian)` : `${startStr} – ${endStr} (Seharian)`;
        }
        return `${startStr} (Seharian)`;
    }
    const startStr = start.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    if (v.end_at) {
        const end = new Date(v.end_at);
        const isSameDay = start.toDateString() === end.toDateString();
        if (isSameDay) {
            const endTimeStr = end.toLocaleTimeString('id-ID', { timeStyle: 'short' });
            return `${startStr} – ${endTimeStr}`;
        }
        const endStr = end.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        return `${startStr} – ${endStr}`;
    }
    return startStr;
};
const dateLabel = value => typeof value === 'object' && value !== null ? formatVisitPeriod(value) : (value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const localInput = value => { const d = new Date(value); const pad = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const field = 'w-full rounded-lg border-surface-200 text-sm focus:ring-brand-500';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-700 hover:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50';

export default function WorkflowPanel({ quotationId, leadId, embedded = false, refreshPage = true, onLinked }) {
    const [data, setData] = useState(null), [mode, setMode] = useState(null), [busy, setBusy] = useState(false);
    const [error, setError] = useState(''), [warnings, setWarnings] = useState([]), [all, setAll] = useState(false);
    const [otherIds, setOtherIds] = useState([]);
    const [selected, setSelected] = useState(''), [title, setTitle] = useState(''), [form, setForm] = useState({});
    const endpoint = quotationId ? `/workflow/quotations/${encodeURIComponent(quotationId)}` : `/workflow/leads/${leadId}`;
    const load = useCallback(async () => {
        try { const res = await axios.get(endpoint); setData(res.data); onLinked?.(!!res.data.lead); }
        catch { setError('Tidak dapat memuat hubungan proyek dan agenda.'); }
    }, [endpoint, onLinked]);
    useEffect(() => { load(); window.addEventListener('workflow-updated', load); return () => window.removeEventListener('workflow-updated', load); }, [load]);
    const notify = () => { window.dispatchEvent(new Event('workflow-updated')); if (refreshPage) router.reload({ only: ['lead', 'quotation'] }); };
    const perform = async (fn, successMessage) => {
        if (busy) return;
        setBusy(true); setError(''); setWarnings([]);
        try { const res = await fn(); setWarnings(res.data.warnings || []); setMode(null); await load(); notify(); if (successMessage) toast.success(successMessage); }
        catch (e) { setError(Object.values(e.response?.data?.errors || {}).flat()[0] || e.response?.data?.message || 'Gagal menyimpan. Silakan coba lagi.'); }
        finally { setBusy(false); }
    };
    const schedule = (visit = null) => {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1); tomorrow.setHours(9,0,0,0);
        setError(''); setForm(visit ? {
            ...visit,
            scheduled_at: visit.is_all_day && visit.scheduled_at ? visit.scheduled_at.slice(0, 10) : localInput(visit.scheduled_at),
            end_at: visit.end_at ? (visit.is_all_day ? visit.end_at.slice(0, 10) : localInput(visit.end_at)) : '',
            is_all_day: Boolean(visit.is_all_day),
            sync_calendar: Boolean(visit?.google_calendar_event_id || data?.calendarConfigured),
            create_zoom: Boolean(visit?.zoom_meeting_id || data?.zoomConfigured)
        } : {
            subject: `Follow-up ${quotationId || data?.lead?.title || 'peluang'}`,
            scheduled_at: localInput(tomorrow),
            end_at: '',
            is_all_day: false,
            visit_type: 'follow_up',
            location: '',
            notes: '',
            sync_calendar: Boolean(data?.calendarConfigured),
            create_zoom: Boolean(data?.zoomConfigured),
        });
        setMode(visit ? 'reschedule' : 'schedule');
    };
    useEffect(() => {
        const openSchedule = e => {
            if (!data?.canSchedule || e.detail?.leadId !== leadId || !leadId) return;
            schedule();
            setForm(f => ({...f, visit_type:e.detail.visit_type || 'follow_up', subject:`Meeting ${data.lead?.title || 'customer'}`}));
        };
        window.addEventListener('workflow-schedule', openSchedule);
        return () => window.removeEventListener('workflow-schedule', openSchedule);
    }, [data, leadId]);
    const visits = data?.visits || [];
    const pending = visits.filter(v => !v.checked_in_at && !v.cancelled_at);
    const list = [...pending, ...visits.filter(v => v.checked_in_at || v.cancelled_at)];
    const close = () => { if (!busy) { setMode(null); setError(''); } };
    return <section id="workflow" className={embedded ? '' : 'mb-5 rounded-2xl border border-brand-100 bg-white p-4 sm:p-5'}>
        <div className="flex flex-wrap items-start justify-between gap-3">
            {!embedded && <div><h3 className="flex items-center gap-2 text-sm font-bold text-surface-900"><Calendar className="h-4 w-4 text-brand-600" />Proyek & Tindak Lanjut</h3>
                <p className="mt-1 text-xs text-surface-500">Satu agenda tersambung ke dokumen, Visit & Follow-up, dan kalender internal.</p></div>}
            {data?.canSchedule && (!quotationId || data?.lead) && <button type="button" onClick={() => schedule()} className={button}><Plus className="h-3.5 w-3.5" />Jadwalkan tindak lanjut</button>}
        </div>
        {!data && !error && <p role="status" className="py-5 text-sm text-surface-500">Memuat lead dan agenda…</p>}
        {quotationId && data && <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm">
            {data.lead ? <>
                <p className="flex items-center gap-2 font-semibold text-brand-700"><Check className="h-4 w-4" />Quotation sudah terhubung</p>
                <Link href={'/leads/' + data.lead.id} className="mt-2 block font-bold text-surface-900 hover:underline">{data.lead.title} →</Link>
                {data.canManage && data.otherQuotations?.length > 0 && <button type="button" className={button + ' mt-3'} onClick={() => {setSelected(data.lead.id);setOtherIds([]);setError('');setMode('link');}}>Hubungkan quotation lain</button>}
            </> : <>
                <h4 className="font-bold text-surface-900">Quotation ini untuk proyek yang mana?</h4>
                <p className="mt-1 text-xs text-surface-500">Satu proyek bisa memiliki banyak quotation. Hubungkan ke lead yang sama agar riwayat terkumpul; buat lead baru hanya untuk proyek berbeda.</p>
                {data.canManage ? <div className="mt-4 space-y-3">
                    {!data.candidates?.length && <div className="rounded-lg border border-surface-200 bg-white p-3"><p className="font-semibold text-surface-800">Lead yang sudah ada</p><p className="mt-1 text-xs text-surface-500">Belum ada lead aktif untuk customer ini dalam cakupan akses Anda.</p></div>}
                    {!!data.candidates?.length && <div className="space-y-2"><p className="text-xs font-semibold text-surface-600">Lead yang disarankan — hubungkan jika proyeknya sama</p>{data.candidates.map(l => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-200 bg-white p-3"><div><p className="text-xs text-surface-500">{l.lead_code}</p><p className="font-semibold text-surface-800">{l.title}</p></div><button type="button" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50" onClick={() => perform(() => axios.post(endpoint + '/lead', {lead_id:l.id}), 'Quotation berhasil dihubungkan ke lead.')}><Link2 className="h-4 w-4" />Hubungkan</button></div>)}</div>}
                    <div className="rounded-lg border border-brand-200 bg-white p-3"><p className="font-semibold text-surface-800">{data.candidates?.length ? 'Proyek berbeda? Buat lead baru' : 'Buat lead dari quotation ini'}</p><p className="mt-1 text-xs text-surface-500">Nama proyek: {data.suggestedTitle}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50" onClick={() => {setOtherIds([]);setTitle(data.suggestedTitle || '');setError('');setMode('create');}}><Plus className="h-4 w-4" />{busy ? 'Menyimpan…' : 'Buat lead untuk proyek baru'}</button><button type="button" disabled={busy} className={button} onClick={() => {setOtherIds([]);setTitle(data.suggestedTitle || '');setError('');setMode('create');}}>Ubah nama / pilih quotation lain</button></div></div>
                </div> : <p className="mt-3 text-xs text-surface-500">Anda belum memiliki izin untuk menghubungkan lead.</p>}
            </>}
        </div>}
        {quotationId && data && !data.lead && data.canSchedule && <button type="button" onClick={() => schedule()} className={button + ' mt-4'}><Calendar className="h-4 w-4" />Jadwalkan tindak lanjut tanpa lead</button>}
        {pending.length > 0 && <p className="mt-4 text-xs font-semibold text-brand-700">{pending.length} agenda aktif. Gunakan Jadwal ulang untuk memperbarui agenda yang sudah ada.</p>}
        <div className="mt-3 divide-y divide-surface-100">{(all ? list : list.slice(0, 4)).map(v => <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="text-sm font-semibold text-surface-800">{v.subject}</p><p className="mt-1 text-xs text-surface-500">{formatVisitPeriod(v)} · {v.cancelled_at ? 'Dibatalkan' : v.checked_in_at ? 'Selesai' : new Date(v.scheduled_at) < new Date() ? 'Terlambat' : 'Terjadwal'}</p>
                {v.quotation_id && <Link href={`/quotations/${v.quotation_id}`} className="text-xs text-brand-600">{v.quotation_id}</Link>}
                {v.zoom_join_url && !v.cancelled_at && <a href={v.zoom_join_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-semibold text-brand-600">Buka Zoom ↗</a>}
            </div>
            {data?.canSchedule && !v.checked_in_at && !v.cancelled_at && <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={button} onClick={() => perform(() => axios.post(`/leads/visits/${v.id}/check-in`))}><Check className="h-3 w-3" />Selesai</button><button type="button" className={button} onClick={() => schedule(v)}>Jadwal ulang</button><button type="button" className={`${button} text-red-600`} onClick={() => { setForm(v); setMode('cancel'); }}>Batalkan</button></div>}
        </div>)}</div>
        {data && !visits.length && <p className="mt-3 text-xs text-surface-400">Belum ada agenda. Pilih waktu untuk follow-up atau pertemuan berikutnya.</p>}
        {list.length > 4 && <button type="button" className="mt-2 text-xs font-semibold text-brand-600" onClick={() => setAll(!all)}>{all ? 'Ringkas' : `Lihat semua (${list.length})`}</button>}
        <div className="mt-3 flex gap-4 text-xs text-brand-600"><Link href="/leads/visits">Visit & Follow-up →</Link><Link href="/team-calendar">Kalender →</Link></div>
        {!mode && error && <p role="alert" className="mt-3 text-xs text-red-600">{error} <button onClick={load} className="underline">Coba lagi</button></p>}
        {warnings.map(w => <p key={w} role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{w}</p>)}
        <Modal show={!!mode} onClose={close} maxWidth="xl"><form onSubmit={e => {
            e.preventDefault();
            if (mode === 'create' || mode === 'link') perform(() => axios.post(`${endpoint}/lead`, mode === 'create' ? {title, quotation_ids: otherIds} : {lead_id: selected, quotation_ids: otherIds}));
            else if (mode === 'cancel') perform(() => axios.post(`/workflow/visits/${form.id}/cancel`));
            else {
                const payload = {
    ...form,
    scheduled_at: form.is_all_day ? (form.scheduled_at?.includes('T') ? form.scheduled_at : `${form.scheduled_at}T00:00:00`) : new Date(form.scheduled_at).toISOString(),
    end_at: form.end_at ? (form.is_all_day ? (form.end_at?.includes('T') ? form.end_at : `${form.end_at}T23:59:59`) : new Date(form.end_at).toISOString()) : null,
    quotation_id: quotationId || null,
    lead_id: data?.lead?.id || leadId || null
};
                perform(() => mode === 'reschedule' ? axios.put(`/leads/visits/${form.id}`, payload) : axios.post('/leads/visits', payload));
            }
        }} className="flex max-h-[85vh] flex-col">
            <div className="flex items-center justify-between border-b border-surface-100 p-5"><DialogTitle className="font-bold text-surface-900">{mode === 'create' ? 'Buat Lead dari Quotation' : mode === 'link' ? 'Hubungkan ke Lead' : mode === 'cancel' ? 'Batalkan Agenda?' : mode === 'reschedule' ? 'Jadwal Ulang' : 'Jadwalkan Tindak Lanjut'}</DialogTitle><button type="button" onClick={close} aria-label="Tutup" disabled={busy}><X className="h-5 w-5 text-surface-400" /></button></div>
            <fieldset disabled={busy} className="space-y-4 overflow-y-auto p-5">
                {mode === 'create' && <><p className="text-sm text-surface-500">Customer, PIC, sales, dan nilai awal diambil dari quotation. Revisi/sub mengikuti lead yang sama.</p><label className="block text-xs font-semibold">Nama proyek<input value={title} onChange={e => setTitle(e.target.value)} required maxLength={255} className={`${field} mt-2`} /></label></>}
                {mode === 'link' && <><p className="text-sm text-surface-500">Pilih proyek customer yang sama. PIC yang sama tidak otomatis berarti proyek yang sama.</p>{data?.lead ? <p className="text-sm font-semibold text-brand-700">{data.lead.title}</p> : <select aria-label="Lead tujuan" required value={selected} onChange={e => setSelected(e.target.value)} className={field}><option value="">Pilih lead yang sudah ada</option>{data?.candidates?.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>}{!data?.lead && !data?.candidates?.length && <p className="text-xs text-surface-500">Belum ada lead yang sesuai dalam cakupan akses Anda. Gunakan Buat lead dari quotation.</p>}</>}
                {['create','link'].includes(mode) && data?.otherQuotations?.length > 0 && <div className="rounded-xl border border-surface-200 p-3"><p className="text-xs font-semibold">Sertakan quotation lain untuk proyek ini (opsional)</p><p className="mt-1 text-xs text-surface-500">Customer yang sama belum tentu proyek yang sama. Pilih hanya yang berkaitan; nilai penawaran tidak dijumlahkan otomatis.</p><div className="mt-2 max-h-40 space-y-2 overflow-y-auto">{data.otherQuotations.map(q => <label key={q.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={otherIds.includes(q.id)} onChange={e => setOtherIds(e.target.checked ? [...otherIds,q.id] : otherIds.filter(id => id !== q.id))}/><span>{q.id} · {q.status}</span></label>)}</div></div>}
                {mode === 'cancel' && <p className="text-sm text-surface-600">Agenda “{form.subject}” akan dibatalkan. Riwayat tetap disimpan.</p>}
                {['schedule','reschedule'].includes(mode) && <>
                    <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-700">Konteks: {quotationId || data?.lead?.title}. Customer dan penanggung jawab diisi otomatis.</p>
                    {pending.length > 0 && mode === 'schedule' && <p className="text-xs text-amber-700">Sudah ada {pending.length} agenda aktif. Simpan akan menambah agenda lain.</p>}
                    <label className="block text-xs font-semibold">Jenis agenda<select value={form.visit_type} onChange={e => setForm({...form,visit_type:e.target.value})} className={`${field} mt-1`}><option value="follow_up">Follow-up</option><option value="visit">Kunjungan</option><option value="demo">Demo</option><option value="other">Meeting online / lainnya</option><option value="presentation">Presentasi</option><option value="installation">Instalasi</option><option value="maintenance">Maintenance</option><option value="leave">Cuti</option></select></label>
                    <label className="block text-xs font-semibold">Tindakan<input required maxLength={255} value={form.subject || ''} onChange={e => setForm({...form,subject:e.target.value})} className={`${field} mt-1`} /></label>
                    <div className="space-y-2 rounded-xl bg-surface-50 p-3 border border-surface-200">
    <label className="flex items-center gap-2 text-xs font-semibold text-surface-700 cursor-pointer">
        <input
            type="checkbox"
            checked={Boolean(form.is_all_day)}
            onChange={e => {
                const checked = e.target.checked;
                setForm({
                    ...form,
                    is_all_day: checked,
                    scheduled_at: checked ? (form.scheduled_at ? form.scheduled_at.slice(0, 10) : '') : (form.scheduled_at ? `${form.scheduled_at.slice(0, 10)}T09:00` : ''),
                    end_at: ''
                });
            }}
            className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
        />
        <span>Kegiatan Seharian / Multi-hari</span>
    </label>
    {form.is_all_day ? (
        <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold">
                Tgl mulai <span className="text-red-500">*</span>
                <input type="date" required value={form.scheduled_at?.slice(0, 10) || ''} onChange={e => setForm({...form, scheduled_at: e.target.value})} className={`${field} mt-1`} />
            </label>
            <label className="block text-xs font-semibold">
                Tgl selesai (opsional)
                <input type="date" min={form.scheduled_at?.slice(0, 10) || ''} value={form.end_at?.slice(0, 10) || ''} onChange={e => setForm({...form, end_at: e.target.value})} className={`${field} mt-1`} />
            </label>
        </div>
    ) : (
        <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-semibold">
                Waktu mulai <span className="text-red-500">*</span>
                <input type="datetime-local" required value={form.scheduled_at || ''} onChange={e => setForm({...form, scheduled_at: e.target.value})} className={`${field} mt-1`} />
            </label>
            <label className="block text-xs font-semibold">
                Waktu selesai (opsional)
                <input type="datetime-local" min={form.scheduled_at || ''} value={form.end_at || ''} onChange={e => setForm({...form, end_at: e.target.value})} className={`${field} mt-1`} />
            </label>
        </div>
    )}
</div>
                    <label className="block text-xs font-semibold">Lokasi / catatan (opsional)<input value={form.location || ''} maxLength={255} onChange={e => setForm({...form,location:e.target.value})} className={`${field} mt-1`} /></label>
                    {mode === 'schedule' && <div className="space-y-2 text-xs"><p className="text-surface-500">Kalender internal otomatis diperbarui. Integrasi berikut opsional:</p><label className="flex items-center gap-2"><input type="checkbox" disabled={!data?.calendarConfigured} checked={!!form.sync_calendar} onChange={e => setForm({...form,sync_calendar:e.target.checked})} />Sinkronkan Google Calendar {!data?.calendarConfigured && '(belum terhubung)'}</label><label className="flex items-center gap-2"><input type="checkbox" disabled={!data?.zoomConfigured} checked={!!form.create_zoom} onChange={e => setForm({...form,create_zoom:e.target.checked})} />Buat tautan Zoom {!data?.zoomConfigured && '(belum tersedia)'}</label></div>}
                </>}
                {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            </fieldset>
            <div className="flex justify-end gap-2 border-t border-surface-100 p-4"><button type="button" onClick={close} disabled={busy} className={button}>Kembali</button><button type="submit" disabled={busy || (mode === 'link' && !selected)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Menyimpan…' : mode === 'cancel' ? 'Batalkan agenda' : 'Simpan'}</button></div>
        </form></Modal>
    </section>;
}
