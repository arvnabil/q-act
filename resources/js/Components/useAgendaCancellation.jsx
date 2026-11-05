import React, { useState } from 'react';
import { DialogTitle } from '@headlessui/react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Modal from '@/Components/Modal';

export default function useAgendaCancellation(onSaved) {
    const [target,setTarget] = useState(null), [busy,setBusy] = useState(false), [error,setError] = useState('');
    const requestCancellation = (id,subject) => {setError('');setTarget({id,subject});};
    const submit = async () => {
        if (busy) return;
        setBusy(true);setError('');
        try {
            const res = await axios.post(`/workflow/visits/${target.id}/cancel`);
            setTarget(null); toast.success('Agenda dibatalkan. Riwayat tetap tersimpan.');
            (res.data.warnings || []).forEach(w => toast(w, {duration:7000}));
            onSaved?.(); window.dispatchEvent(new Event('workflow-updated')); router.reload({preserveScroll:true});
        } catch(e) {setError(e.response?.data?.message || 'Agenda belum berhasil dibatalkan.');}
        finally {setBusy(false);}
    };
    const cancellationModal = <Modal show={!!target} onClose={() => !busy && setTarget(null)} maxWidth="md">
        <div className="p-6"><DialogTitle className="text-lg font-bold text-surface-900">Batalkan agenda?</DialogTitle>
            <p className="mt-3 text-sm text-surface-600">{target?.subject || 'Agenda ini'} akan dibatalkan. Riwayat tetap tersimpan. Event Google Calendar dan meeting Zoom yang terhubung akan ikut dibatalkan bila sinkronisasi berhasil.</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setTarget(null)} className="rounded-lg border border-surface-200 px-4 py-2 text-sm">Kembali</button><button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Menyimpan…':'Batalkan agenda'}</button></div>
        </div>
    </Modal>;
    return {requestCancellation,cancellationModal};
}
