import React, { useState, useEffect } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ShieldCheck, Loader2, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const FEATURE_LABELS = {
    'dashboard': 'Dashboard',
    'sales_targets_edit': 'Dashboard - Atur Target Sales',
    'quotations_view': 'Quotations - Lihat',
    'quotations_create': 'Quotations - Buat',
    'quotations_edit': 'Quotations - Edit',
    'quotations_delete': 'Quotations - Hapus',
    'sales_orders_view': 'Sales Orders - Lihat',
    'sales_orders_edit': 'Sales Orders - Edit / Kelola Biaya',
    'sales_orders_delete': 'Sales Orders - Hapus',
    'sales_orders_delete_bulk': 'Sales Orders - Hapus Massal',
    'customers_view': 'Customers - Lihat',
    'customers_create': 'Customers - Tambah',
    'customers_edit': 'Customers - Edit',
    'customers_delete': 'Customers - Hapus',
    'products_view': 'Produk & Brand - Lihat',
    'products_create': 'Produk & Brand - Tambah',
    'products_edit': 'Produk & Brand - Edit',
    'products_delete': 'Produk & Brand - Hapus',
    'view_reports': 'Analytics',
    'manager_view': 'Manager View',
    'user_management': 'User Management'
};

export default function RolesPage({ rolePermissions, rolesList, features }) {
    const [localState, setLocalState] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Initialize local state with props from server
        if (rolePermissions) {
            setLocalState(JSON.parse(JSON.stringify(rolePermissions))); // deep copy
        }
    }, [rolePermissions]);

    const handleToggle = (role, featureId) => {
        setLocalState(prev => {
            const newState = { ...prev };
            if (!newState[role]) newState[role] = {};
            newState[role][featureId] = !newState[role][featureId];
            return newState;
        });
    };

    const handleSaveAll = () => {
        setIsSaving(true);
        router.put(route('roles.update'), { rolePermissions: localState }, {
            onSuccess: () => {
                setIsSaving(false);
                // Toast is handled by HandleInertiaRequests global flash message logic
            },
            onError: (errors) => {
                setIsSaving(false);
                toast.error('Gagal menyimpan hak akses.');
                console.error(errors);
            },
            preserveScroll: true
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Roles & Hak Akses" />

            <div className="animate-fade-in-up max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-extrabold text-surface-900 tracking-tight flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-brand-500" />
                            Roles & Hak Akses
                        </h1>
                        <p className="text-sm text-surface-500 mt-1">Atur hak akses menu dan fitur untuk setiap peran (Role).</p>
                    </div>
                    <button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-50 border-b border-surface-200">
                                    <th className="py-4 px-6 text-left text-sm font-bold text-surface-800 w-64">Modul / Fitur</th>
                                    {rolesList.map(role => (
                                        <th key={role} className="py-4 px-4 text-center text-sm font-bold text-surface-800">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                     role === 'Administrator' ? 'bg-purple-100 text-purple-700' :
                                                     role === 'Manager' ? 'bg-emerald-100 text-emerald-700' :
                                                     role === 'Sales' ? 'bg-blue-100 text-blue-700' :
                                                     role === 'Presales' ? 'bg-amber-100 text-amber-700' :
                                                     role === 'Finance' ? 'bg-gray-100 text-gray-700' :
                                                     'bg-surface-100 text-surface-600'
                                                 }`}>
                                                    {role}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {features.map((feature, idx) => (
                                    <tr key={feature} className={`border-b border-surface-100 hover:bg-surface-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-surface-50/30'}`}>
                                        <td className="py-3 px-6 text-sm font-medium text-surface-700">
                                            {FEATURE_LABELS[feature] || feature}
                                        </td>
                                        {rolesList.map(role => {
                                            const hasAccess = localState[role]?.[feature] || false;
                                            // Prevent unchecking User Management for Admin to avoid lockout
                                            const isDisabled = role === 'Administrator' && feature === 'user_management';

                                            return (
                                                <td key={`${role}-${feature}`} className="py-3 px-4 text-center">
                                                    <label className={`inline-flex items-center justify-center cursor-pointer w-6 h-6 rounded ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={hasAccess}
                                                            disabled={isDisabled}
                                                            onChange={() => handleToggle(role, feature)}
                                                        />
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasAccess ? 'bg-brand-500 border-brand-500' : 'bg-surface-100 border-surface-300 hover:border-brand-400'}`}>
                                                            {hasAccess && <Check className="w-3.5 h-3.5 text-white" />}
                                                        </div>
                                                    </label>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-4 flex gap-2 items-start bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 mb-8">
                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
                    <p className="text-sm">
                        <strong>Penting:</strong> Perubahan hak akses akan langsung berlaku. Pastikan hak akses <strong>User Management</strong> selalu diberikan kepada minimal satu peran (Administrator) agar Anda tidak kehilangan akses ke halaman ini.
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}