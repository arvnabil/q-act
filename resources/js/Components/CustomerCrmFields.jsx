import { useState } from 'react';

export const socialFields = ['LinkedIn', 'Instagram', 'Facebook', 'YouTube', 'TikTok', 'X'].map(label => [label.toLowerCase(), label, 'url']);
const choices = {
    industry: ['Teknologi & Telekomunikasi', 'Keuangan & Asuransi', 'Pendidikan', 'Kesehatan & Farmasi', 'Manufaktur', 'Energi, Migas & Pertambangan', 'Pemerintahan & Lembaga Publik', 'Konstruksi & Properti', 'Transportasi & Logistik', 'Retail & Perdagangan', 'Hospitality & Pariwisata', 'Media & Hiburan', 'Jasa Profesional', 'Pertanian & Pangan', 'Organisasi Nirlaba'],
    category: ['End User', 'Reseller', 'Distributor', 'Individu', 'System Integrator', 'Partner'],
    source: [['referral', 'Referral'], ['cold_call', 'Cold Call'], ['website', 'Website'], ['exhibition', 'Pameran'], ['generate_ai', 'Generate AI']],
};
export const inputClass = 'mt-1.5 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-800 focus:border-brand-500 focus:ring-brand-500 disabled:bg-surface-100';
export function ProfileValue({ value, type, field }) {
    if (value === null || value === undefined || value === '') return <span className="text-surface-400">Belum diisi</span>;
    if (type === 'url' && /^https?:\/\//i.test(value)) return <a href={value} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all">{value}</a>;
    if (type === 'date') return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    if (field === 'payment_terms_days') return Number(value) === 0 ? 'Tunai (0 hari)' : `${value} hari`;
    return choices[field]?.find(option => Array.isArray(option) && option[0] === value)?.[1] || value;
}
export default function CrmField({ field, form, editing, value, disabled = false }) {
    const [key, label, type = 'text'] = field;
    const options = choices[key]?.map(option => Array.isArray(option) ? option : [option, option]);
    const [manual, setManual] = useState(false);
    const current = form.data[key] ?? '';
    const custom = manual || (!!current && options && !options.some(([v]) => v === current));
    const props = { id: `crm-${key}`, value: current, onChange: e => form.setData(key, e.target.value), disabled: disabled || form.processing, className: inputClass, 'aria-invalid': !!form.errors[key] };
    return <div>
        <label htmlFor={`crm-${key}`} className="text-xs font-medium text-surface-500">{label}</label>
        {!editing ? <p className="mt-1 whitespace-pre-wrap break-words text-sm text-surface-800"><ProfileValue value={value} type={type} field={key} /></p> : <>
            {options ? <>
                <select {...props} value={custom ? '__other' : current} onChange={e => { setManual(e.target.value === '__other'); form.setData(key, e.target.value === '__other' ? '' : e.target.value); }}>
                    <option value="">Pilih {label.toLowerCase()}</option>
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    <option value="__other">Lainnya — isi manual</option>
                </select>
                {custom && <input {...props} id={`crm-${key}-custom`} aria-label={`${label} lainnya`} placeholder={`Isi ${label.toLowerCase()} lainnya`} maxLength={255} required />}
            </> : type === 'textarea' ? <textarea {...props} rows={3} maxLength={5000} /> : <input {...props} type={type} maxLength={type === 'url' ? 2048 : 255} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 365 : type === 'date' ? new Date().toLocaleDateString('en-CA') : undefined} placeholder={type === 'url' ? 'https://...' : undefined} />}
            {form.errors[key] && <p role="alert" className="mt-1 text-xs text-red-600">{form.errors[key]}</p>}
        </>}
    </div>;
}
