import { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { DialogTitle } from '@headlessui/react';
import { Pencil, X } from 'lucide-react';
import Modal from '@/Components/Modal';
import { formatRupiah } from '@/utils/money';

export default function LeadInformationEditor({ lead, sources = [] }) {
    const { auth } = usePage().props;
    const allowed = (auth?.permissions || []).some(p => ['leads_manage', 'quotations_edit'].includes(p));
    const [open, setOpen] = useState(false);
    const [editingValue, setEditingValue] = useState(false);
    const sourceLabels = { referral: 'Referensi / Rekomendasi', cold_call: 'Kontak langsung (Cold Call)', website: 'Website', exhibition: 'Pameran / Event', generate_ai: 'Hasil pencarian AI', other: 'Lainnya' };
    const form = useForm({ title: '', estimated_value: '', source: '', notes: '', customer_name: '', customer_phone: '', customer_email: '', customer_address: '', pic_name: '', pic_phone: '' });
    const launch = () => {
        form.clearErrors();
        setEditingValue(false);
        form.setData({ title: lead.title || '', estimated_value: lead.estimated_value ?? '', source: lead.source || '', notes: lead.notes || '', customer_name: lead.customer?.name || lead.customer_name || '', customer_phone: lead.customer_phone || '', customer_email: lead.customer_email || '', customer_address: lead.customer_address || lead.customer?.address || '', pic_name: lead.pic_name || '', pic_phone: lead.pic_phone || '' });
        setOpen(true);
    };
    const fields = 'w-full rounded-lg border-surface-200 text-sm focus:border-brand-500 focus:ring-brand-500 disabled:opacity-60';
    const error = name => form.errors[name] && <p role="alert" id={`lead-${name}-error`} className="mt-1 text-xs text-red-600">{form.errors[name]}</p>;
    if (!allowed) return null;
    return <>
        <button type="button" onClick={launch} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800"><Pencil className="h-3.5 w-3.5" />Edit Informasi</button>
        <Modal show={open} onClose={() => setOpen(false)} closeable={!form.processing} maxWidth="2xl">
            <form onSubmit={e => { e.preventDefault(); form.put(route('leads.update', lead.id), { preserveScroll: true, onSuccess: () => setOpen(false) }); }}>
                <div className="flex items-center justify-between border-b border-surface-100 p-5">
                    <DialogTitle className="text-lg font-bold text-surface-800">Edit Informasi Lead</DialogTitle>
                    <button type="button" aria-label="Tutup" disabled={form.processing} onClick={() => setOpen(false)}><X className="h-5 w-5 text-surface-400" /></button>
                </div>
                <fieldset disabled={form.processing} className="max-h-[65vh] space-y-5 overflow-y-auto p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Informasi proyek</p><div><label htmlFor="lead-title" className="mb-1 block text-sm font-semibold">Nama proyek <span className="text-red-500">*</span></label><input id="lead-title" autoFocus required maxLength={255} className={fields} value={form.data.title} onChange={e => form.setData('title', e.target.value)} />{error('title')}</div>
                    <div><label htmlFor="lead-value" className="mb-1 block text-sm font-semibold">Estimasi nilai (Rp)</label><input id="lead-value" type="text" inputMode="decimal" className={fields}
                        value={editingValue ? form.data.estimated_value : (form.data.estimated_value === '' ? '' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 2 }).format(Number(form.data.estimated_value)))}
                        onFocus={() => setEditingValue(true)} onBlur={() => setEditingValue(false)}
                        onChange={e => { const value = e.target.value.replace(',', '.'); if (/^\d*(\.\d{0,2})?$/.test(value)) form.setData('estimated_value', value); }} />{error('estimated_value')}<p className="mt-1 text-xs text-surface-500">{formatRupiah(Number(form.data.estimated_value) || 0)} · Estimasi proyek; nilai quotation dan PO tetap.</p></div>
                    <div><label htmlFor="lead-source" className="mb-1 block text-sm font-semibold">Sumber lead</label><select id="lead-source" className={fields} value={form.data.source} onChange={e => form.setData('source', e.target.value)}><option value="">Pilih sumber lead</option>{[...new Set([...sources, ...(lead.source ? [lead.source] : [])])].map(source => <option key={source} value={source}>{sourceLabels[source] || source}</option>)}</select>{error('source')}</div>
                    <section className="space-y-4 border-t border-surface-100 pt-5">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-700">Customer & kontak proyek</h3>
                        {lead.customer_id && <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-700">Terhubung ke {lead.customer?.name || lead.customer_name}. Kontak di bawah disimpan untuk lead ini. Data master customer dikelola melalui Profil Customer.</p>}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {[
                                ['customer_name', 'Nama perusahaan', 'text'], ['customer_phone', 'Telepon perusahaan', 'tel'],
                                ['customer_email', 'Email perusahaan', 'email'], ['pic_name', 'Nama PIC utama', 'text'], ['pic_phone', 'Telepon PIC', 'tel'],
                            ].map(([name, label, type]) => <div key={name}><label htmlFor={`lead-${name}`} className="mb-1 block text-sm font-semibold">{label}</label><input id={`lead-${name}`} type={type} readOnly={name === 'customer_name' && !!lead.customer_id} maxLength={type === 'tel' ? 50 : type === 'email' ? 100 : 255} className={`${fields} read-only:bg-surface-50`} value={form.data[name]} onChange={e => form.setData(name, e.target.value)} />{error(name)}</div>)}
                        </div>
                        <div><label htmlFor="lead-address" className="mb-1 block text-sm font-semibold">Alamat proyek / customer</label><textarea id="lead-address" rows={2} className={fields} value={form.data.customer_address} onChange={e => form.setData('customer_address', e.target.value)} />{error('customer_address')}</div>
                    </section>
                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4"><p className="text-xs text-surface-500">Sales penanggung jawab</p><p className="mt-1 text-sm font-semibold">{lead.sales?.name || 'Belum ditentukan'}</p><p className="mt-2 text-xs text-surface-500">Tahap pipeline dikelola melalui Ubah Stage. Daftar kontak tambahan tersedia di tab Kontak PIC.</p></div>
                    <div><label htmlFor="lead-notes" className="mb-1 block text-sm font-semibold">Catatan</label><textarea id="lead-notes" rows={3} className={fields} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} />{error('notes')}</div>
                </fieldset>
                <div className="flex justify-end gap-3 border-t border-surface-100 p-5"><button type="button" disabled={form.processing} onClick={() => setOpen(false)} className="rounded-lg border border-surface-200 px-4 py-2 text-sm">Batal</button><button disabled={form.processing} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{form.processing ? 'Menyimpan…' : 'Simpan Perubahan'}</button></div>
            </form>
        </Modal>
    </>;
}
