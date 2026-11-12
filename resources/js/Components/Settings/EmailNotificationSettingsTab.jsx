import React from 'react';
import {
  Mail,
  Shield,
  Check,
  FileUp,
  DollarSign,
  Users,
  Info,
  Calendar,
  UserCheck,
  RefreshCw,
  Gift,
  KeyRound,
  Package,
  Send,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function EmailNotificationSettingsTab({
  emailForm,
  setEmailForm,
  availableRoles = [],
  onSubmit,
  isSaving = false,
}) {
  // Bagian 1: Notifikasi Tim & Alur Kerja yang dapat dikonfigurasi penerimanya
  const configurableEvents = [
    {
      key: 'po_uploaded',
      title: 'Upload Dokumen Purchase Order (PO)',
      description: 'Dikirim saat PO pelanggan baru dimasukkan atau diunggah pada penawaran (quotation) yang disetujui.',
      icon: FileUp,
      color: 'sky',
      hasSalesCc: true,
      salesCcLabel: 'CC Otomatis ke Sales Penanggung Jawab Quotation',
      toLabel: 'Kirim Kepada (TO) — Pilih Role:',
      defaultToHint: 'Pilih role atau ketik email tujuan langsung (misal: finance@activ.co.id)',
    },
    {
      key: 'lead_paid',
      title: 'Lead Selesai Terbayar (Paid Deal)',
      description: 'Dikirim saat status prospek/lead disahkan mencapai tahap Selesai Terbayar.',
      icon: DollarSign,
      color: 'emerald',
      hasSalesCc: true,
      salesCcLabel: 'CC Otomatis ke Sales Pemilik Lead',
      toLabel: 'Kirim Kepada (TO) — Pilih Role:',
      defaultToHint: 'Pilih role atau ketik email finance / manajemen',
    },
    {
      key: 'change_request_submitted',
      title: 'Pengajuan Revisi Quotation / Change Request',
      description: 'Dikirim ke Manager saat Sales mengajukan revisi harga, diskon, atau pembatalan quotation.',
      icon: RefreshCw,
      color: 'amber',
      hasSalesCc: true,
      salesCcLabel: 'CC Otomatis ke Sales Pengaju Revisi',
      toLabel: 'Kirim Kepada (TO) — Biasanya Manager / Sales Manager:',
      defaultToHint: 'Pilih role Manager atau ketik email khusus',
    },
    {
      key: 'change_request_decided',
      title: 'Hasil Approval Revisi Quotation',
      description: 'Dikirim ke Sales penanggung jawab saat revisi disetujui atau ditolak oleh Manager.',
      icon: Check,
      color: 'blue',
      hasSalesCc: false,
      hasNotifySales: true,
      salesNotifyLabel: 'Kirim otomatis ke Sales penanggung jawab quotation',
      toLabel: 'Kirim Tambahan (TO) — Opsional:',
      defaultToHint: 'Penerima utama otomatis Sales pengaju penawaran',
    },
    {
      key: 'lead_assigned',
      title: 'Disposisi / Assignment Lead Baru',
      description: 'Dikirim saat prospek/lead baru dialokasikan atau dipindahtugaskan ke Sales tertentu.',
      icon: UserCheck,
      color: 'indigo',
      hasSalesCc: false,
      hasNotifyAssignee: true,
      assigneeNotifyLabel: 'Kirim otomatis ke Sales yang menerima tugas lead',
      toLabel: 'Kirim Tambahan (TO) — Opsional:',
      defaultToHint: 'Penerima utama otomatis Sales penanggung jawab lead',
    },
    {
      key: 'daily_visit_reminder',
      title: 'Reminder Agenda Kunjungan Harian (Pukul 07.00)',
      description: 'Email rekap jadwal visit pagi hari ke masing-masing Sales/Presales. Otomatis dilewati jika tidak ada agenda hari itu.',
      icon: Calendar,
      color: 'teal',
      hasSalesCc: false,
      toLabel: 'Kirim Kepada (TO) — Pilih Role yang Menerima Agenda Pribadi:',
      defaultToHint: 'Default: Sales, Presales yang memiliki kunjungan aktif hari ini',
      extraNote: 'Sistem juga otomatis menandai kunjungan sebagai "Selesai" jika sudah lewat 2 hari belum diselesaikan.',
    },
    {
      key: 'customer_birthday_reminder',
      title: 'Pengingat Ulang Tahun PIC Customer (H-7)',
      description: 'Pemberitahuan H-7 sebelum hari ulang tahun PIC customer agar tim Sales dapat menyiapkan ucapan atau kado.',
      icon: Gift,
      color: 'rose',
      hasSalesCc: false,
      hasToSalesPic: true,
      salesPicLabel: 'Kirim otomatis ke Sales PIC yang memegang customer tersebut',
      toLabel: 'Kirim Tambahan (TO) / CC ke Role:',
      defaultToHint: 'Opsional: CC ke Manager atau email tim customer relationship',
    },
  ];

  // Bagian 2: Daftar Informasi Notifikasi Langsung & Sistem (Otomatis ke user terkait, tanpa toggle)
  const systemDirectNotifications = [
    {
      icon: Send,
      title: 'Undangan Akun Baru & Buat Kata Sandi',
      desc: 'Dikirimkan saat admin menambahkan pengguna/staf baru melalui menu Manajemen Pengguna. Berisi tautan aman untuk membuat kata sandi pertama kali.',
      recipient: 'Email pengguna baru yang didaftarkan',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      icon: KeyRound,
      title: 'Tautan Pemulihan Kata Sandi (Lupa Password)',
      desc: 'Dikirimkan saat pengguna mengeklik tombol "Lupa Kata Sandi" di halaman masuk (login). Berisi token aman 60 menit.',
      recipient: 'Email pengguna yang mengajukan permohonan',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      icon: Lock,
      title: 'Konfirmasi Kata Sandi Berhasil Diubah',
      desc: 'Notifikasi keamanan instan segera setelah kata sandi akun berhasil diperbarui atau direset untuk mencegah pengambilalihan akun.',
      recipient: 'Email pemilik akun yang kata sandinya diubah',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      icon: Package,
      title: 'Berkas Ekspor ZIP Siap Unduh',
      desc: 'Dikirimkan saat proses background ekspor data penawaran atau berkas lampiran selesai dengan tautan langsung ke Download Center.',
      recipient: 'Email staf/admin yang memicu ekspor',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
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

  const handleToggleField = (eventKey, field, current) => {
    setEmailForm(prev => ({
      ...prev,
      [eventKey]: {
        ...(prev[eventKey] || {}),
        [field]: !current,
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
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Pusat Pengaturan Notifikasi Email</h2>
            <p className="text-xs text-gray-500">
              Kelola daftar lengkap kejadian email otomatis, konfigurasi penerima tim (To, CC, BCC), dan informasi notifikasi sistem.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-8">
        {/* Banner Info */}
        <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-900">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sky-950">
              Integrasi Email Microsoft Graph API / SMTP Aktif
            </p>
            <p className="leading-relaxed text-sky-800">
              Notifikasi yang melibatkan tim, approval, atau distribusi dapat dikonfigurasi penerimanya (To, CC, BCC) pada bagian pertama di bawah ini. Notifikasi personal yang langsung ditujukan ke akun pengguna tertentu tercantum pada bagian kedua sebagai referensi sistem.
            </p>
          </div>
        </div>

        {/* SECTION 1: NOTIFIKASI TIM & ALUR KERJA (DAPAT DIKONFIGURASI) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                Notifikasi Tim & Alur Kerja (Dapat Dikonfigurasi)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Aktifkan atau nonaktifkan pengiriman, tentukan Role tujuan, serta tambahkan tembusan (CC / BCC).
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 bg-brand-50 text-brand-700 rounded-full border border-brand-200">
              {configurableEvents.length} Peristiwa
            </span>
          </div>

          <div className="space-y-5">
            {configurableEvents.map((evt) => {
              const config = emailForm[evt.key] || {
                enabled: false,
                notify_user: true,
                notify_sales: true,
                notify_assignee: true,
                to_sales_pic: true,
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
                    config.enabled
                      ? 'border-gray-300 bg-white shadow-xs'
                      : 'border-gray-200 bg-gray-50/70 opacity-80'
                  }`}
                >
                  {/* Event Card Header */}
                  <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          config.enabled
                            ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-100'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900">{evt.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              config.enabled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                          >
                            {config.enabled ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">{evt.description}</p>
                        {evt.extraNote && (
                          <p className="text-[11px] text-teal-700 mt-1 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {evt.extraNote}
                          </p>
                        )}
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
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>

                  {/* Settings Body when Enabled */}
                  {config.enabled && (
                    <div className="p-4 sm:p-5 space-y-4 bg-gray-50/40 rounded-b-2xl">
                      {/* Context Checkboxes */}
                      {evt.hasNotifySales && (
                        <label className="flex items-center gap-2 p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={config.notify_sales !== false}
                            onChange={() =>
                              handleToggleField(evt.key, 'notify_sales', config.notify_sales !== false)
                            }
                            className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                          />
                          <span>{evt.salesNotifyLabel}</span>
                        </label>
                      )}

                      {evt.hasNotifyAssignee && (
                        <label className="flex items-center gap-2 p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={config.notify_assignee !== false}
                            onChange={() =>
                              handleToggleField(evt.key, 'notify_assignee', config.notify_assignee !== false)
                            }
                            className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                          />
                          <span>{evt.assigneeNotifyLabel}</span>
                        </label>
                      )}

                      {evt.hasToSalesPic && (
                        <label className="flex items-center gap-2 p-2.5 bg-rose-50/60 border border-rose-100 rounded-xl text-xs text-rose-900 font-medium cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={config.to_sales_pic !== false}
                            onChange={() =>
                              handleToggleField(evt.key, 'to_sales_pic', config.to_sales_pic !== false)
                            }
                            className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                          />
                          <span>{evt.salesPicLabel}</span>
                        </label>
                      )}

                      {/* Penerima Utama (TO) */}
                      <div>
                        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mb-2">
                          <Users className="w-3.5 h-3.5 text-brand-600" />
                          {evt.toLabel || 'Kirim Kepada (TO) — Pilih Role:'}
                        </label>
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
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                                <span>{role}</span>
                              </button>
                            );
                          })}
                        </div>
                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                          Atau Tambahkan Email Khusus (TO):
                        </label>
                        <input
                          type="text"
                          value={(config.custom_to || []).join(', ')}
                          onChange={(e) =>
                            handleCustomEmailsChange(evt.key, 'custom_to', e.target.value)
                          }
                          placeholder={evt.defaultToHint || 'e.g. manager@activ.co.id'}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          Pisahkan dengan koma jika lebih dari satu alamat email.
                        </span>
                      </div>

                      {/* CC & BCC */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                        {/* CC */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-800 block">
                            Tembusan (CC):
                          </label>

                          {evt.hasSalesCc && (
                            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!config.cc_sales}
                                onChange={() =>
                                  handleToggleField(evt.key, 'cc_sales', !!config.cc_sales)
                                }
                                className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
                              />
                              <span>{evt.salesCcLabel || 'CC Otomatis ke Sales'}</span>
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
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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
                            onChange={(e) =>
                              handleCustomEmailsChange(evt.key, 'custom_cc', e.target.value)
                            }
                            placeholder="Custom email CC (pisahkan koma)"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100"
                          />
                        </div>

                        {/* BCC */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-800 block">
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
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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
                            onChange={(e) =>
                              handleCustomEmailsChange(evt.key, 'custom_bcc', e.target.value)
                            }
                            placeholder="Custom email BCC (e.g. director@activ.co.id)"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: NOTIFIKASI LANGSUNG & SISTEM (INFORMASI OTOMATIS) */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Notifikasi Langsung & Sistem (Informasi Otomatis)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Email keamanan dan transaksi personal berikut selalu dikirimkan secara otomatis langsung ke alamat email pengguna yang bersangkutan.
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
              {systemDirectNotifications.length} Notifikasi Otomatis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemDirectNotifications.map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 flex flex-col justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white border border-gray-200 rounded-lg text-gray-700 shrink-0">
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Penerima:</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-md border text-[10px] ${item.badgeColor}`}>
                      {item.recipient}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Perubahan konfigurasi akan segera berlaku untuk seluruh pengiriman email berikutnya.
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <span className="animate-spin mr-1">⌛</span> : <Mail className="w-4 h-4" />}
            <span>Simpan Pengaturan Notifikasi Email</span>
          </button>
        </div>
      </form>
    </div>
  );
}
