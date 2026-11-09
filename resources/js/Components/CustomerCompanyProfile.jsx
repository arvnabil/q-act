import { useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Building2, Pencil, Save, Paperclip } from 'lucide-react';
import CrmField, { socialFields } from './CustomerCrmFields';

const groups = [
    ['Profil Perusahaan', [['legal_name', 'Nama legal perusahaan'], ['industry', 'Industri'], ['website', 'Website', 'url'], ['procurement_website', 'Website pengadaan / lelang', 'url'], ['company_email', 'Email perusahaan', 'email'], ['company_phone', 'Telepon kantor', 'tel'], ['category', 'Kategori customer'], ['source', 'Sumber customer'], ['anniversary', 'Tanggal berdiri / ulang tahun perusahaan', 'date'], ['address', 'Alamat kantor', 'textarea']]],
    ['Administrasi & Pajak', [['npwp', 'NPWP'], ['tax_name', 'Nama sesuai NPWP'], ['tax_address', 'Alamat pajak', 'textarea']]],
    ['Alamat & Penagihan', [['billing_address', 'Alamat penagihan', 'textarea'], ['shipping_address', 'Alamat pengiriman', 'textarea'], ['billing_email', 'Email penerima invoice', 'email'], ['payment_terms_days', 'Termin pembayaran (hari)', 'number'], ['billing_instructions', 'Instruksi penagihan', 'textarea']]],
    ['Sosial Media Perusahaan', socialFields],
    ['Catatan CRM', [['notes', 'Kebutuhan dan catatan customer', 'textarea']]],
];
const legalName = customer => customer.crm_profile?.legal_name?.trim() || customer.name || '';
const initial = customer => ({
    ...Object.fromEntries(groups.flatMap(([, fields]) => fields.map(([key]) => [key, customer.crm_profile?.[key] ?? '']))),
    legal_name: legalName(customer),
    address: customer.address || '', billing_same_as_office: !!customer.crm_profile?.billing_same_as_office,
    shipping_same_as_office: !!customer.crm_profile?.shipping_same_as_office, npwp_file: null, remove_npwp_file: false,
});

export default function CustomerCompanyProfile({ customer }) {
    const canEdit = (usePage().props.auth?.permissions || []).includes('customers_edit');
    const [editing, setEditing] = useState(false);
    const form = useForm(initial(customer));
    const profile = customer.crm_profile || {};
    const begin = () => { form.setData(initial(customer)); form.clearErrors(); setEditing(true); };
    const submit = e => {
        e.preventDefault();
        form.transform(data => ({ ...data, _method: 'put' }));
        form.post(route('customers.profile.update', customer.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setEditing(false);
                form.setData('npwp_file', null);
            },
        });
    };
    return <form onSubmit={submit} className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 font-bold text-surface-800"><Building2 className="h-5 w-5 text-brand-600" />Informasi Perusahaan</h3><p className="mt-1 text-xs text-surface-500">Lengkapi bertahap. Semua informasi tambahan bersifat opsional.</p></div>
            {canEdit && !editing && <button type="button" onClick={begin} className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700"><Pencil className="h-4 w-4" />Edit Informasi</button>}
        </div>
        {groups.map(([title, fields]) => <section key={title} className="space-y-4 border-t border-surface-100 pt-5">
            <h4 className="text-sm font-semibold text-surface-800">{title}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map(field => {
                    const key = field[0];
                    const sameKey = key === 'billing_address' ? 'billing_same_as_office' : key === 'shipping_address' ? 'shipping_same_as_office' : null;
                    const same = sameKey && (editing ? form.data[sameKey] : profile[sameKey]);
                    const value = same || key === 'address' ? customer.address : key === 'legal_name' ? legalName(customer) : profile[key];
                    const fieldForm = same ? { ...form, data: { ...form.data, [key]: form.data.address } } : form;
                    return <div key={key}>
                        <CrmField key={`${key}-${editing}`} field={field} form={fieldForm} editing={editing} value={value} disabled={!!same} />
                        {sameKey && editing && <label className="mt-2 flex items-center gap-2 text-xs text-surface-600"><input type="checkbox" checked={form.data[sameKey]} disabled={form.processing} onChange={e => form.setData(sameKey, e.target.checked)} className="rounded border-surface-300 text-brand-600" />Sama dengan alamat kantor</label>}
                        {editing && key === 'payment_terms_days' && <p className="mt-1 text-xs text-surface-400">0 = tunai; kosong = belum ditentukan. Referensi transaksi berikutnya.</p>}
                    </div>;
                })}
            </div>
            {title === 'Administrasi & Pajak' && <div className="rounded-xl border border-surface-200 p-4 space-y-2 text-sm">
                <p className="font-medium text-surface-700">Dokumen NPWP</p>
                {profile.npwp_document && <a href={route('customers.npwp-document', customer.id)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-600 break-all"><Paperclip className="h-4 w-4 shrink-0" />{profile.npwp_document.name}</a>}
                {!profile.npwp_document && !editing && <p className="text-surface-400">Belum diunggah</p>}
                {editing && <>
                    <label className="block text-xs text-surface-500" htmlFor="npwp-file">{profile.npwp_document ? 'Ganti dokumen' : 'Upload dokumen'} — PDF/JPG/PNG/WebP, maks. 3 MB</label>
                    <input id="npwp-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={form.processing} onChange={e => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.size > 3 * 1024 * 1024) { form.setError('npwp_file', 'Ukuran file maksimal 3 MB.'); form.setData('npwp_file', null); e.target.value = ''; return; }
                        form.clearErrors('npwp_file'); form.setData(data => ({ ...data, npwp_file: file, remove_npwp_file: false }));
                    }} className="block w-full text-sm" />
                    {form.errors.npwp_file && <p role="alert" className="text-xs text-red-600">{form.errors.npwp_file}</p>}
                    {profile.npwp_document && !form.data.npwp_file && <label className="flex items-center gap-2 text-xs text-surface-600"><input type="checkbox" checked={form.data.remove_npwp_file} disabled={form.processing} onChange={e => form.setData('remove_npwp_file', e.target.checked)} />Hapus dokumen saat disimpan</label>}
                    {form.progress && <p className="text-xs text-surface-500">Mengunggah {form.progress.percentage}%</p>}
                </>}
            </div>}
        </section>)}
        {editing && <div className="sticky bottom-0 flex justify-end gap-2 border-t border-surface-100 bg-white py-4">
            <button type="button" disabled={form.processing} onClick={() => setEditing(false)} className="rounded-lg border border-surface-200 px-4 py-2 text-sm">Batal</button>
            <button disabled={form.processing} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{form.processing ? 'Menyimpan...' : 'Simpan Informasi'}</button>
        </div>}
    </form>;
}
