import { useState } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import { socialFields } from './CustomerCrmFields';
import { Pencil, Trash2, Save, X, Star, Phone, Mail, Briefcase, AlertTriangle, Loader2 } from 'lucide-react';
import axios from 'axios';

const inputCls = 'mt-1 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-800 focus:border-brand-500 focus:ring-brand-500 disabled:bg-surface-100';
const labelCls = 'block text-xs font-medium text-surface-500';

const socialIcons = {
    linkedin: '🔗', instagram: '📸', facebook: '👤', youtube: '▶️', tiktok: '🎵', x: '𝕏',
};

const initialData = (pic) => ({
    name:       pic.name        ?? '',
    email:      pic.email       ?? '',
    phone:      pic.phone       ?? '',
    position:   pic.position    ?? '',
    is_primary: !!pic.is_primary,
    birthday:   pic.crm_profile?.birthday   ?? '',
    instagram:  pic.crm_profile?.instagram  ?? '',
    linkedin:   pic.crm_profile?.linkedin   ?? '',
    facebook:   pic.crm_profile?.facebook   ?? '',
    youtube:    pic.crm_profile?.youtube    ?? '',
    tiktok:     pic.crm_profile?.tiktok     ?? '',
    x:          pic.crm_profile?.x          ?? '',
});

export default function CustomerPicProfile({ customerId, pic, canDelete = true }) {
    const canEdit = (usePage().props.auth?.permissions || []).includes('customers_edit');
    const [editing, setEditing]       = useState(false);
    const [deleting, setDeleting]     = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);

    const form = useForm(initialData(pic));

    const cancel = () => { form.reset(); form.clearErrors(); setEditing(false); };

    const submit = (e) => {
        e.preventDefault();
        form.put(route('customers.pics.update', { customer: customerId, pic: pic.id }), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(route('customers.pics.destroy', { customer: customerId, pic: pic.id }), {
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
            });
            router.reload({ preserveScroll: true });
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal menghapus PIC.');
        } finally {
            setDeleting(false);
            setConfirmDel(false);
        }
    };

    if (!editing) {
        return (
            <div className="mt-3 border-t border-surface-100 pt-3 space-y-1.5">
                {/* Contact info preview */}
                {pic.position && (
                    <div className="flex items-center gap-1.5 text-xs text-surface-500">
                        <Briefcase className="w-3 h-3 text-surface-400 shrink-0" />
                        {pic.position}
                    </div>
                )}

                {/* Social media preview */}
                {socialFields.filter(([key]) => pic.crm_profile?.[key]).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-surface-500">
                        <span className="w-3 text-center">{socialIcons[key] ?? '🔗'}</span>
                        <a
                            href={pic.crm_profile[key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:underline truncate"
                        >
                            {label}
                        </a>
                    </div>
                ))}

                {pic.crm_profile?.birthday && (
                    <div className="text-xs text-surface-400">
                        🎂 {new Date(`${pic.crm_profile.birthday}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                )}

                {/* Actions */}
                {canEdit && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                            type="button"
                            onClick={() => { form.setData(initialData(pic)); form.clearErrors(); setEditing(true); }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                        >
                            <Pencil className="w-3 h-3" /> Edit Data PIC
                        </button>
                        {canDelete && (
                            <>
                                <span className="text-surface-200">|</span>
                                {!confirmDel ? (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDel(true)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:underline"
                                    >
                                        <Trash2 className="w-3 h-3" /> Hapus
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs">
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        <span className="text-surface-600">Yakin?</span>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="font-bold text-red-600 hover:underline disabled:opacity-50"
                                        >
                                            {deleting ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Ya, hapus'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDel(false)}
                                            className="text-surface-500 hover:underline"
                                        >
                                            Batal
                                        </button>
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    /* ── Edit Form ─────────────────────────────────────────────────────────── */
    return (
        <form onSubmit={submit} className="mt-3 border-t border-surface-100 pt-3 space-y-3">
            {/* Core PIC fields */}
            <div className="space-y-2.5">
                <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wide">Data Kontak</p>

                <div>
                    <label className={labelCls}>Nama PIC <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={form.data.name}
                        onChange={e => form.setData('name', e.target.value)}
                        disabled={form.processing}
                        className={inputCls}
                        maxLength={255}
                        required
                    />
                    {form.errors.name && <p className="mt-0.5 text-xs text-red-600">{form.errors.name}</p>}
                </div>

                <div>
                    <label className={labelCls}>Jabatan / Posisi</label>
                    <input
                        type="text"
                        value={form.data.position}
                        onChange={e => form.setData('position', e.target.value)}
                        disabled={form.processing}
                        className={inputCls}
                        maxLength={255}
                        placeholder="mis. Procurement Manager"
                    />
                </div>

                <div>
                    <label className={labelCls}>Email</label>
                    <input
                        type="email"
                        value={form.data.email}
                        onChange={e => form.setData('email', e.target.value)}
                        disabled={form.processing}
                        className={inputCls}
                        maxLength={255}
                    />
                    {form.errors.email && <p className="mt-0.5 text-xs text-red-600">{form.errors.email}</p>}
                </div>

                <div>
                    <label className={labelCls}>Telepon</label>
                    <input
                        type="tel"
                        value={form.data.phone}
                        onChange={e => form.setData('phone', e.target.value)}
                        disabled={form.processing}
                        className={inputCls}
                        maxLength={50}
                    />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={form.data.is_primary}
                        onChange={e => form.setData('is_primary', e.target.checked)}
                        disabled={form.processing}
                        className="rounded border-surface-300 text-brand-600 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-surface-600 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" /> Jadikan PIC Utama
                    </span>
                </label>
            </div>

            {/* CRM profile fields */}
            <div className="space-y-2.5 border-t border-surface-100 pt-2.5">
                <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wide">Profil CRM</p>

                <div>
                    <label className={labelCls}>Tanggal Lahir</label>
                    <input
                        type="date"
                        value={form.data.birthday}
                        onChange={e => form.setData('birthday', e.target.value)}
                        disabled={form.processing}
                        className={inputCls}
                        max={new Date().toLocaleDateString('en-CA')}
                    />
                    {form.errors.birthday && <p className="mt-0.5 text-xs text-red-600">{form.errors.birthday}</p>}
                </div>

                <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide pt-1">Sosial Media PIC</p>
                {socialFields.map(([key, label]) => (
                    <div key={key}>
                        <label className={labelCls}>{socialIcons[key]} {label}</label>
                        <input
                            type="url"
                            value={form.data[key]}
                            onChange={e => form.setData(key, e.target.value)}
                            disabled={form.processing}
                            className={inputCls}
                            placeholder="https://..."
                            maxLength={2048}
                        />
                        {form.errors[key] && <p className="mt-0.5 text-xs text-red-600">{form.errors[key]}</p>}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
                <button
                    type="button"
                    onClick={cancel}
                    disabled={form.processing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-50"
                >
                    <X className="w-3.5 h-3.5" /> Batal
                </button>
                <button
                    type="submit"
                    disabled={form.processing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                    {form.processing
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</>
                        : <><Save className="w-3.5 h-3.5" /> Simpan PIC</>
                    }
                </button>
            </div>
        </form>
    );
}
