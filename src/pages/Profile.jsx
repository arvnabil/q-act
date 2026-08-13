import React, { useState, useRef } from 'react';
import { Camera, Pen, Save, Loader2, Activity, User, Clock, FileText, ShoppingBag, Users } from 'lucide-react';
import useAuthStore from '../store/authStore.js';
import { useUpdateProfile, useActivityLogs } from '../hooks/useSupabase.js';
import { toast } from 'react-hot-toast';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

function formatDate(str) {
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'd MMM yyyy, HH:mm', { locale: idLocale }) : str;
  } catch { return str; }
}

function ActivityIcon({ entityType, action }) {
  if (entityType === 'QUOTATION') return <FileText className="w-3.5 h-3.5 text-brand-500" />;
  if (entityType === 'CUSTOMER') return <Users className="w-3.5 h-3.5 text-emerald-500" />;
  if (entityType === 'PRODUCT') return <ShoppingBag className="w-3.5 h-3.5 text-purple-500" />;
  return <Activity className="w-3.5 h-3.5 text-surface-400" />;
}

const TABS = [
  { key: 'profile', label: 'Profil', icon: User },
  { key: 'activity', label: 'Log Aktivitas', icon: Activity },
];

export default function Profile() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || user?.phone || '',
    role: (user?.role && user.role !== 'authenticated') ? user.role : 'Sales Manager',
    sales_code: user?.sales_code || 'S1001',
  });
  const updateProfile = useUpdateProfile();
  const { data: activityLogs = [], isLoading: loadingActivity } = useActivityLogs(user?.id);

  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [signaturePreview, setSignaturePreview] = useState(user?.signature_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const avatarRef = useRef(null);
  const signatureRef = useRef(null);

  // Sync state when user prop loads or updates from DB
  React.useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || user.phone || '',
        role: (user.role && user.role !== 'authenticated') ? user.role : 'Sales Manager',
        sales_code: user.sales_code || 'S1001',
      });
      if (user.avatar_url) setAvatarPreview(user.avatar_url);
      if (user.signature_url) setSignaturePreview(user.signature_url);
    }
  }, [user]);

  const initials = form.name
    ? form.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file terlalu besar (Maks 2MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (type === 'avatar') setAvatarPreview(ev.target.result);
      else setSignaturePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error('Nama dan Email wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const cleanSalesCode = (form.sales_code || user?.sales_code || `S${Math.floor(Math.random() * 9000) + 1000}`).trim().toUpperCase();

      const payload = {
        id: user.id,
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        role: form.role,
        sales_code: cleanSalesCode,
        avatar_url: avatarPreview,
        signature_url: signaturePreview,
      };

      const updatedUser = await updateProfile.mutateAsync(payload);
      
      // Update global auth store
      useAuthStore.setState({ user: { ...user, ...updatedUser } });
      
      setSaved(true);
      toast.success('Profil berhasil diperbarui!');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error('Gagal menyimpan profil: ' + (error.message || JSON.stringify(error)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up max-w-3xl mx-auto w-full space-y-5">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-surface-200">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-700 bg-brand-50/30'
                    : 'border-transparent text-surface-500 hover:text-surface-800 hover:bg-surface-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="overflow-hidden">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-r from-brand-500 to-brand-600"></div>

            <div className="px-8 pb-8">
              {/* Avatar */}
              <div className="relative flex justify-between items-end -mt-12 mb-6">
                <div
                  className="relative w-24 h-24 rounded-2xl bg-white p-1.5 shadow-md group cursor-pointer"
                  title="Ubah Foto Profil"
                  onClick={() => avatarRef.current?.click()}
                >
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/png, image/jpeg"
                    className="hidden"
                    onChange={(e) => handleImageChange(e, 'avatar')}
                  />
                  <div className="w-full h-full rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 text-3xl font-bold overflow-hidden group-hover:opacity-80 transition-opacity">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-brand-600 transition-colors">
                    <Camera className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold text-surface-900 mb-6">Pengaturan Profil</h2>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Jabatan (Role)</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all cursor-pointer"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Manager">Manager</option>
                    <option value="Sales">Sales</option>
                    <option value="Presales">Presales</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Nomor Handphone</label>
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={e => setForm({ ...form, mobile: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-600 block mb-1">Kode Sales</label>
                  <input
                    type="text"
                    value={form.sales_code}
                    onChange={e => setForm({ ...form, sales_code: e.target.value })}
                    className="w-full bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 font-mono outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all uppercase"
                    placeholder="Contoh: S1001"
                  />
                </div>
              </div>

              {/* Signature Section */}
              <div className="border-t border-surface-100 pt-6">
                <h3 className="text-sm font-bold text-surface-800 mb-4">Tanda Tangan Digital (Signature)</h3>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div
                    className="w-48 h-32 border-2 border-dashed border-surface-200 rounded-lg bg-surface-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all"
                    onClick={() => signatureRef.current?.click()}
                  >
                    <input
                      ref={signatureRef}
                      type="file"
                      accept="image/png, image/jpeg"
                      className="hidden"
                      onChange={(e) => handleImageChange(e, 'signature')}
                    />
                    {signaturePreview ? (
                      <img src={signaturePreview} alt="Signature" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="text-center text-surface-400 p-4">
                        <Pen className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <span className="text-xs">Belum ada</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-surface-500 mb-3 leading-relaxed">
                      Unggah gambar tanda tangan Anda (PNG transparan direkomendasikan). Gambar ini akan otomatis disematkan pada setiap dokumen Quotation yang Anda cetak.
                    </p>
                    <button
                      onClick={() => signatureRef.current?.click()}
                      className="text-xs font-semibold text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Pilih File Signature
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="border-t border-surface-100 pt-6 mt-6 flex items-center justify-end gap-3">
                {saved && (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg animate-fade-in-up">
                    ✓ Profil berhasil disimpan
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-all shadow-sm disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-surface-900">Log Aktivitas</h2>
                <p className="text-xs text-surface-500 mt-0.5">Rekam jejak seluruh aktivitas akun Anda</p>
              </div>
              {activityLogs.length > 0 && (
                <span className="text-xs bg-surface-100 text-surface-600 font-semibold px-2.5 py-1 rounded-full">
                  {activityLogs.length} aktivitas
                </span>
              )}
            </div>

            {loadingActivity ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                <span className="text-xs text-surface-400">Memuat log aktivitas...</span>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-surface-400">
                <Activity className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">Belum ada aktivitas tercatat</p>
                <p className="text-xs">Aktivitas seperti membuat quotation akan muncul di sini</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-surface-100"></div>

                <div className="space-y-1">
                  {activityLogs.map((log, idx) => (
                    <div key={log.id} className="flex gap-4 group">
                      {/* Dot */}
                      <div className="relative shrink-0 flex flex-col items-center">
                        <div className="w-9 h-9 rounded-full bg-white border-2 border-surface-100 group-hover:border-brand-200 flex items-center justify-center z-10 transition-colors shadow-sm">
                          <ActivityIcon entityType={log.entity_type} action={log.action} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4 min-w-0">
                        <div className="bg-white rounded-xl border border-surface-100 group-hover:border-surface-200 px-4 py-3 transition-colors shadow-sm">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-surface-900 leading-snug">
                              {log.description || log.action}
                            </p>
                            {log.entity_id && (
                              <span className="text-[10px] font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded shrink-0">
                                {log.entity_id}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 text-[11px] text-surface-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(log.created_at)}</span>
                            {log.entity_type && (
                              <>
                                <span className="mx-1">·</span>
                                <span className="text-surface-500 font-medium">{log.entity_type}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
