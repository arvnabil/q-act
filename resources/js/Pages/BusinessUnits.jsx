import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { 
  Plus, Edit, Trash2, Users, Loader2, X, Building2, UserPlus, UserMinus, ChevronDown, ChevronUp, Shield, CheckCircle2 
} from 'lucide-react';

const ROLE_BADGE = {
  lead:   'bg-brand-50 text-brand-700 border border-brand-200',
  member: 'bg-surface-100 text-surface-600 border border-surface-200',
};

const BU_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308',
  '#22c55e','#14b8a6','#06b6d4','#3b82f6','#64748b','#1e293b',
];

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {BU_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full border-2 transition-all ${value === c ? 'border-surface-900 scale-110' : 'border-transparent hover:scale-105'}`}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  );
}

export default function BusinessUnits({ 
  businessUnits = [], 
  allUsers = [], 
  usersWithoutBU = [] 
}) {
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', color: '#6366f1', description: '' });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [editingBU, setEditingBU] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [deletingBU, setDeletingBU] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const [addMemberBuId, setAddMemberBuId] = useState(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState('member');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.code.trim()) {
      alert('Nama dan Kode BU wajib diisi.');
      return;
    }
    setIsSubmittingCreate(true);
    router.post(route('business-units.store'), createForm, {
      preserveScroll: true,
      onFinish: () => {
        setIsSubmittingCreate(false);
        setShowCreate(false);
        setCreateForm({ name: '', code: '', color: '#6366f1', description: '' });
      }
    });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!editingBU.name.trim() || !editingBU.code.trim()) {
      alert('Nama dan Kode BU wajib diisi.');
      return;
    }
    setIsSubmittingEdit(true);
    router.put(route('business-units.update', editingBU.id), editingBU, {
      preserveScroll: true,
      onFinish: () => {
        setIsSubmittingEdit(false);
        setEditingBU(null);
      }
    });
  };

  const handleDelete = () => {
    if (!deletingBU) return;
    setIsSubmittingDelete(true);
    router.delete(route('business-units.destroy', deletingBU.id), {
      preserveScroll: true,
      onFinish: () => {
        setIsSubmittingDelete(false);
        setDeletingBU(null);
      }
    });
  };

  const handleAddMember = (buId) => {
    if (!addMemberUserId) {
      alert('Pilih user terlebih dahulu.');
      return;
    }
    setIsSubmittingMember(true);
    router.post(route('business-units.members.store', buId), {
      user_id: addMemberUserId,
      role_in_bu: addMemberRole,
    }, {
      preserveScroll: true,
      onFinish: () => {
        setIsSubmittingMember(false);
        setAddMemberBuId(null);
        setAddMemberUserId('');
        setAddMemberRole('member');
      }
    });
  };

  const handleRemoveMember = (buId, userId, userName) => {
    if (!window.confirm(`Hapus ${userName} dari BU ini?`)) return;
    router.delete(route('business-units.members.destroy', [buId, userId]), {
      preserveScroll: true,
    });
  };

  const getAddableUsers = (bu) => {
    const buMemberIds = new Set((bu.members || []).map(m => m.user_id));
    return allUsers.filter(u =>
      !buMemberIds.has(u.id) &&
      usersWithoutBU.some(wu => wu.id === u.id)
    );
  };

  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-xl text-surface-800 leading-tight">Business Units</h2>}
    >
      <Head title="Business Units" />

      <div className="animate-fade-in-up space-y-6 max-w-5xl mx-auto py-4 px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-surface-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-brand-500" />
              Business Units
            </h1>
            <p className="text-sm text-surface-500 mt-0.5">
              Kelola grup BU untuk berbagi data quotation &amp; customer antar anggota tim.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Buat BU
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-1">Total BU</div>
            <div className="text-2xl font-extrabold text-surface-900">{businessUnits.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-1">Total Anggota</div>
            <div className="text-2xl font-extrabold text-brand-600">
              {businessUnits.reduce((s, b) => s + (b.members?.length || 0), 0)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <div className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-1">Belum di BU</div>
            <div className="text-2xl font-extrabold text-amber-600">{usersWithoutBU.length}</div>
          </div>
        </div>

        {/* BU List */}
        {businessUnits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-16 text-center shadow-sm">
            <Building2 className="w-12 h-12 text-surface-300 mx-auto mb-3" />
            <p className="text-surface-500 font-medium">Belum ada Business Unit.</p>
            <p className="text-surface-400 text-sm mt-1">Klik &ldquo;Buat BU&rdquo; untuk memulai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {businessUnits.map(bu => {
              const isOpen = expanded === bu.id;
              const members = bu.members || [];
              const addable = getAddableUsers(bu);

              return (
                <div key={bu.id} className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden transition-all">
                  {/* BU Row */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow"
                        style={{ backgroundColor: bu.color || '#6366f1' }}
                      >
                        {bu.code?.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-surface-900 text-base leading-tight truncate">{bu.name}</div>
                        <div className="text-xs text-surface-500 mt-0.5 flex items-center gap-2">
                          <span className="font-mono bg-surface-100 px-1.5 py-0.5 rounded text-surface-700">{bu.code}</span>
                          <span>{members.length} anggota</span>
                          {!bu.is_active && (
                            <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Nonaktif</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member avatars */}
                    <div className="flex -space-x-2">
                      {members.slice(0, 4).map(m => (
                        <div
                          key={m.id}
                          className="w-7 h-7 rounded-full bg-brand-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-brand-700"
                          title={m.user?.name || m.user_id}
                        >
                          {(m.user?.name || '?')[0].toUpperCase()}
                        </div>
                      ))}
                      {members.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-surface-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-surface-600">
                          +{members.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingBU({ ...bu })}
                        className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 hover:text-brand-600 transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBU(bu)}
                        className="p-2 rounded-lg hover:bg-red-50 text-surface-500 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : bu.id)}
                        className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors cursor-pointer"
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded member section */}
                  {isOpen && (
                    <div className="border-t border-surface-100 bg-surface-50/50 p-4 space-y-3">
                      {bu.description && (
                        <p className="text-sm text-surface-500 italic">{bu.description}</p>
                      )}

                      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                        <div className="px-4 py-2.5 bg-surface-50 border-b border-surface-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Anggota BU
                          </span>
                          <button
                            type="button"
                            onClick={() => { setAddMemberBuId(bu.id); setAddMemberUserId(''); setAddMemberRole('member'); }}
                            className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Tambah Anggota
                          </button>
                        </div>

                        {/* Add member inline form */}
                        {addMemberBuId === bu.id && (
                          <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-end gap-3 flex-wrap">
                            <div className="flex-1 min-w-[180px]">
                              <label className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block mb-1">User</label>
                              <select
                                value={addMemberUserId}
                                onChange={e => setAddMemberUserId(e.target.value)}
                                className="w-full text-sm border border-brand-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                              >
                                <option value="">— Pilih user —</option>
                                {addable.map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.role}){u.sales_code ? ` · ${u.sales_code}` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="w-36">
                              <label className="text-[10px] font-bold text-brand-700 uppercase tracking-wider block mb-1">Role di BU</label>
                              <select
                                value={addMemberRole}
                                onChange={e => setAddMemberRole(e.target.value)}
                                className="w-full text-sm border border-brand-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                              >
                                <option value="member">Member</option>
                                <option value="lead">Lead</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddMember(bu.id)}
                                disabled={isSubmittingMember}
                                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
                              >
                                {isSubmittingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tambah'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddMemberBuId(null)}
                                className="px-3 py-2 bg-white border border-surface-200 text-surface-600 text-sm rounded-lg hover:bg-surface-50 transition-colors cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}

                        {members.length === 0 ? (
                          <div className="py-8 text-center text-surface-400 text-sm">
                            Belum ada anggota. Tambahkan user ke BU ini.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="text-[10px] font-bold text-surface-400 uppercase tracking-wider bg-surface-50 border-b border-surface-100">
                                  <th className="py-2.5 px-4 text-left">Nama</th>
                                  <th className="py-2.5 px-4 text-left">Role Sistem</th>
                                  <th className="py-2.5 px-4 text-left">Kode Personal</th>
                                  <th className="py-2.5 px-4 text-left">Role BU</th>
                                  <th className="py-2.5 px-4 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-surface-100">
                                {members.map(m => (
                                  <tr key={m.id} className="hover:bg-surface-50 transition-colors">
                                    <td className="py-2.5 px-4">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-[11px] font-bold text-brand-700">
                                          {(m.user?.name || '?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="text-sm font-semibold text-surface-900">{m.user?.name || '—'}</div>
                                          <div className="text-[10px] text-surface-400">{m.user?.email || ''}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <span className="text-xs text-surface-600">{m.user?.role || '—'}</span>
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <span className="font-mono text-xs bg-surface-100 px-1.5 py-0.5 rounded text-surface-700">
                                        {m.user?.sales_code || '—'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ROLE_BADGE[m.role_in_bu] || ROLE_BADGE.member}`}>
                                        {m.role_in_bu === 'lead' ? '⭐ Lead' : 'Member'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMember(bu.id, m.user_id, m.user?.name || m.user_id)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors cursor-pointer"
                                        title="Keluarkan dari BU"
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Users without BU warning */}
        {usersWithoutBU.length > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">
                User Belum Masuk BU ({usersWithoutBU.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {usersWithoutBU.map(u => (
                <span key={u.id} className="text-xs bg-white border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full font-medium">
                  {u.name} · {u.role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ===== MODAL: Create BU ===== */}
        {showCreate && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto animate-scale-in">
              <div className="flex items-center justify-between p-5 border-b border-surface-100">
                <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-500" /> Buat Business Unit Baru
                </h2>
                <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-surface-500" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Nama BU *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="contoh: Jakarta Enterprise"
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">
                    Kode BU * <span className="text-surface-400 font-normal normal-case">(prefix nomor quotation)</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.code}
                    onChange={e => setCreateForm(f => ({ ...f, code: e.target.value.toUpperCase().slice(0, 8) }))}
                    placeholder="contoh: JKT"
                    maxLength={8}
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-300"
                    required
                  />
                  <p className="text-[10px] text-surface-400 mt-1">
                    Preview nomor quotation:{' '}
                    <span className="font-mono font-semibold">{createForm.code || 'XXX'}.0826.001</span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Warna BU</label>
                  <ColorPicker value={createForm.color} onChange={c => setCreateForm(f => ({ ...f, color: c }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Deskripsi (opsional)</label>
                  <textarea
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Deskripsi singkat tentang BU ini..."
                    rows={2}
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingCreate}
                    className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
                    {isSubmittingCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Buat BU
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ===== MODAL: Edit BU ===== */}
        {editingBU && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto animate-scale-in">
              <div className="flex items-center justify-between p-5 border-b border-surface-100">
                <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-brand-500" /> Edit BU
                </h2>
                <button type="button" onClick={() => setEditingBU(null)} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-surface-500" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Nama BU *</label>
                  <input
                    type="text"
                    value={editingBU.name}
                    onChange={e => setEditingBU(b => ({ ...b, name: e.target.value }))}
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Kode BU *</label>
                  <input
                    type="text"
                    value={editingBU.code}
                    onChange={e => setEditingBU(b => ({ ...b, code: e.target.value.toUpperCase().slice(0, 8) }))}
                    maxLength={8}
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Warna</label>
                  <ColorPicker value={editingBU.color} onChange={c => setEditingBU(b => ({ ...b, color: c }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-600 uppercase tracking-wider block mb-1.5">Deskripsi</label>
                  <textarea
                    value={editingBU.description || ''}
                    onChange={e => setEditingBU(b => ({ ...b, description: e.target.value }))}
                    rows={2}
                    className="w-full border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="is_active_edit"
                    type="checkbox"
                    checked={editingBU.is_active ?? true}
                    onChange={e => setEditingBU(b => ({ ...b, is_active: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400"
                  />
                  <label htmlFor="is_active_edit" className="text-sm font-medium text-surface-700">BU Aktif</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingBU(null)}
                    className="flex-1 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingEdit}
                    className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
                    {isSubmittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ===== MODAL: Delete Confirm ===== */}
        {deletingBU && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center my-auto animate-scale-in border border-surface-200">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-surface-900 mb-1">Hapus BU &ldquo;{deletingBU.name}&rdquo;?</h3>
              <p className="text-sm text-surface-500 mb-5">
                Semua anggota akan dikeluarkan dari BU ini. Data quotation tidak akan terhapus.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeletingBU(null)}
                  className="flex-1 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold rounded-xl transition-colors cursor-pointer">
                  Batal
                </button>
                <button type="button" onClick={handleDelete} disabled={isSubmittingDelete}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
                  {isSubmittingDelete && <Loader2 className="w-4 h-4 animate-spin" />}
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    </AuthenticatedLayout>
  );
}
