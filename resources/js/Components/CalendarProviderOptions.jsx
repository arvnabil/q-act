import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { CalendarDays, Mail, Users, Video } from 'lucide-react';

export default function CalendarProviderOptions({
    form,
    setForm,
    calendarInviteUsers = [],
    googleCalendarConfigured = false,
    outlookCalendarConfigured = false,
    canCreateZoom = false,
}) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [customEmail, setCustomEmail] = useState('');
    const currentEmail = String(usePage().props.auth?.user?.email || '').toLowerCase();
    const hasCalendarProvider = form.sync_calendar || form.sync_outlook_calendar;
    const invitees = form.attendee_emails || [];

    const addInvitee = (email) => {
        const value = (email || '').trim().toLowerCase();
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
        setForm(current => ({
            ...current,
            attendee_emails: [...new Set([...(current.attendee_emails || []), value])],
        }));
        setSelectedUserId('');
        setCustomEmail('');
    };

    return (
        <div className="bg-surface-50 rounded-xl p-3 border border-surface-200 space-y-2">
            <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={Boolean(form.sync_calendar)} onChange={e => setForm(current => ({ ...current, sync_calendar: e.target.checked }))} className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                <span className="text-xs">
                    <span className="font-semibold text-surface-800 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-blue-600" /> Google Calendar Team</span>
                    {!googleCalendarConfigured && <span className="block text-[10px] text-amber-700 mt-0.5">Belum tersambung; agenda tetap tersimpan dan dapat disinkronkan setelah OAuth dikonfigurasi.</span>}
                </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={Boolean(form.sync_outlook_calendar)} onChange={e => setForm(current => ({ ...current, sync_outlook_calendar: e.target.checked }))} className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer" />
                <span className="text-xs">
                    <span className="font-semibold text-surface-800 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-sky-600" /> Undang ke Outlook</span>
                    {!outlookCalendarConfigured && <span className="block text-[10px] text-amber-700 mt-0.5">Mailbox noreply atau izin Microsoft Graph belum dikonfigurasi.</span>}
                </span>
            </label>
            {canCreateZoom && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={Boolean(form.create_zoom)} onChange={e => setForm(current => ({ ...current, create_zoom: e.target.checked }))} className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer" />
                    <span className="text-xs font-semibold text-surface-800 flex items-center gap-1.5"><Video className="w-3.5 h-3.5 text-sky-600" /> Buat Link Zoom Meeting Otomatis</span>
                </label>
            )}
            {hasCalendarProvider && (
                <div className="pt-2 border-t border-surface-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-700"><Users className="w-3.5 h-3.5" /> Undang peserta <span className="font-normal text-surface-500">(pembuat agenda otomatis diundang)</span></div>
                    {calendarInviteUsers.length > 0 && (
                        <div className="flex gap-2">
                            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="min-w-0 flex-1 border border-surface-200 rounded-lg px-2.5 py-2 text-xs bg-white">
                                <option value="">Pilih pengguna QSales...</option>
                                {calendarInviteUsers.filter(user => String(user.email || '').toLowerCase() !== currentEmail && !invitees.includes(String(user.email || '').toLowerCase())).map(user => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}
                            </select>
                            <button type="button" onClick={() => addInvitee(calendarInviteUsers.find(user => String(user.id) === String(selectedUserId))?.email)} disabled={!selectedUserId} className="px-3 py-2 rounded-lg bg-white border border-surface-200 text-xs font-semibold disabled:opacity-50">Tambah</button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input type="email" value={customEmail} onChange={e => setCustomEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInvitee(customEmail); } }} placeholder="Email peserta eksternal" className="min-w-0 flex-1 border border-surface-200 rounded-lg px-2.5 py-2 text-xs bg-white" />
                        <button type="button" onClick={() => addInvitee(customEmail)} className="px-3 py-2 rounded-lg bg-white border border-surface-200 text-xs font-semibold">Tambah</button>
                    </div>
                    {invitees.length > 0 && <div className="flex flex-wrap gap-1.5">{invitees.map(email => <span key={email} className="inline-flex items-center gap-1 rounded-full bg-white border border-surface-200 px-2 py-1 text-[10px] text-surface-700">{email}<button type="button" onClick={() => setForm(current => ({ ...current, attendee_emails: (current.attendee_emails || []).filter(item => item !== email) }))} className="text-surface-400 hover:text-red-600" aria-label={`Hapus ${email}`}>×</button></span>)}</div>}
                    <p className="text-[10px] text-surface-500">Peserta yang dipilih diundang melalui setiap kalender yang dicentang.</p>
                </div>
            )}
        </div>
    );
}
