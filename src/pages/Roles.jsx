import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, Save, Check } from 'lucide-react';
import { useRolePermissions, useUpdateRolePermissions } from '../hooks/useSupabase.js';
import { toast } from 'react-hot-toast';

const FEATURES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'quotations_view', label: 'Quotations - Lihat' },
  { id: 'quotations_create', label: 'Quotations - Buat' },
  { id: 'quotations_edit', label: 'Quotations - Edit' },
  { id: 'quotations_delete', label: 'Quotations - Hapus' },
  { id: 'customers_view', label: 'Customers - Lihat' },
  { id: 'customers_create', label: 'Customers - Tambah' },
  { id: 'customers_edit', label: 'Customers - Edit' },
  { id: 'customers_delete', label: 'Customers - Hapus' },
  { id: 'products_view', label: 'Produk & Brand - Lihat' },
  { id: 'products_create', label: 'Produk & Brand - Tambah' },
  { id: 'products_edit', label: 'Produk & Brand - Edit' },
  { id: 'products_delete', label: 'Produk & Brand - Hapus' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'manager_view', label: 'Manager View' },
  { id: 'user_management', label: 'User Management' },
];

export default function RolesPage() {
  const { data: rolePermissions, isLoading } = useRolePermissions();
  const updatePermissions = useUpdateRolePermissions();
  
  const [localState, setLocalState] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (rolePermissions) {
      const state = {};
      rolePermissions.forEach(item => {
        state[item.role] = item.permissions || {};
      });
      setLocalState(state);
    }
  }, [rolePermissions]);

  const handleToggle = (role, featureId) => {
    setLocalState(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [featureId]: !prev[role][featureId]
      }
    }));
  };

  const rolesList = ['Administrator', 'Manager', 'Sales', 'Presales'];

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const promises = rolesList.map(role => {
        const permissions = localState[role] || {};
        return updatePermissions.mutateAsync({ role, permissions });
      });
      await Promise.all(promises);
      toast.success('Hak akses berhasil disimpan!');
    } catch (error) {
      console.error('Error saving role permissions:', error);
      toast.error(error?.message || 'Gagal menyimpan hak akses.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Roles & Hak Akses</h1>
          <p className="text-sm text-surface-500 mt-1">Atur hak akses menu dan fitur untuk setiap peran (Role).</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving || isLoading}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-surface-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <span>Memuat pengaturan hak akses...</span>
          </div>
        ) : (
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
                          role === 'Manager' ? 'bg-brand-50 text-brand-700' :
                          role === 'Presales' ? 'bg-amber-100 text-amber-700' :
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
                {FEATURES.map((feature, idx) => (
                  <tr key={feature.id} className={`border-b border-surface-100 hover:bg-surface-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-surface-50/30'}`}>
                    <td className="py-3 px-6 text-sm font-medium text-surface-700">{feature.label}</td>
                    {rolesList.map(role => {
                      const hasAccess = localState[role]?.[feature.id] || false;
                      // Prevent unchecking User Management for Admin to avoid lockout
                      const isDisabled = role === 'Administrator' && feature.id === 'user_management';
                      
                      return (
                        <td key={`${role}-${feature.id}`} className="py-3 px-4 text-center">
                          <label className={`inline-flex items-center justify-center cursor-pointer w-6 h-6 rounded ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={hasAccess}
                              disabled={isDisabled}
                              onChange={() => handleToggle(role, feature.id)}
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
        )}
      </div>
      
      <div className="mt-4 flex gap-2 items-start bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong>Penting:</strong> Perubahan hak akses akan langsung berlaku saat pengguna memuat ulang halaman. Pastikan hak akses <strong>User Management</strong> selalu diberikan kepada minimal satu peran (Administrator) agar Anda tidak kehilangan akses ke halaman ini.
        </p>
      </div>
    </div>
  );
}
