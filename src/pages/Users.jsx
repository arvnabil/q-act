import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Edit, Trash2, Users, Loader2, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useSalesUsers } from '../hooks/useSupabase.js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase.js';
import { toast } from 'react-hot-toast';

export default function UsersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', email: '', password: '', sales_code: '', role: 'Sales', mobile: ''
  });

  const [editingMember, setEditingMember]           = useState(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [isUpdating, setIsUpdating]                 = useState(false);
  const [isDeleting, setIsDeleting]                 = useState(false);

  const { data: teamMembers, isLoading: isTeamLoading } = useSalesUsers();
  const queryClient = useQueryClient();

  const handleOpenEdit = (member) => {
    setEditingMember({
      id: member.id,
      name: member.name || '',
      email: member.email || '',
      sales_code: member.sales_code || '',
      role: member.role || 'Sales',
      mobile: member.mobile || '',
    });
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    const cleanSalesCode = editingMember.sales_code.trim().toUpperCase();
    if (!cleanSalesCode) {
      toast.error('Kode sales wajib diisi.');
      return;
    }
    setIsUpdating(true);
    try {
      const { data: updatedRows, error } = await supabase.from('users').update({
        name: editingMember.name.trim(),
        role: editingMember.role,
        sales_code: cleanSalesCode,
        mobile: editingMember.mobile.trim() || null,
      }).eq('id', editingMember.id).select();

      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Gagal memperbarui: Kebijakan RLS Supabase memblokir edit profil user lain. Pastikan RLS policy UPDATE diizinkan.');
      }

      toast.success(`Data ${editingMember.name || editingMember.email} berhasil diperbarui!`);
      queryClient.invalidateQueries({ queryKey: ['sales_users'] });
      setEditingMember(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal memperbarui anggota.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMember) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', deleteConfirmMember.id);
      if (error) {
        if (error.code === '23503') {
          toast.error(`Anggota tidak dapat dihapus karena memiliki data quotation yang terikat.`, { duration: 5000 });
        } else {
          throw error;
        }
      } else {
        toast.success(`Anggota ${deleteConfirmMember.name || deleteConfirmMember.email} berhasil dihapus.`);
        queryClient.invalidateQueries({ queryKey: ['sales_users'] });
      }
      setDeleteConfirmMember(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menghapus anggota.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    const cleanEmail = addForm.email.trim().toLowerCase();
    const cleanSalesCode = addForm.sales_code.trim().toUpperCase();

    if (!cleanEmail || !addForm.password || !cleanSalesCode) {
      toast.error('Email, password, dan kode sales wajib diisi.');
      return;
    }
    setIsSaving(true);
    try {
      let userId = null;

      // 1. Try Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: addForm.password,
      });

      if (authError) {
        console.warn('Auth signup error:', authError.message);
        if (authError.message?.toLowerCase().includes('already registered')) {
          toast.error(`Email ${cleanEmail} sudah terdaftar di Supabase Auth. Gunakan email lain.`);
        } else {
          toast.error(`Gagal registrasi user: ${authError.message}`);
        }
        setIsSaving(false);
        return;
      } else {
        userId = authData.user?.id;
      }

      if (!userId) throw new Error('Gagal mendapatkan ID pengguna.');

      // 2. Insert profile to public.users
      const { error: profileError } = await supabase.from('users').upsert([{
        id:         userId,
        email:      cleanEmail,
        name:       addForm.name.trim() || cleanEmail.split('@')[0],
        role:       addForm.role,
        sales_code: cleanSalesCode,
        mobile:     addForm.mobile.trim() || null,
      }], { onConflict: 'id' });

      if (profileError) throw profileError;

      toast.success(`Anggota ${addForm.name || cleanEmail} berhasil ditambahkan!`);
      queryClient.invalidateQueries({ queryKey: ['sales_users'] });
      setShowAddModal(false);
      setAddForm({ name: '', email: '', password: '', sales_code: '', role: 'Sales', mobile: '' });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Gagal menambah anggota.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Manajemen User</h1>
          <p className="text-sm text-surface-500 mt-1">Kelola daftar tim dan akses masuk mereka.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah User</span>
        </button>
      </div>
      
      {/* Team Member List */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Nama</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Mobile</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Kode Sales</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Role</th>
                <th className="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(teamMembers || []).map(s => {
                const initials = (s.name || s.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                const roleColor = (s.role === 'admin' || s.role === 'Administrator')
                  ? 'bg-purple-100 text-purple-700'
                  : (s.role === 'Sales Manager' || s.role === 'Manager')
                  ? 'bg-brand-50 text-brand-700'
                  : s.role === 'Presales'
                  ? 'bg-amber-100 text-amber-700'
                  : s.role === 'Finance'
                  ? 'bg-cyan-100 text-cyan-700'
                  : 'bg-surface-100 text-surface-600';
                return (
                  <tr key={s.id} className="border-b border-surface-100 hover:bg-surface-50/60 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-surface-800">{s.name || '-'}</div>
                          <div className="text-xs text-surface-400">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-surface-600">{s.email}</td>
                    <td className="py-3 px-4 text-sm text-surface-600">{s.mobile || '-'}</td>
                    <td className="py-3 px-4 text-sm font-mono text-surface-500">{s.sales_code || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${roleColor}`}>
                        {s.role === 'admin' ? 'Administrator' : s.role || 'Sales'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Edit Anggota"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmMember(s)}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Anggota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {isTeamLoading && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-surface-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    Memuat data tim...
                  </td>
                </tr>
              )}
              {!isTeamLoading && (!teamMembers || teamMembers.length === 0) && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-surface-500">
                    <div className="w-16 h-16 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-surface-300" />
                    </div>
                    Belum ada anggota tim.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Modal Add Member */}
      {showAddModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSaving && setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up z-10">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="font-bold text-surface-800">Tambah Anggota Tim</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-5">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                    placeholder="sales@activ.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Password Baru *</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={addForm.password}
                      onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                      className="w-full bg-surface-50 border border-surface-200 rounded-lg pl-3 pr-10 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                      placeholder="Minimal 6 karakter"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                      placeholder="Opsional"
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="text-xs font-semibold text-surface-600 block mb-1">Kode *</label>
                    <input
                      type="text"
                      required
                      value={addForm.sales_code}
                      onChange={e => setAddForm({ ...addForm, sales_code: e.target.value.toUpperCase() })}
                      className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all uppercase"
                      placeholder="Mis: SR"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Mobile (WhatsApp)</label>
                  <input
                    type="tel"
                    value={addForm.mobile}
                    onChange={e => setAddForm({ ...addForm, mobile: e.target.value })}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Role)</label>
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all cursor-pointer"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Manager">Manager</option>
                    <option value="Sales">Sales</option>
                    <option value="Presales">Presales</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'Menyimpan...' : 'Simpan User'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Edit Member */}
      {editingMember && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isUpdating && setEditingMember(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up z-10">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="font-bold text-surface-800">Edit Anggota Tim</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-surface-400 hover:text-surface-600 p-1 rounded-lg hover:bg-surface-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateMember} className="p-5">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Email (Read Only)</label>
                  <input
                    type="email"
                    readOnly
                    value={editingMember.email}
                    className="w-full bg-surface-100 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-500 outline-none cursor-not-allowed"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editingMember.name}
                      onChange={e => setEditingMember({ ...editingMember, name: e.target.value })}
                      className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="text-xs font-semibold text-surface-600 block mb-1">Kode *</label>
                    <input
                      type="text"
                      required
                      value={editingMember.sales_code}
                      onChange={e => setEditingMember({ ...editingMember, sales_code: e.target.value.toUpperCase() })}
                      className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Mobile (WhatsApp)</label>
                  <input
                    type="tel"
                    value={editingMember.mobile}
                    onChange={e => setEditingMember({ ...editingMember, mobile: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Role)</label>
                  <select
                    value={editingMember.role}
                    onChange={e => setEditingMember({ ...editingMember, role: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all cursor-pointer"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Manager">Manager</option>
                    <option value="Sales">Sales</option>
                    <option value="Presales">Presales</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    disabled={isUpdating}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Member Confirm Modal */}
      {deleteConfirmMember && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteConfirmMember(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in-up overflow-hidden z-10">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">Hapus Anggota?</h3>
              <p className="text-sm text-surface-500 mb-6">
                Apakah Anda yakin ingin menghapus <strong>{deleteConfirmMember.name || deleteConfirmMember.email}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmMember(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-surface-600 bg-surface-100 hover:bg-surface-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isDeleting ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
