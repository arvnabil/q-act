import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { 
  Plus, Edit, Trash2, Star, Building2, CreditCard, Loader2, X, FileText, Wrench, ImageIcon, Globe,
  TrendingUp, SlidersHorizontal, Calendar, Video, CheckCircle2, AlertCircle, Key, Link2, ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Settings({ 
  companyInfo: initialCompanyInfo = {}, 
  bankAccounts = [], 
  masterTerms = [], 
  domainLogoMap = [], 
  maintenanceMode = { enabled: false, domains: [] },
  pipelineSettings = null,
  googleCalendarSettings = { is_configured: false },
  zoomSettings = { is_configured: false },
  teamUsers = []
}) {
  const { auth } = usePage().props;
  const user = auth?.user || {};
  const userRole = user.spatie_role || user.role || '';
  const isAdmin = !userRole || ['admin', 'Administrator', 'Sales Manager', 'Manager', 'super-admin'].includes(userRole);

  // Company Info State
  const [company, setCompany] = useState(initialCompanyInfo);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  useEffect(() => {
    setCompany(initialCompanyInfo);
  }, [initialCompanyInfo]);

  const handleSaveCompany = (e) => {
    e.preventDefault();
    setIsSavingCompany(true);
    router.post(route('settings.company-info'), company, {
      preserveScroll: true,
      onFinish: () => {
        setIsSavingCompany(false);
        setIsEditingCompany(false);
      }
    });
  };

  // Bank Accounts State & Modals
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [deletingBankId, setDeletingBankId] = useState(null);

  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankForm({ bank_name: '', account_number: '', account_name: '' });
    setShowBankModal(true);
  };

  const handleOpenEditBank = (b) => {
    setEditingBank(b);
    setBankForm({ bank_name: b.bank_name || '', account_number: b.account_number || '', account_name: b.account_name || '' });
    setShowBankModal(true);
  };

  const handleSaveBank = (e) => {
    e.preventDefault();
    if (!bankForm.bank_name.trim() || !bankForm.account_number.trim() || !bankForm.account_name.trim()) {
      toast.error('Semua kolom wajib diisi.');
      return;
    }
    setIsSavingBank(true);

    if (editingBank) {
      router.put(route('settings.bank-accounts.update', editingBank.id), bankForm, {
        preserveScroll: true,
        onFinish: () => {
          setIsSavingBank(false);
          setShowBankModal(false);
        }
      });
    } else {
      router.post(route('settings.bank-accounts.store'), bankForm, {
        preserveScroll: true,
        onFinish: () => {
          setIsSavingBank(false);
          setShowBankModal(false);
        }
      });
    }
  };

  const handleSetDefaultBank = (id) => {
    router.post(route('settings.bank-accounts.default', id), {}, { preserveScroll: true });
  };

  const handleDeleteBank = (id) => {
    if (!window.confirm('Yakin ingin menghapus rekening ini?')) return;
    setDeletingBankId(id);
    router.delete(route('settings.bank-accounts.destroy', id), {
      preserveScroll: true,
      onFinish: () => setDeletingBankId(null)
    });
  };

  // Master Terms State & Modals
  const [masterTemplatesList, setMasterTemplatesList] = useState(masterTerms);
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [editingMasterId, setEditingMasterId] = useState(null);
  const [masterForm, setMasterForm] = useState({ name: '', termsText: '' });
  const [deleteTargetMaster, setDeleteTargetMaster] = useState(null);

  useEffect(() => {
    setMasterTemplatesList(masterTerms);
  }, [masterTerms]);

  const handleOpenAddMaster = () => {
    setEditingMasterId(null);
    setMasterForm({ name: '', termsText: '' });
    setShowMasterModal(true);
  };

  const handleOpenEditMaster = (tpl) => {
    setEditingMasterId(tpl.id);
    setMasterForm({
      name: tpl.name || '',
      termsText: Array.isArray(tpl.terms) ? tpl.terms.join('\n') : String(tpl.terms || '')
    });
    setShowMasterModal(true);
  };

  const handleSaveMaster = (e) => {
    e.preventDefault();
    if (!masterForm.name.trim() || !masterForm.termsText.trim()) {
      toast.error('Nama dan isi syarat & ketentuan wajib diisi!');
      return;
    }

    const termsArray = masterForm.termsText.split('\n').map(t => t.trim()).filter(Boolean);
    let updated;
    if (editingMasterId) {
      updated = masterTemplatesList.map(t => t.id === editingMasterId ? { ...t, name: masterForm.name.trim(), terms: termsArray } : t);
    } else {
      updated = [...masterTemplatesList, { id: 'master_' + Date.now(), name: masterForm.name.trim(), terms: termsArray }];
    }

    router.post(route('settings.master-terms'), { templates: updated }, {
      preserveScroll: true,
      onSuccess: () => {
        setShowMasterModal(false);
      }
    });
  };

  const executeDeleteMaster = () => {
    if (!deleteTargetMaster) return;
    const updated = masterTemplatesList.filter(t => t.id !== deleteTargetMaster.id);
    router.post(route('settings.master-terms'), { templates: updated }, {
      preserveScroll: true,
      onSuccess: () => {
        setDeleteTargetMaster(null);
      }
    });
  };

  // Domain Logo Map State & Modals
  const [domainMapList, setDomainMapList] = useState(domainLogoMap);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [editingDomainEntry, setEditingDomainEntry] = useState(null);
  const [domainForm, setDomainForm] = useState({ domain: '', logoPath: '', label: '', maxHeight: '', maxWidth: '' });

  useEffect(() => {
    setDomainMapList(domainLogoMap);
  }, [domainLogoMap]);

  const handleSaveDomainLogo = (e) => {
    e.preventDefault();
    const d = domainForm.domain.trim().toLowerCase().replace(/^@/, '');
    const l = domainForm.logoPath.trim();
    if (!d || !l) { toast.error('Domain dan path logo wajib diisi!'); return; }

    let updated;
    if (editingDomainEntry) {
      updated = domainMapList.map(entry =>
        entry.id === editingDomainEntry.id
          ? { 
              ...entry, 
              domain: d, 
              logoPath: l, 
              label: domainForm.label.trim(), 
              maxHeight: domainForm.maxHeight.trim() || undefined, 
              maxWidth: domainForm.maxWidth.trim() || undefined 
            }
          : entry
      );
    } else {
      if (domainMapList.some(e => e.domain.toLowerCase() === d)) {
        toast.error(`Domain @${d} sudah terdaftar!`);
        return;
      }
      updated = [...domainMapList, { 
        id: 'dom_' + Date.now(), 
        domain: d, 
        logoPath: l, 
        label: domainForm.label.trim(), 
        maxHeight: domainForm.maxHeight.trim() || undefined, 
        maxWidth: domainForm.maxWidth.trim() || undefined 
      }];
    }

    router.post(route('settings.domain-logo'), { domainLogoMap: updated }, {
      preserveScroll: true,
      onSuccess: () => setShowDomainModal(false)
    });
  };

  const handleDeleteDomainLogo = (id, domainName) => {
    if (!window.confirm(`Hapus domain @${domainName}?`)) return;
    const updated = domainMapList.filter(e => e.id !== id);
    router.post(route('settings.domain-logo'), { domainLogoMap: updated }, { preserveScroll: true });
  };

  // Maintenance Mode State
  const [mtDomains, setMtDomains] = useState((maintenanceMode.domains || []).join(', '));
  const [isMtEditing, setIsMtEditing] = useState(false);

  useEffect(() => {
    setMtDomains((maintenanceMode.domains || []).join(', '));
  }, [maintenanceMode]);

  const handleToggleMaintenance = () => {
    const domainsArray = mtDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    router.post(route('settings.maintenance-mode'), {
      enabled: !maintenanceMode.enabled,
      domains: domainsArray
    }, { preserveScroll: true });
  };

  const handleSaveMtDomains = () => {
    const domainsArray = mtDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    router.post(route('settings.maintenance-mode'), {
      enabled: maintenanceMode.enabled,
      domains: domainsArray
    }, { 
      preserveScroll: true,
      onSuccess: () => setIsMtEditing(false)
    });
  };

  // Pipeline Settings State
  const defaultStages = [
    { key: 'data_masuk',      name: 'Data Masuk',      type: 'normal', color: '#94A3B8' },
    { key: 'sph_terlayang',   name: 'SPH Terlayang',   type: 'normal', color: '#3B82F6' },
    { key: 'hot_progress',    name: 'Hot Progress',    type: 'normal', color: '#F59E0B' },
    { key: 'proyek_deal',     name: 'Proyek Deal',     type: 'deal',   color: '#009680' },
    { key: 'proyek_berjalan', name: 'Proyek Berjalan', type: 'normal', color: '#8B5CF6' },
    { key: 'proyek_selesai',  name: 'Proyek Selesai',  type: 'normal', color: '#10B981' },
    { key: 'no_deal',         name: 'No Deal',         type: 'lost',   color: '#EF4444' },
  ];

  const [pipeline, setPipeline] = useState(pipelineSettings || {
    featured_stage_1: 'hot_progress',
    featured_stage_2: 'proyek_deal',
    stages: defaultStages,
  });
  const [isSavingPipeline, setIsSavingPipeline] = useState(false);

  useEffect(() => {
    if (pipelineSettings) {
      setPipeline(pipelineSettings);
    }
  }, [pipelineSettings]);

  const handlePipelineNameChange = (key, name) => {
    setPipeline(prev => ({
      ...prev,
      stages: (prev.stages || defaultStages).map(s => s.key === key ? { ...s, name } : s)
    }));
  };

  const handlePipelineTypeChange = (key, type) => {
    setPipeline(prev => ({
      ...prev,
      stages: (prev.stages || defaultStages).map(s => s.key === key ? { ...s, type } : s)
    }));
  };

  const handleSavePipeline = async (e) => {
    e.preventDefault();
    setIsSavingPipeline(true);
    try {
      await axios.post(route('leads.settings.update'), pipeline);
      toast.success('Pengaturan tahap pipeline berhasil disimpan!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan pipeline');
    } finally {
      setIsSavingPipeline(false);
    }
  };

  // Integrations State
  const [gcCalendarId, setGcCalendarId] = useState(googleCalendarSettings?.calendar_id || '');
  const [gcServiceJson, setGcServiceJson] = useState('');
  const [isSavingGc, setIsSavingGc] = useState(false);

  const [zoomAccountId, setZoomAccountId] = useState(zoomSettings?.account_id || '');
  const [zoomClientId, setZoomClientId] = useState(zoomSettings?.client_id || '');
  const [zoomClientSecret, setZoomClientSecret] = useState('');
  const [isSavingZoom, setIsSavingZoom] = useState(false);

  useEffect(() => {
    if (googleCalendarSettings?.calendar_id) setGcCalendarId(googleCalendarSettings.calendar_id);
    if (zoomSettings?.account_id) setZoomAccountId(zoomSettings.account_id);
    if (zoomSettings?.client_id) setZoomClientId(zoomSettings.client_id);
  }, [googleCalendarSettings, zoomSettings]);

  const handleSaveGoogleCalendar = (e) => {
    e.preventDefault();
    setIsSavingGc(true);
    router.post(route('settings.google-calendar'), {
      action: 'save',
      calendar_id: gcCalendarId,
      service_json: gcServiceJson,
    }, {
      preserveScroll: true,
      onSuccess: () => setGcServiceJson(''),
      onFinish: () => setIsSavingGc(false),
    });
  };

  const handleClearGoogleCalendar = () => {
    if (!window.confirm('Hapus konfigurasi Google Calendar? Sinkronisasi kunjungan tim ke Google Calendar akan dihentikan.')) return;
    router.post(route('settings.google-calendar'), { action: 'clear' }, { preserveScroll: true });
  };

  const handleSaveZoom = (e) => {
    e.preventDefault();
    setIsSavingZoom(true);
    router.post(route('settings.zoom'), {
      action: 'save',
      account_id: zoomAccountId,
      client_id: zoomClientId,
      client_secret: zoomClientSecret,
    }, {
      preserveScroll: true,
      onSuccess: () => setZoomClientSecret(''),
      onFinish: () => setIsSavingZoom(false),
    });
  };

  const handleClearZoom = () => {
    if (!window.confirm('Hapus konfigurasi Zoom Server-to-Server? Pembuatan link meeting otomatis akan dinonaktifkan.')) return;
    router.post(route('settings.zoom'), { action: 'clear' }, { preserveScroll: true });
  };

  const handleToggleZoomLicense = (userId, currentVal) => {
    router.post(route('settings.users.integrations', userId), {
      has_zoom_license: !currentVal,
    }, { preserveScroll: true });
  };

  const handleSaveUserCalendarEmail = (userId, email) => {
    router.post(route('settings.users.integrations', userId), {
      google_calendar_email: email,
    }, { preserveScroll: true });
  };

  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Pengaturan Sistem</h2>}
    >
      <Head title="Pengaturan Sistem" />

      <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl space-y-6">

          {/* Company Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-800">Informasi Perusahaan</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isEditingCompany) setCompany(initialCompanyInfo);
                  setIsEditingCompany(!isEditingCompany);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                {isEditingCompany ? 'Batal' : 'Edit'}
              </button>
            </div>
            
            <form onSubmit={handleSaveCompany} className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { key: 'name', label: 'Nama Perusahaan', span: false },
                { key: 'brand', label: 'Brand', span: false },
                { key: 'address', label: 'Alamat Kantor Pusat', span: true },
                { key: 'branch', label: 'Kantor Cabang', span: true },
                { key: 'phone', label: 'Telepon', span: false },
                { key: 'email', label: 'Email', span: false },
                { key: 'website', label: 'Website', span: false },
              ].map(field => (
                <div key={field.key} className={field.span ? 'md:col-span-2' : ''}>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={company[field.key] || ''}
                    onChange={e => setCompany({ ...company, [field.key]: e.target.value })}
                    readOnly={!isEditingCompany}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-all ${
                      isEditingCompany
                        ? 'bg-white border-gray-300 text-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-100'
                        : 'bg-gray-50 border-gray-200 text-gray-600 cursor-default'
                    }`}
                  />
                </div>
              ))}
              {isEditingCompany && (
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingCompany}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {isSavingCompany && <Loader2 className="w-4 h-4 animate-spin" />}
                    Simpan Informasi Perusahaan
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Tahap Pipeline Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                <h2 className="text-sm font-bold text-gray-800">Tahap pipeline</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Tipe menentukan perhitungan dashboard: <strong>Deal</strong> = menang, <strong>Lost</strong> = gugur, <strong>Normal</strong> = masih jalan. Hanya owner/manager yang dapat mengubah tahap pipeline; tim mengikuti pengaturan ini.
              </p>
            </div>

            <form onSubmit={handleSavePipeline} className="p-6 space-y-6">
              {/* Highlight Cards Configuration */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Card Ringkasan di Header Pipeline</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Card Status 1 (Dinamis)</label>
                    <select
                      value={pipeline.featured_stage_1 || 'hot_progress'}
                      onChange={e => setPipeline(prev => ({ ...prev, featured_stage_1: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                    >
                      {(pipeline.stages || defaultStages).map(s => (
                        <option key={s.key} value={s.key}>{s.name} ({s.key})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Card Status 2 (Dinamis)</label>
                    <select
                      value={pipeline.featured_stage_2 || 'proyek_deal'}
                      onChange={e => setPipeline(prev => ({ ...prev, featured_stage_2: e.target.value }))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                    >
                      {(pipeline.stages || defaultStages).map(s => (
                        <option key={s.key} value={s.key}>{s.name} ({s.key})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Stages List */}
              <div className="space-y-3">
                {(pipeline.stages || defaultStages).map(s => (
                  <div key={s.key} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center shadow-2xs"
                      style={{ backgroundColor: s.color || '#94A3B8' }}
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={s.name}
                        onChange={e => handlePipelineNameChange(s.key, e.target.value)}
                        placeholder="Nama tahap..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 font-medium focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div className="w-40 shrink-0">
                      <select
                        value={s.type || 'normal'}
                        onChange={e => handlePipelineTypeChange(s.key, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                      >
                        <option value="normal">Normal</option>
                        <option value="deal">Deal (menang)</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingPipeline}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {isSavingPipeline && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Pengaturan Pipeline
                </button>
              </div>
            </form>
          </div>

          {/* Bank Accounts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-bold text-gray-800">Rekening Bank</h2>
                {bankAccounts.length > 0 && (
                  <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{bankAccounts.length}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleOpenAddBank}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Rekening
              </button>
            </div>
            
            <div className="overflow-x-auto">
              {bankAccounts.length === 0 ? (
                <div className="py-10 text-center">
                  <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Belum ada rekening bank terdaftar.</p>
                  <button type="button" onClick={handleOpenAddBank} className="mt-2 text-xs font-semibold text-brand-600 hover:underline cursor-pointer">+ Tambah sekarang</button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bank</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nomor Rekening</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Atas Nama</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bankAccounts.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {(b.bank_name || '').slice(0, 3).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{b.bank_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-sm font-mono text-gray-600">{b.account_number}</td>
                        <td className="py-3.5 px-4 text-sm text-gray-600">{b.account_name}</td>
                        <td className="py-3.5 px-4">
                          {b.is_default ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Default
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultBank(b.id)}
                              className="text-xs text-gray-400 hover:text-brand-600 transition-colors cursor-pointer"
                            >
                              Set Default
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button type="button" onClick={() => handleOpenEditBank(b)} className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 p-1.5 rounded-lg transition-colors cursor-pointer"><Edit className="w-4 h-4" /></button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBank(b.id)}
                              disabled={deletingBankId === b.id}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {deletingBankId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Master Terms Templates Card (Admin Only) */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-600" />
                    Master Template Syarat & Ketentuan (Khusus Admin)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Kelola template standar perusahaan yang tampil secara otomatis di pilihan semua sales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddMaster}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Master Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {masterTemplatesList.map(tpl => (
                  <div key={tpl.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:border-gray-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          🏢 {tpl.name}
                        </span>
                        <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold">Master</span>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-lg p-3 text-xs text-gray-700 space-y-1 font-mono text-[11px] max-h-36 overflow-y-auto">
                        {Array.isArray(tpl.terms) ? tpl.terms.map((t, i) => (
                          <div key={i} className="leading-tight">• {t}</div>
                        )) : tpl.terms}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => handleOpenEditMaster(tpl)}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-brand-600 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetMaster({ id: tpl.id, name: tpl.name })}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors cursor-pointer ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domain Logo Mapping (Admin Only) */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-bold text-gray-800">Logo per Domain Email</h2>
                  {domainMapList.length > 0 && (
                    <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{domainMapList.length}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDomainEntry(null);
                    setDomainForm({ domain: '', logoPath: '', label: '', maxHeight: '', maxWidth: '' });
                    setShowDomainModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Domain
                </button>
              </div>

              <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100">
                <p className="text-xs text-gray-500">
                  Pengguna dengan email domain tertentu akan mendapatkan logo yang berbeda pada PDF Quotation yang mereka cetak.
                </p>
              </div>

              <div className="overflow-x-auto">
                {domainMapList.length === 0 ? (
                  <div className="py-10 text-center">
                    <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Belum ada domain yang dikonfigurasi.</p>
                    <button
                      type="button"
                      onClick={() => { setEditingDomainEntry(null); setDomainForm({ domain: '', logoPath: '', label: '', maxHeight: '', maxWidth: '' }); setShowDomainModal(true); }}
                      className="mt-2 text-xs font-semibold text-brand-600 hover:underline cursor-pointer"
                    >+ Tambah sekarang</button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Domain Email</th>
                        <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Label</th>
                        <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Path / URL Logo</th>
                        <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Preview</th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {domainMapList.map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md bg-brand-50 flex items-center justify-center shrink-0">
                                <Globe className="w-3.5 h-3.5 text-brand-600" />
                              </div>
                              <span className="text-sm font-mono font-semibold text-gray-800">@{entry.domain}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-sm text-gray-600">{entry.label || <span className="text-gray-300 italic">—</span>}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{entry.logoPath}</code>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="w-20 h-9 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-200">
                              <img
                                src={entry.logoPath}
                                alt={entry.label || entry.domain}
                                className="max-w-full max-h-full object-contain"
                                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                              />
                              <span className="hidden items-center justify-center w-full h-full text-[9px] text-gray-400 text-center leading-tight p-1">Tidak<br/>ditemukan</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDomainEntry(entry);
                                  setDomainForm({ domain: entry.domain, logoPath: entry.logoPath, label: entry.label || '', maxHeight: entry.maxHeight || '', maxWidth: entry.maxWidth || '' });
                                  setShowDomainModal(true);
                                }}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDomainLogo(entry.id, entry.domain)}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Pengaturan Sistem - Maintenance Mode */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-bold text-gray-800">Pengaturan Sistem (Maintenance Mode)</h2>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      Status Mode Perawatan
                      {maintenanceMode.enabled ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Aktif</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">Nonaktif</span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Saat diaktifkan, pengguna non-admin yang mengakses portal melalui domain terdampak akan dialihkan ke halaman pemeliharaan sistem.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={handleToggleMaintenance}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        maintenanceMode.enabled ? 'bg-amber-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        maintenanceMode.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-600 block">Domain Terdampak</label>
                    {!isMtEditing ? (
                      <button type="button" onClick={() => setIsMtEditing(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">Ubah Domain</button>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsMtEditing(false); setMtDomains((maintenanceMode.domains || []).join(', ')); }} className="text-xs font-semibold text-gray-400 hover:text-gray-600 cursor-pointer">Batal</button>
                        <button type="button" onClick={handleSaveMtDomains} className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer">
                          Simpan
                        </button>
                      </div>
                    )}
                  </div>
                  {isMtEditing ? (
                    <div>
                      <textarea
                        value={mtDomains}
                        onChange={(e) => setMtDomains(e.target.value)}
                        placeholder="Contoh: activ.co.id, qsales.activ.co.id"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-xs text-gray-700 font-mono outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100 transition-all min-h-[60px]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Pisahkan dengan koma. Kosongkan jika berlaku di semua domain.</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      {maintenanceMode.domains && maintenanceMode.domains.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {maintenanceMode.domains.map(d => (
                            <span key={d} className="inline-flex font-mono bg-white border border-gray-200 px-2 py-0.5 rounded text-xs text-gray-600">{d}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Berlaku untuk semua domain (All Domains).</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Integrasi Eksternal: Google Calendar & Zoom Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brand-600" />
                  <h2 className="text-sm font-bold text-gray-800">Integrasi Eksternal (Google Calendar & Zoom)</h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sinkronisasi jadwal kunjungan ke Google Calendar perusahaan dan pembuatan link meeting Zoom secara otomatis.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* 1. Google Calendar Section */}
              <div className="rounded-xl border border-gray-200 p-5 bg-gray-50/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Google Calendar Tim (Shared Calendar)</h3>
                      <p className="text-xs text-gray-500">Seluruh kunjungan yang dijadwalkan sales akan otomatis masuk ke kalender kantor.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {googleCalendarSettings.is_configured ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tersambung
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" /> Belum Terkonfigurasi
                      </span>
                    )}
                  </div>
                </div>

                {googleCalendarSettings.is_configured && (
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs text-emerald-800 space-y-1">
                    <p><strong>Calendar ID:</strong> <code className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">{googleCalendarSettings.calendar_id}</code></p>
                    {googleCalendarSettings.client_email && (
                      <p><strong>Service Account:</strong> <code className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200">{googleCalendarSettings.client_email}</code></p>
                    )}
                  </div>
                )}

                <form onSubmit={handleSaveGoogleCalendar} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Calendar ID Gmail Kantor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={gcCalendarId}
                      onChange={e => setGcCalendarId(e.target.value)}
                      placeholder="Contoh: calendar@activ.co.id atau xxxx@group.calendar.google.com"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono"
                      required
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Ditemukan di Google Calendar → Settings of shared calendar → Calendar ID.</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Service Account Credentials JSON <span className="text-gray-400 font-normal">({googleCalendarSettings.has_private_key ? 'Sudah tersimpan, paste baru untuk update' : 'Wajib diisi'})</span>
                    </label>
                    <textarea
                      rows={3}
                      value={gcServiceJson}
                      onChange={e => setGcServiceJson(e.target.value)}
                      placeholder='Paste isi file credentials JSON dari Google Cloud Console Service Account di sini: {"type": "service_account", "client_email": "...", ...}'
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-mono"
                    />
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      💡 <strong>Catatan:</strong> Pastikan email Service Account diinvite ke Google Calendar kantor dengan akses <em>"Make changes to events"</em>.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    {googleCalendarSettings.is_configured && (
                      <button
                        type="button"
                        onClick={handleClearGoogleCalendar}
                        className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Hapus Kredensial
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingGc}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {isSavingGc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Simpan Konfigurasi Google Calendar
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. Zoom Server-to-Server OAuth Section */}
              <div className="rounded-xl border border-gray-200 p-5 bg-gray-50/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">Zoom Server-to-Server OAuth</h3>
                      <p className="text-xs text-gray-500">Memungkinkan pembuatan link meeting otomatis dan rekaman rapat tanpa login manual.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {zoomSettings.is_configured ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tersambung
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" /> Belum Terkonfigurasi
                      </span>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSaveZoom} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Zoom Account ID <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={zoomAccountId}
                        onChange={e => setZoomAccountId(e.target.value)}
                        placeholder="Contoh: uXyZaBcDeFg"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-brand-500 outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Client ID <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={zoomClientId}
                        onChange={e => setZoomClientId(e.target.value)}
                        placeholder="Client ID dari Zoom App"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-brand-500 outline-none font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Client Secret {zoomSettings.has_client_secret && <span className="text-emerald-600 font-normal">(Tersimpan)</span>}
                      </label>
                      <input
                        type="password"
                        value={zoomClientSecret}
                        onChange={e => setZoomClientSecret(e.target.value)}
                        placeholder={zoomSettings.has_client_secret ? '••••••••••••••••' : 'Client Secret Zoom'}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:border-brand-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    💡 <strong>Setup Zoom:</strong> Buat aplikasi <em>Server-to-Server OAuth</em> di <strong>marketplace.zoom.us</strong>. Tambahkan scopes: <code>meeting:write:admin</code>, <code>meeting:read:admin</code>.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    {zoomSettings.is_configured && (
                      <button
                        type="button"
                        onClick={handleClearZoom}
                        className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Hapus Kredensial Zoom
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingZoom}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {isSavingZoom && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Simpan Konfigurasi Zoom
                    </button>
                  </div>
                </form>
              </div>

              {/* 3. User Integrations & Zoom License Assignment Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Lisensi Zoom & Akun Kalender Tim Sales</h3>
                    <p className="text-[11px] text-gray-500">Tentukan anggota tim yang dapat membuat link Zoom meeting dan memetakan email kalender.</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-4">Nama User</th>
                        <th className="py-2.5 px-4">Email Login</th>
                        <th className="py-2.5 px-4 text-center">Lisensi Zoom</th>
                        <th className="py-2.5 px-4">Email Google Calendar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {teamUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-gray-900">{u.name}</td>
                          <td className="py-2.5 px-4 text-gray-600 font-mono">{u.email}</td>
                          <td className="py-2.5 px-4 text-center">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!u.has_zoom_license}
                                onChange={() => handleToggleZoomLicense(u.id, u.has_zoom_license)}
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300 cursor-pointer"
                              />
                              <span className={`text-[11px] font-semibold ${u.has_zoom_license ? 'text-sky-700' : 'text-gray-400'}`}>
                                {u.has_zoom_license ? 'Aktif' : 'Tidak'}
                              </span>
                            </label>
                          </td>
                          <td className="py-2.5 px-4">
                            <input
                              type="email"
                              defaultValue={u.google_calendar_email || u.email}
                              onBlur={e => {
                                if (e.target.value !== (u.google_calendar_email || '')) {
                                  handleSaveUserCalendarEmail(u.id, e.target.value);
                                }
                              }}
                              placeholder={u.email}
                              className="bg-transparent border border-transparent hover:border-gray-200 focus:border-brand-500 rounded px-2 py-1 text-xs text-gray-700 font-mono w-full max-w-xs focus:bg-white outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bank Account Modal */}
      {showBankModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">{editingBank ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'}</h3>
              <button type="button" onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveBank} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nama Bank <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={bankForm.bank_name}
                  onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  placeholder="Contoh: BCA, Mandiri, BNI"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nomor Rekening <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={bankForm.account_number}
                  onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-brand-500"
                  placeholder="Contoh: 6044447899"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Atas Nama <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={bankForm.account_name}
                  onChange={e => setBankForm(f => ({ ...f, account_name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  placeholder="Contoh: PT ALFA CIPTA TEKNOLOGI VIRTUAL"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBankModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer">Batal</button>
                <button
                  type="submit"
                  disabled={isSavingBank}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSavingBank && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBank ? 'Simpan Perubahan' : 'Tambah Rekening'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Master Template Modal */}
      {showMasterModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editingMasterId ? 'Edit Master Template' : 'Tambah Master Template Baru'}
              </h3>
              <button type="button" onClick={() => setShowMasterModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveMaster} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nama Master Template <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={masterForm.name}
                  onChange={e => setMasterForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  placeholder="Contoh: Project Standard PPN 11%"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Poin Syarat & Ketentuan (Satu baris per poin) <span className="text-red-500">*</span></label>
                <textarea
                  rows={6}
                  value={masterForm.termsText}
                  onChange={e => setMasterForm(f => ({ ...f, termsText: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs outline-none focus:border-brand-500 font-sans leading-relaxed"
                  placeholder="1. Harga belum termasuk PPN 11%&#10;2. Pembayaran CBO..."
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowMasterModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer">Batal</button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm cursor-pointer"
                >
                  {editingMasterId ? 'Simpan Perubahan' : 'Tambah Master Template'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Master Modal */}
      {deleteTargetMaster && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">Hapus Master Template?</h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus Master Template <span className="font-bold text-gray-800">"{deleteTargetMaster.name}"</span>? Template ini tidak akan tampil lagi di preset sales.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTargetMaster(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteMaster}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Ya, Hapus Master Template
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Domain Logo Modal */}
      {showDomainModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editingDomainEntry ? 'Edit Domain Logo' : 'Tambah Domain Logo'}
              </h3>
              <button type="button" onClick={() => setShowDomainModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDomainLogo} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Label <span className="text-gray-400 font-normal">(opsional)</span></label>
                <input
                  type="text"
                  value={domainForm.label}
                  onChange={e => setDomainForm(f => ({ ...f, label: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                  placeholder="Contoh: Accommerce, Mitra ABC"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Domain Email <span className="text-red-500">*</span></label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-100 transition-all">
                  <span className="pl-3 text-sm text-gray-400 select-none">@</span>
                  <input
                    type="text"
                    value={domainForm.domain}
                    onChange={e => setDomainForm(f => ({ ...f, domain: e.target.value.replace(/^@/, '') }))}
                    className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none font-mono"
                    placeholder="accommerce.id"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Tanpa tanda @. Contoh: <code className="bg-gray-100 px-1 rounded">accommerce.id</code></p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Path / URL Logo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={domainForm.logoPath}
                  onChange={e => setDomainForm(f => ({ ...f, logoPath: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-brand-500"
                  placeholder="/logo_accommerce.png"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">File logo diletakkan di folder <code className="bg-gray-100 px-1 rounded">/public</code>. Contoh: <code className="bg-gray-100 px-1 rounded">/logo_accommerce.png</code></p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Ukuran Logo di PDF <span className="text-gray-400 font-normal">(opsional)</span>
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-100 transition-all">
                      <span className="pl-3 text-xs text-gray-400 select-none whitespace-nowrap">Tinggi</span>
                      <input
                        type="text"
                        value={domainForm.maxHeight}
                        onChange={e => setDomainForm(f => ({ ...f, maxHeight: e.target.value }))}
                        className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none font-mono w-0"
                        placeholder="70px"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-100 transition-all">
                      <span className="pl-3 text-xs text-gray-400 select-none whitespace-nowrap">Lebar</span>
                      <input
                        type="text"
                        value={domainForm.maxWidth}
                        onChange={e => setDomainForm(f => ({ ...f, maxWidth: e.target.value }))}
                        className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none font-mono w-0"
                        placeholder="240px"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Kosongkan untuk pakai ukuran default. Contoh: <code className="bg-gray-100 px-1 rounded">70px</code> dan <code className="bg-gray-100 px-1 rounded">240px</code></p>
              </div>

              {domainForm.logoPath && (
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">Preview Logo:</p>
                  <div className="h-12 flex items-center justify-center bg-white rounded-lg border border-gray-100 overflow-hidden">
                    <img
                      src={domainForm.logoPath}
                      alt="preview"
                      className="max-h-full max-w-full object-contain"
                      onError={e => { e.target.style.opacity = '0.3'; }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowDomainModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer">Batal</button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all shadow-sm cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  {editingDomainEntry ? 'Simpan Perubahan' : 'Tambah Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </AuthenticatedLayout>
  );
}
