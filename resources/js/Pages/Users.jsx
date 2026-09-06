import React, { useState } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Plus, Edit, Trash2, Users, Loader2, X, Eye, EyeOff, AlertTriangle, Shield } from 'lucide-react';

const ROLES = ['Administrator', 'Manager', 'Sales', 'Presales', 'Finance'];

const roleColor = (role) => {
    switch (role) {
        case 'Administrator': return 'bg-purple-100 text-purple-700 border border-purple-200';
        case 'Manager':
        case 'Sales Manager': return 'bg-brand-50 text-brand-700 border border-brand-200';
        case 'Presales':      return 'bg-amber-100 text-amber-700 border border-amber-200';
        case 'Finance':       return 'bg-cyan-100 text-cyan-700 border border-cyan-200';
        default:              return 'bg-surface-100 text-surface-600 border border-surface-200';
    }
};

const getInitials = (name, email) =>
    ((name || email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2));

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddModal({ onClose }) {
    const [showPass, setShowPass] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '', email: '', password: '', sales_code: '', mobile: '', role: 'Sales',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('users.store'), {
            onSuccess: () => { reset(); onClose(); },
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !processing && onClose()} />
            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up z-10">
                <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                            <Users className="w-4 h-4 text-brand-600" />
                        </div>
                        <h3 className="font-bold text-surface-800">Tambah Anggota Tim</h3>
                    </div>
                    <button onClick={onClose} className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-surface-600 block mb-1">Email <span className="text-red-500">*</span></label>
                        <input type="email" required value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all"
                            placeholder="sales@activ.com" />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-surface-600 block mb-1">Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input type={showPass ? 'text' : 'password'} required minLength={6}
                                value={data.password} onChange={e => setData('password', e.target.value)}
                                className="w-full bg-surface-50 border border-surface-200 rounded-lg pl-3 pr-10 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all"
                                placeholder="Minimal 6 karakter" />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 cursor-pointer">
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
                            <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all"
                                placeholder="Opsional" />
                        </div>
                        <div className="w-28">
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Kode <span className="text-red-500">*</span></label>
                            <input type="text" required value={data.sales_code}
                                onChange={e => setData('sales_code', e.target.value.toUpperCase())}
                                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all uppercase"
                                placeholder="SR" />
                            {errors.sales_code && <p className="text-xs text-red-500 mt-1">{errors.sales_code}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-surface-600 block mb-1">Mobile (WhatsApp)</label>
                        <input type="tel" value={data.mobile} onChange={e => setData('mobile', e.target.value)}
                            className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all"
                            placeholder="081234567890" />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Role)</label>
                        <select value={data.role} onChange={e => setData('role', e.target.value)}
                            className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all cursor-pointer">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} disabled={processing}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 transition-colors cursor-pointer">
                            Batal
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {processing ? 'Menyimpan...' : 'Simpan User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditModal({ user, onClose }) {
    const { data, setData, put, processing, errors } = useForm({
        name: user.name || '',
        sales_code: user.sales_code || '',
        mobile: user.mobile || '',
        role: user.role || 'Sales',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('users.update', user.id), {
            onSuccess: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !processing && onClose()} />
            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up z-10">
                <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Edit className="w-4 h-4 text-amber-600" />
                        </div>
                        <h3 className="font-bold text-surface-800">Edit Anggota Tim</h3>
                    </div>
                    <button onClick={onClose} className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-surface-600 block mb-1">Email (Read Only)</label>
                        <input type="email" readOnly value={user.email}
                            className="w-full bg-surface-100 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-500 cursor-not-allowed" />
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
                            <input type="text" value={data.name} onChange={e => setData('name', e.target.value)}
                                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all" />
                        </div>
                        <div className="w-28">
                            <label className="text-xs font-semibold text-surface-600 block mb-1">Kode <span className="text-red-500">*</span></label>
                            <input type="text" required value={data.sales_code}
                                onChange={e => setData('sales_code', e.target.value.toUpperCase())}
                                className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all uppercase" />
                            {errors.sales_code && <p className="text-xs text-red-500 mt-1">{errors.sales_code}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-surface-600 block mb-1">Mobile (WhatsApp)</label>
                        <input type="tel" value={data.mobile} onChange={e => setData('mobile', e.target.value)}
                            className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all"
                            placeholder="081234567890" />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Role)</label>
                        <select value={data.role} onChange={e => setData('role', e.target.value)}
                            className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 focus:border-brand-500 transition-all cursor-pointer">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} disabled={processing}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 transition-colors cursor-pointer">
                            Batal
                        </button>
                        <button type="submit" disabled={processing}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ user, onClose }) {
    const [processing, setProcessing] = useState(false);

    const handleDelete = () => {
        setProcessing(true);
        router.delete(route('users.destroy', user.id), {
            preserveScroll: true,
            onFinish: () => { setProcessing(false); onClose(); },
        });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !processing && onClose()} />
            <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in-up overflow-hidden z-10">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-surface-900 mb-2">Hapus Anggota?</h3>
                    <p className="text-sm text-surface-500 mb-6">
                        Apakah Anda yakin ingin menghapus <strong className="text-surface-700">{user.name || user.email}</strong>?
                        Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} disabled={processing}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 transition-colors cursor-pointer">
                            Batal
                        </button>
                        <button type="button" onClick={handleDelete} disabled={processing}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {processing ? 'Menghapus...' : 'Hapus'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage({ users }) {
    const { auth } = usePage().props;
    const currentUserRole = auth?.user?.spatie_role ?? auth?.user?.role;
    const isAdmin = ['Administrator', 'admin'].includes(currentUserRole);

    const [showAdd, setShowAdd]         = useState(false);
    const [editingUser, setEditingUser]  = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen User" />

            <div className="animate-fade-in-up max-w-5xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-extrabold text-surface-900 tracking-tight flex items-center gap-2">
                            <Shield className="w-5 h-5 text-brand-500" />
                            Manajemen User
                        </h1>
                        <p className="text-sm text-surface-500 mt-1">Kelola daftar tim dan akses masuk mereka.</p>
                    </div>
                    {isAdmin && (
                        <button onClick={() => setShowAdd(true)}
                            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer">
                            <Plus className="w-4 h-4" />
                            Tambah User
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                    {ROLES.map(role => {
                        const count = (users || []).filter(u => u.role === role).length;
                        return (
                            <div key={role} className="bg-white rounded-xl border border-surface-200 px-3 py-2.5 text-center hover:shadow-sm transition-all">
                                <div className="text-xl font-extrabold text-surface-800">{count}</div>
                                <div className="text-xs text-surface-500 font-medium mt-0.5 truncate">{role}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-50 border-b border-surface-200">
                                    <th className="py-3 px-4 text-xs font-bold text-surface-400 uppercase tracking-wider">Nama</th>
                                    <th className="py-3 px-4 text-xs font-bold text-surface-400 uppercase tracking-wider">Email</th>
                                    <th className="py-3 px-4 text-xs font-bold text-surface-400 uppercase tracking-wider">Mobile</th>
                                    <th className="py-3 px-4 text-xs font-bold text-surface-400 uppercase tracking-wider">Kode Sales</th>
                                    <th className="py-3 px-4 text-xs font-bold text-surface-400 uppercase tracking-wider">Role</th>
                                    {isAdmin && <th className="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-20">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {(users || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-surface-500">
                                            <div className="w-16 h-16 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Users className="w-8 h-8 text-surface-300" />
                                            </div>
                                            Belum ada anggota tim.
                                        </td>
                                    </tr>
                                ) : (users || []).map(u => (
                                    <tr key={u.id} className="border-b border-surface-100 hover:bg-surface-50/60 transition-colors group">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                    {getInitials(u.name, u.email)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-surface-800">{u.name || '-'}</div>
                                                    <div className="text-xs text-surface-400">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-surface-600">{u.email}</td>
                                        <td className="py-3 px-4 text-sm text-surface-600">{u.mobile || '-'}</td>
                                        <td className="py-3 px-4 text-sm font-mono font-semibold text-surface-500">{u.sales_code || '-'}</td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${roleColor(u.role)}`}>
                                                {u.role || 'Sales'}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingUser(u)}
                                                        className="text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer" title="Edit">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeletingUser(u)}
                                                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer" title="Hapus">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showAdd    && <AddModal    onClose={() => setShowAdd(false)} />}
            {editingUser  && <EditModal   user={editingUser}  onClose={() => setEditingUser(null)} />}
            {deletingUser && <DeleteModal user={deletingUser} onClose={() => setDeletingUser(null)} />}
        </AuthenticatedLayout>
    );
}
