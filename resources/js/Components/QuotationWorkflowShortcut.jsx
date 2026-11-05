import React, { useEffect, useState } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Link2, X } from 'lucide-react';
import Modal from '@/Components/Modal';
import WorkflowPanel from '@/Components/WorkflowPanel';

export default function QuotationWorkflowShortcut({ quotationId, leadId = null, editing = false }) {
    const [open, setOpen] = useState(false);
    const [linked, setLinked] = useState(!!leadId);
    useEffect(() => setLinked(!!leadId), [quotationId, leadId]);
    useEffect(() => {
        const checkHash = () => { if (window.location.hash === '#workflow') setOpen(true); };
        checkHash();
        window.addEventListener('hashchange', checkHash);
        return () => window.removeEventListener('hashchange', checkHash);
    }, [quotationId]);
    return <>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <Link2 className="h-4 w-4" />{linked ? 'Lead & Tindak Lanjut' : 'Hubungkan ke Lead'}
        </button>
        <Modal show={open} onClose={() => setOpen(false)} maxWidth="2xl">
            <div className="flex max-h-[85vh] flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-surface-100 px-5 py-4">
                    <div><DialogTitle className="text-base font-bold text-surface-900">{linked ? 'Lead & Tindak Lanjut' : 'Hubungkan Quotation ke Lead'}</DialogTitle><p className="mt-1 font-mono text-xs text-surface-500">{quotationId}</p></div>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Tutup proyek dan agenda" className="rounded-lg p-2 text-surface-400 hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-brand-500"><X className="h-5 w-5" /></button>
                </div>
                <div className="overflow-y-auto p-5">
                    {editing && <p className="mb-4 text-xs text-surface-500">Customer, PIC, dan nilai diambil dari quotation tersimpan. Simpan edit quotation terlebih dahulu jika datanya berubah.</p>}
                    {open && <WorkflowPanel quotationId={quotationId} embedded refreshPage={!editing} onLinked={setLinked} />}
                </div>
            </div>
        </Modal>
    </>;
}
