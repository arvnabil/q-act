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

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer shadow-xs"
            >
                <Link2 className="h-4 w-4" />
                {linked ? 'Lead & Tindak Lanjut' : 'Hubungkan ke Lead'}
            </button>
            <Modal show={open} onClose={() => setOpen(false)} maxWidth="2xl">
                <div className="flex max-h-[85vh] flex-col overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b border-surface-100 px-6 py-4 bg-surface-50/60">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
                                <Link2 className="w-4 h-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-sm font-bold text-surface-900">
                                    {linked ? 'Lead & Tindak Lanjut' : 'Hubungkan Quotation ke Lead'}
                                </DialogTitle>
                                <p className="text-[11px] text-surface-500 font-mono">{quotationId}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Tutup"
                            className="p-1 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="overflow-y-auto p-6">
                        {editing && (
                            <p className="mb-4 text-xs text-surface-500 bg-surface-50 p-2.5 rounded-lg border border-surface-200">
                                Customer, PIC, dan nilai diambil dari quotation tersimpan. Simpan perubahan quotation terlebih dahulu jika data baru diubah.
                            </p>
                        )}
                        {open && (
                            <WorkflowPanel
                                quotationId={quotationId}
                                embedded
                                refreshPage={!editing}
                                onLinked={setLinked}
                                onCloseModal={() => setOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
}
