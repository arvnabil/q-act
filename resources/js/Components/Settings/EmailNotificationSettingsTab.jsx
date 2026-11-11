import React from 'react';
import { Mail, Shield, Check, FileUp, KeyRound, DollarSign, Users, Info } from 'lucide-react';

export default function EmailNotificationSettingsTab({
  emailForm,
  setEmailForm,
  availableRoles = [],
  onSubmit,
  isSaving = false,
}) {
  const events = [
    {
      key: 'po_uploaded',
      title: 'Upload Dokumen Purchase Order (PO)',
      description: 'Dikirim saat PO pelanggan baru dimasukkan atau diunggah pada penawaran (quotation) yang disetujui.',
      icon: FileUp,
      color: 'sky',
      hasSalesCc: true,
      hasNotifyUser: false,
      defaultToHint: 'Pilih role atau ketik email tujuan langsung (misal: finance@activ.co.id)',
    },
    {
      key: 'password_changed',
      title: 'Ubah / Reset Kata Sandi Akun',
      description: 'Pemberitahuan keamanan saat seorang pengguna berhasil mengubah kata sandi akunnya atau melakukan reset password.',
      icon: KeyRound,
      color: 'amber',
      hasSalesCc: false,
      hasNotifyUser: true,
      userLabel: 'Kirim otomatis ke email pengguna yang bersangkutan',
      defaultToHint: 'Tambahan email keamanan / audit (opsional, misal: security@activ.co.id)',
    },
    {
      key: 'lead_paid',
      title: 'Lead Selesai Terbayar (Paid Deal)',
      description: 'Dikirim saat status prospek/lead disahkan menjadi "Selesai Terbayar".',
      icon: DollarSign,
      color: 'emerald',
      hasSalesCc: true,
      hasNotifyUser: false,
      defaultToHint: 'Pilih role atau ketik email finance / manajemen',
    },
  ];

  const handleToggleEvent = (eventKey, current) => {
    setEmailForm(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] || {}),
        enabled: !current,
      },
    }));
  };

  const handleToggleNotifyUser = (eventKey, current) => {
    setEmailForm(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] || {}),
        notify_user: !current,
      },
    }));
  };

  const handleToggleCcSales = (eventKey, current) => {
    setEmailForm(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] || {}),
        cc_sales: !current,
      },
    }));
  };

  const handleToggleRole = (eventKey, field, roleName) => {
    setEmailForm(prev => {
      const evt = prev[eventKey] || {};
      const list = evt[field] || [];
      const updated = list.includes(roleName)
        ? list.filter(r => r !== roleName)
        : [...list, roleName];
      return {
        ...prev,
        [eventKey]: {
          ...evt,
          [field]: updated,
        },
      };
    });
  };

  const handleCustomEmailsChange = (eventKey, field, rawValue) => {
    const arr = rawValue.split(',').map(s => s.trim());
    setEmailForm(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] || {}),
        [field]: arr,
      },
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Pusat Pengaturan Notifikasi Email</h2>
            <p className="text-xs text-gray-500">Atur penerima (To, CC, BCC) untuk setiap kejadian otomatis dalam sistem.</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-800">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Email dikirim menggunakan konfigurasi mailer aktif (Microsoft Graph API / SMTP). Anda dapat memilih penerima berdasarkan <strong>Role Pengguna</strong> (otomatis mengambil semua staf dengan role tersebut) atau menambahkan <strong>alamat email khusus</strong> (dipisahkan tanda koma).
          </p>
        </div>

        <div className="space-y-6">
          {events.map((evt) => {
            const config = emailForm[evt.key] || {
              enabled: false,
              notify_user: true,
              to_roles: [],
              custom_to: [],
              cc_sales: false,
              cc_roles: [],
              custom_cc: [],
              bcc_roles: [],
              custom_bcc: [],
            };

            const Icon = evt.icon;

            return (
              <div
                key={evt.key}
                className={`rounded-2xl border transition-all ${
                  config.enabled ? 'border-surface-300 bg-white shadow-sm' : 'border-surface-200 bg-surface-50/60 opacity-80'
                }`}
              >
                {/* Event Header Card */}
                <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-surface-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${config.enabled ? 'bg-brand-50 text-brand-600' : 'bg-surface-200 text-surface-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-surface-900">{evt.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-surface-100 text-surface-500'}`}>
                          {config.enabled ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 mt-0.5 max-w-2xl">{evt.description}</p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!config.enabled}
                      onChange={() => handleToggleEvent(evt.key, config.enabled)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                  </label>
                </div>

                {/* Event Body Settings (Shown when enabled) */}
                {config.enabled && (
                  <div className="p-5 space-y-5 bg-surface-50/30 rounded-b-2xl">
                    {/* Optional Auto-notify Target User Checkbox */}
                    {evt.hasNotifyUser && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-amber-900 font-medium">
                        <input
                          type="checkbox"
                          id={`notify_user_${evt.key}`}
                          checked={config.notify_user !== false}
                          onChange={() => handleToggleNotifyUser(evt.key, config.notify_user !== false)}
                          className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                        />
                        <label htmlFor={`notify_user_${evt.key}`} className="cursor-pointer select-none">
                          {evt.userLabel || 'Kirim otomatis ke pengguna yang bersangkutan (Wajib/Disarankan)'}
                        </label>
                      </div>
                    )}

                    {/* TO (Penerima Utama) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-surface-800 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-brand-600" />
                          Kirim Kepada (TO) — Pilih Role:
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {availableRoles.map((role) => {
                          const isSelected = (config.to_roles || []).includes(role);
                          return (
                            <button
                              type="button"
                              key={role}
                              onClick={() => handleToggleRole(evt.key, 'to_roles', role)}
                              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-xs'
                                  : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                              <span>{role}</span>
                            </button>
                          );
                        })}
                      </div>
                      <label className="text-[11px] font-semibold text-surface-500 block mb-1">
                        Atau Tambahkan Email Khusus (TO):
                      </label>
                      <input
                        type="text"
                        value={(config.custom_to || []).join(', ')}
                        onChange={(e) => handleCustomEmailsChange(evt.key, 'custom_to', e.target.value)}
                        placeholder="e.g. finance@activ.co.id, direktur@activ.co.id"
                        className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100"
                      />
                      <span className="text-[10px] text-surface-400 mt-0.5 block">Pisahkan dengan koma jika lebih dari satu.</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-surface-200/60">
                      {/* CC (Tembusan) */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-surface-800 block">
                          Tembusan (CC):
                        </label>

                        {evt.hasSalesCc && (
                          <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-surface-200 text-xs text-surface-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={!!config.cc_sales}
                              onChange={() => handleToggleCcSales(evt.key, config.cc_sales)}
                              className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                            />
                            <span>CC Otomatis ke Sales Penanggung Jawab</span>
                          </label>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {availableRoles.map((role) => {
                            const isSelected = (config.cc_roles || []).includes(role);
                            return (
                              <button
                                type="button"
                                key={role}
                                onClick={() => handleToggleRole(evt.key, 'cc_roles', role)}
                                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-sky-50 border-sky-300 text-sky-700 font-bold'
                                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                                }`}
                              >
                                {isSelected ? `✓ ${role}` : role}
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          value={(config.custom_cc || []).join(', ')}
                          onChange={(e) => handleCustomEmailsChange(evt.key, 'custom_cc', e.target.value)}
                          placeholder="Custom email CC (pisahkan koma)"
                          className="w-full bg-white border border-surface-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100"
                        />
                      </div>

                      {/* BCC (Tembusan Rahasia) */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-surface-800 block">
                          Tembusan Rahasia (BCC):
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {availableRoles.map((role) => {
                            const isSelected = (config.bcc_roles || []).includes(role);
                            return (
                              <button
                                type="button"
                                key={role}
                                onClick={() => handleToggleRole(evt.key, 'bcc_roles', role)}
                                className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-50 border-purple-300 text-purple-700 font-bold'
                                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                                }`}
                              >
                                {isSelected ? `✓ ${role}` : role}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          value={(config.custom_bcc || []).join(', ')}
                          onChange={(e) => handleCustomEmailsChange(evt.key, 'custom_bcc', e.target.value)}
                          placeholder="Custom email BCC (e.g. audit@activ.co.id)"
                          className="w-full bg-white border border-surface-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-surface-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition shadow-sm disabled:opacity-50"
          >
            {isSaving ? <span className="animate-spin mr-1">⌛</span> : <Mail className="w-4 h-4" />}
            <span>Simpan Pengaturan Notifikasi Email</span>
          </button>
        </div>
      </form>
    </div>
  );
}
