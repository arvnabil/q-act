import React, { useState, useEffect } from 'react';
import { Head, usePage, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ManagementPageHeader from '@/Components/ManagementPageHeader';
import { ShieldCheck, Loader2, Save, Search, ArrowLeft, ArrowRight, Users, Building2, Check, X, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';

const FEATURE_LABELS = {
    'dashboard': 'Dashboard - Akses Halaman',
    'dashboard_view': 'Dashboard - Lihat Performa & Laporan',
    'sales_targets_edit': 'Dashboard - Atur Target Sales',
    'leads_view': 'Lead Pipeline - Lihat Board',
    'leads_manage': 'Lead Pipeline - Tambah / Edit / Pindah Stage',
    'leads_visits': 'Lead Pipeline - Visit & Follow-up',
    'calendar_view_bu': 'Kalender & Agenda - Lihat data sendiri + BU',
    'calendar_view_all': 'Kalender & Agenda - Lihat semua data',
    'calendar_view': 'Kalender & Agenda - Lihat',
    'quotations_view_bu': 'Quotations - Lihat data sendiri + BU',
    'quotations_view_all': 'Quotations - Lihat semua data',
    'quotations_view': 'Quotations - Lihat',
    'quotations_create': 'Quotations - Buat',
    'quotations_edit': 'Quotations - Edit',
    'quotations_delete': 'Quotations - Hapus',
    'quotations_import_legacy': 'Quotations - Import Legacy',
    'sales_orders_view_bu': 'Sales Orders - Lihat data sendiri + BU',
    'sales_orders_view_all': 'Sales Orders - Lihat semua data',
    'sales_orders_view': 'Sales Orders - Lihat',
    'sales_orders_edit': 'Sales Orders - Edit / Kelola Biaya',
    'sales_orders_delete': 'Sales Orders - Hapus',
    'sales_orders_delete_bulk': 'Sales Orders - Hapus Massal',
    'customers_view_bu': 'Customers - Lihat data sendiri + BU',
    'customers_view_all': 'Customers - Lihat semua data',
    'customers_view': 'Customers - Lihat',
    'customers_create': 'Customers - Tambah',
    'customers_edit': 'Customers - Edit',
    'customers_delete': 'Customers - Hapus',
    'products_view': 'Produk & Brand - Lihat',
    'products_create': 'Produk & Brand - Tambah',
    'products_edit': 'Produk & Brand - Edit',
    'products_delete': 'Produk & Brand - Hapus',
    'view_reports': 'Reports - Analytics',
    'achievements_view': 'Reports - Pencapaian (Sales Manager)',
    'manager_view': 'Reports - Manager View',
    'user_management': 'Sistem - User Management',
    'manage_business_units': 'Sistem - Kelola Business Units',
    'manage_settings': 'Sistem - Pengaturan Sistem (Settings)',
    'manage_roles': 'Sistem - Kelola Roles & Hak Akses',
};


const GROUPS = [
    { id: 'dashboard', label: 'Dashboard', match: f => (f.startsWith('dashboard') || f === 'sales_targets_edit') },
    { id: 'pipeline', label: 'Lead Pipeline', match: f => f.startsWith('leads_') },
    { id: 'calendar', label: 'Kalender & Agenda', match: f => f.startsWith('calendar_') },
    { id: 'quotations', label: 'Quotations', match: f => f.startsWith('quotations_') },
    { id: 'sales_orders', label: 'Sales Orders', match: f => f.startsWith('sales_orders_') },
    { id: 'customers', label: 'Customers', match: f => f.startsWith('customers_') },
    { id: 'products', label: 'Produk & Brand', match: f => f.startsWith('products_') },
    { id: 'reports', label: 'Laporan', match: f => ['view_reports', 'achievements_view', 'manager_view'].includes(f) },
    { id: 'system', label: 'Pengguna & Sistem', match: f => ['user_management', 'manage_business_units', 'manage_settings', 'manage_roles'].includes(f) },
];
const SCOPED = ['dashboard_view', 'calendar_view', 'quotations_view', 'sales_orders_view', 'customers_view'];
const isScope = f => f.endsWith('_view_bu') || f.endsWith('_view_all');
const describe = f => SCOPED.includes(f) ? 'Membuka daftar, hasil pencarian, dan detail sesuai cakupan data.'
    : f.includes('import') ? 'Mengimpor quotation lama ke dalam sistem.'
    : f.includes('delete') ? 'Menghapus data sesuai aturan modul.'
    : f.includes('create') ? 'Membuat data baru pada modul ini.'
    : f.includes('edit') || f.includes('manage') ? 'Mengelola fitur sesuai izin tindakan yang tersedia.'
    : 'Mengakses halaman atau fitur ini.';

export default function RolesPage({ rolePermissions = {}, rolesList = [], features = [], roleMembers = {} }) {
    const { props } = usePage();
    const [draft, setDraft] = useState(rolePermissions);
    const [selected, setSelected] = useState(null);
    const [tab, setTab] = useState('settings');
    const [category, setCategory] = useState('dashboard');
    const [search, setSearch] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [roleSearch, setRoleSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmBack, setConfirmBack] = useState(false);
    useEffect(() => { setDraft(rolePermissions); }, [rolePermissions]);
    const permissions = draft[selected] || {};
    const dirty = selected && JSON.stringify(permissions) !== JSON.stringify(rolePermissions[selected] || {});
    const baseFeatures = features.filter(f => !isScope(f));
    const groups = [...GROUPS, { id: 'other', label: 'Lainnya', match: f => !GROUPS.some(g => g.match(f)) }]
        .filter(g => baseFeatures.some(g.match));
    const activeGroup = groups.find(g => g.id === category) || groups[0];
    const shown = baseFeatures.filter(f => (search.trim() || activeGroup?.match(f)) &&
        (FEATURE_LABELS[f] || f).toLowerCase().includes(search.trim().toLowerCase()));
    const members = roleMembers[selected] || [];
    const filteredMembers = members.filter(m => `${m.name} ${m.email} ${m.business_unit || ''}`.toLowerCase().includes(memberSearch.toLowerCase()));
    const canManageUsers = props.auth?.permissions?.includes('user_management');
    const setPermission = (feature, value) => setDraft(prev => ({ ...prev, [selected]: { ...prev[selected], [feature]: value } }));
    const scope = feature => permissions[feature + '_all'] ? 'all' : permissions[feature + '_bu'] ? 'bu' : 'own';
    const setScope = (feature, value) => setDraft(prev => ({ ...prev, [selected]: {
        ...prev[selected], [feature + '_all']: value === 'all', [feature + '_bu']: value === 'bu',
    } }));
    const openRole = role => { setSelected(role); setTab('settings'); setSearch(''); setMemberSearch(''); setCategory(groups[0]?.id); };
    const goBack = () => { if (dirty) setConfirmBack(true); else setSelected(null); };
    const save = () => {
        setSaving(true);
        router.put(route('roles.update'), { rolePermissions: { [selected]: permissions } }, {
            preserveScroll: true,
            onError: errors => toast.error(Object.values(errors).flat()[0] || 'Hak akses gagal disimpan.'),
            onFinish: () => setSaving(false),
        });
    };
    return <AuthenticatedLayout>
        <Head title={selected ? `Hak Akses ${selected}` : 'Roles & Hak Akses'} />
        <div className="animate-fade-in-up w-full min-w-0 pb-8">
            {!selected ? <>
                <ManagementPageHeader page="/roles" icon={ShieldCheck} />
                <div className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-surface-100">
                        <div><h2 className="font-semibold text-surface-900">Daftar Role</h2><p className="text-xs text-surface-400 mt-1">{rolesList.length} role tersedia</p></div>
                        <div className="flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2"><Search className="w-4 h-4 text-surface-400" /><input aria-label="Cari role" value={roleSearch} onChange={e => setRoleSearch(e.target.value)} placeholder="Cari nama role..." className="border-0 p-0 text-sm focus:ring-0 bg-transparent w-48" /></div>
                    </div>
                    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-surface-50 text-surface-500"><tr><th className="px-6 py-4 font-medium">Nama Role</th><th className="px-6 py-4 font-medium">Anggota</th><th className="px-6 py-4 font-medium">Izin Aktif</th><th className="px-6 py-4 text-right font-medium">Pengaturan</th></tr></thead>
                        <tbody className="divide-y divide-surface-100">{rolesList.filter(role => role.toLowerCase().includes(roleSearch.toLowerCase())).map(role => <tr key={role} className="hover:bg-surface-50/60">
                            <td className="px-6 py-5"><button onClick={() => openRole(role)} className="font-semibold text-brand-700 hover:underline">{role}</button></td>
                            <td className="px-6 py-5 text-surface-600">{(roleMembers[role] || []).length} pengguna</td>
                            <td className="px-6 py-5"><span className="bg-brand-50 text-brand-700 rounded-full px-3 py-1 text-xs font-semibold">{baseFeatures.filter(f => rolePermissions[role]?.[f]).length} fitur</span></td>
                            <td className="px-6 py-5 text-right"><button onClick={() => openRole(role)} className="inline-flex items-center gap-2 text-brand-600 border border-brand-200 rounded-lg px-3 py-2 hover:bg-brand-50"><Settings2 className="w-4 h-4" />Atur Hak Akses<ArrowRight className="w-4 h-4" /></button></td>
                        </tr>)}</tbody></table></div>
                    {!rolesList.some(role => role.toLowerCase().includes(roleSearch.toLowerCase())) && <p className="p-10 text-center text-sm text-surface-500">Tidak ada role yang cocok.</p>}
                </div>
                <div className="mt-5 flex gap-3 p-4 bg-brand-50/60 border border-brand-100 rounded-xl text-sm text-surface-600"><Building2 className="w-5 h-5 text-brand-600 shrink-0" /><p><strong className="text-surface-800">Business Unit sebagai kelompok berbagi.</strong> Anggota satu BU dapat saling melihat data bila cakupan BU diaktifkan pada role masing-masing.</p></div>
            </> : <>
                <button onClick={goBack} disabled={saving} className="flex items-center gap-2 text-sm text-brand-600 mb-6 hover:underline disabled:opacity-50"><ArrowLeft className="w-4 h-4" />Kembali ke Daftar Role</button>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div><div className="text-xs uppercase tracking-wider text-surface-400 font-semibold mb-1">Pengaturan Role</div><h1 className="text-2xl font-bold text-surface-900">{selected}</h1><p className="mt-2 text-sm text-surface-500">Tentukan fitur yang dapat digunakan dan data yang dapat dilihat.</p></div>
                    <div className="flex items-center gap-3">{dirty && <span className="text-xs text-amber-600">Belum disimpan</span>}<button onClick={save} disabled={!dirty || saving} className="inline-flex whitespace-nowrap items-center gap-2 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-brand-700">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button></div>
                </div>
                <div role="tablist" aria-label="Pengaturan role" className="flex gap-7 border-b border-surface-200 mb-6">
                    {[['settings', 'Pengaturan Akses', ShieldCheck], ['members', `Anggota Role (${members.length})`, Users]].map(([id,label,Icon]) => <button key={id} role="tab" aria-selected={tab === id} aria-controls={`role-panel-${id}`} onClick={() => setTab(id)} className={`flex items-center gap-2 pb-3 text-sm border-b-2 ${tab === id ? 'text-brand-700 border-brand-500 font-semibold' : 'text-surface-500 border-transparent'}`}><Icon className="w-4 h-4" />{label}</button>)}
                </div>
                {tab === 'settings' ? <div role="tabpanel" id="role-panel-settings" className="flex flex-col lg:flex-row gap-6">
                    <nav aria-label="Kategori permission" className="lg:w-52 shrink-0 flex lg:flex-col overflow-x-auto gap-1">
                        {groups.map(g => <button key={g.id} onClick={() => { setCategory(g.id); setSearch(''); }} className={`flex items-center justify-between gap-3 whitespace-nowrap px-4 py-3 rounded-lg text-sm text-left ${activeGroup?.id === g.id && !search ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100'}`}>{g.label}<span className="text-xs opacity-70">{baseFeatures.filter(f => g.match(f) && permissions[f]).length}</span></button>)}
                    </nav>
                    <section className="flex-1 min-w-0 bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-surface-100 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-surface-900">{search ? 'Hasil Pencarian Fitur' : activeGroup?.label}</h2><p className="text-xs text-surface-500 mt-1">Centang untuk memberikan izin.</p></div><div className="flex items-center gap-2 border border-surface-200 rounded-lg px-3 py-2"><Search className="w-4 h-4 text-surface-400" /><input aria-label="Cari fitur" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari semua fitur..." className="border-0 p-0 text-sm focus:ring-0 w-40 bg-transparent" /></div></div>
                        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-surface-50 text-xs text-surface-500"><tr><th className="px-5 py-3 font-medium">Fitur / Tindakan</th><th className="px-5 py-3 text-center font-medium">Izinkan</th><th className="px-5 py-3 font-medium">Cakupan Data</th></tr></thead>
                            <tbody className="divide-y divide-surface-100">{shown.map(feature => {
                                const locked = selected === 'Administrator' && ['user_management', 'manage_roles'].includes(feature) && rolePermissions[selected]?.[feature];
                                const enabled = !!permissions[feature];
                                return <tr key={feature} className="hover:bg-surface-50/40"><td className="p-5 min-w-[220px]"><label htmlFor={`perm-${feature}`} className="font-semibold text-surface-800">{FEATURE_LABELS[feature] || feature}</label><p className="text-xs text-surface-500 mt-1 leading-relaxed">{locked ? 'Dipertahankan agar akses pengelolaan pengguna dan role tetap tersedia.' : describe(feature)}</p></td><td className="p-5 text-center"><input id={`perm-${feature}`} aria-label={FEATURE_LABELS[feature] || feature} type="checkbox" checked={enabled} disabled={locked || saving} onChange={e => setPermission(feature,e.target.checked)} className="w-5 h-5 rounded border-surface-300 text-brand-600 focus:ring-brand-500 disabled:opacity-40" /></td><td className="p-5 min-w-[215px]">{SCOPED.includes(feature) ? <select aria-label={`Cakupan ${FEATURE_LABELS[feature]}`} disabled={!enabled || saving} value={scope(feature)} onChange={e => setScope(feature,e.target.value)} className="w-full text-sm rounded-lg border-surface-200 text-surface-700 focus:ring-brand-500 focus:border-brand-500 disabled:bg-surface-50 disabled:opacity-40"><option value="own">Data sendiri</option><option value="bu">Data sendiri + BU</option><option value="all">Semua data</option></select> : <span className="text-surface-300">—</span>}</td></tr>;
                            })}</tbody></table></div>
                        {!shown.length && <p className="p-10 text-center text-surface-500 text-sm">Tidak ada fitur yang cocok.</p>}
                        <div className="p-5 bg-surface-50 border-t border-surface-100 text-xs text-surface-500 leading-relaxed"><strong className="text-surface-700">Tentang cakupan:</strong> Data sendiri + BU mencakup anggota BU yang sama. Tanpa BU, hanya data sendiri. Izin melihat tidak otomatis memberikan izin mengedit atau menghapus. Dropdown cakupan saat ini tersedia untuk izin melihat Dashboard, Kalender, Quotation, SO, dan Customer.</div>
                    </section>
                </div> : <section role="tabpanel" id="role-panel-members" className="bg-white border border-surface-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-surface-100 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 border border-surface-200 px-3 py-2 rounded-lg"><Search className="w-4 h-4 text-surface-400" /><input aria-label="Cari anggota role" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Cari nama, email, atau BU..." className="border-0 p-0 focus:ring-0 text-sm w-60" /></div>{canManageUsers && <Link href="/users" className="text-sm text-brand-600 font-semibold hover:underline">Kelola Pengguna →</Link>}</div>
                    <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-surface-50 text-surface-500"><tr><th className="px-6 py-3 font-medium">Pengguna</th><th className="px-6 py-3 font-medium">Business Unit</th><th className="px-6 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-surface-100">{filteredMembers.map(m => <tr key={m.id}><td className="px-6 py-4"><div className="font-semibold text-surface-800">{m.name}</div><div className="text-xs text-surface-500 mt-1">{m.email}</div></td><td className="px-6 py-4 text-surface-600">{m.business_unit || 'Belum masuk BU'}</td><td className="px-6 py-4"><span className={`text-xs rounded-full px-3 py-1 ${m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-500'}`}>{m.is_active ? 'Aktif' : 'Nonaktif'}</span></td></tr>)}</tbody></table></div>
                    {!filteredMembers.length && <div className="p-12 text-center"><Users className="w-8 h-8 text-surface-300 mx-auto mb-3" /><p className="text-sm text-surface-500">{members.length ? 'Tidak ada anggota yang cocok.' : 'Belum ada pengguna dengan role ini.'}</p></div>}
                </section>}
            </>}
        </div>
        {confirmBack && <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-labelledby="discard-title" className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl"><h2 id="discard-title" className="text-lg font-bold text-surface-900">Perubahan belum disimpan</h2><p className="text-sm text-surface-500 mt-2">Kembali ke daftar akan membatalkan perubahan pada role {selected}.</p><div className="flex justify-end gap-3 mt-6"><button autoFocus onClick={() => setConfirmBack(false)} className="px-4 py-2 border border-surface-200 rounded-lg text-sm">Lanjut Edit</button><button onClick={() => { setDraft(rolePermissions); setConfirmBack(false); setSelected(null); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Buang Perubahan</button></div></div></div>}
    </AuthenticatedLayout>;
}
