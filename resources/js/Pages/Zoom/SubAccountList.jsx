import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AlertCircle, CheckCircle2, Clock3, Eye, FileSpreadsheet, FileText, Link2, Loader2, Plus, RefreshCw, Search, ShieldCheck, Unlink, Users, Video, X } from 'lucide-react';

const date = value => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const timestamp = value => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah';

function MatchModal({ account, salesUsers = [], canCreateCustomer = false, canAssignCustomerOwner = false, isSalesLogin = false, currentUserId = '', onClose }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(account.initialSuggestion || account.customer || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', address: '', picName: '', picEmail: '', picPhone: '' });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [customerOwnerId, setCustomerOwnerId] = useState(account.customer?.created_by || account.initialSuggestion?.created_by || '');
  const [salesPicId, setSalesPicId] = useState(account.sales_pic?.id || (isSalesLogin ? currentUserId : ''));

  const selectCustomer = customer => {
    setSelected(customer);
    if (canAssignCustomerOwner) setCustomerOwnerId(customer?.created_by || '');
  };

  useEffect(() => {
    if (search.trim().length < 2) { setCustomers([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(route('zoom.customers.search'), { params: { search }, signal: controller.signal });
        setCustomers(data);
      } catch (error) {
        if (error.name !== 'CanceledError' && error.name !== 'AbortError') setCustomers([]);
      } finally { setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);

  const save = (customer, clearSalesPic = false) => {
    setSaving(true);
    router.put(route('zoom.sub-accounts.customer.update', account.zoom_account_id), { customer_id: customer?.id ?? null, sales_pic_id: clearSalesPic ? null : (salesPicId || null), ...(canAssignCustomerOwner && customer ? { customer_created_by: customerOwnerId || null } : {}) }, {
      preserveScroll: true,
      onFinish: () => setSaving(false),
      onSuccess: onClose,
    });
  };

  const createCustomer = async event => {
    event.preventDefault();
    if ((createForm.picEmail.trim() || createForm.picPhone.trim()) && !createForm.picName.trim()) {
      setCreateError('Isi nama PIC jika menambahkan email atau telepon PIC.');
      return;
    }
    setCreateLoading(true);
    setCreateError('');

    const payload = {
      name: createForm.name.trim(),
      address: createForm.address.trim() || null,
      ...(canAssignCustomerOwner ? { created_by: customerOwnerId || null } : {}),
      pics: createForm.picName.trim() ? [{
        name: createForm.picName.trim(),
        email: createForm.picEmail.trim() || null,
        phone: createForm.picPhone.trim() || null,
        is_primary: true,
      }] : [],
    };

    try {
      const { data } = await axios.post(route('customers.store'), payload);
      setSelected(data);
      if (canAssignCustomerOwner) setCustomerOwnerId(data.created_by || '');
      setCustomers(current => [data, ...current.filter(customer => customer.id !== data.id)]);
      setSearch(data.name);
      setCreatingCustomer(false);
    } catch (error) {
      const errors = error.response?.data?.errors;
      setCreateError(errors?.name?.[0] || errors?.address?.[0] || errors?.created_by?.[0] || errors?.['pics.0.name']?.[0] || error.response?.data?.message || 'Customer gagal dibuat. Coba lagi.');
    } finally {
      setCreateLoading(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="match-title">
    <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div><h2 id="match-title" className="text-lg font-bold text-slate-900">Tinjau kaitan customer</h2><p className="mt-1 text-sm text-slate-500">Saran hanya rekomendasi. Customer baru dikaitkan setelah Anda mengonfirmasi.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Zoom Sub Account</div><div className="mt-1 font-semibold text-slate-800">{account.account_name || 'Tanpa nama'}</div><div className="mt-1 text-xs text-slate-500">ID: {account.zoom_account_id}</div></div>
        {account.suggestions?.length > 0 && <div><div className="mb-2 text-sm font-semibold text-slate-700">Saran berdasarkan kemiripan nama</div><div className="space-y-2">{account.suggestions.map(candidate => <button key={candidate.id} type="button" onClick={() => selectCustomer(candidate)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${selected?.id === candidate.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'}`}><span className="font-medium text-slate-800">{candidate.name}</span><span className="text-xs text-slate-500">{candidate.score}% cocok</span></button>)}</div></div>}
        <div><label htmlFor="customer-search" className="mb-2 block text-sm font-semibold text-slate-700">Cari customer lain</label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="customer-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ketik minimal 2 karakter nama customer" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>
          {loading && <div className="mt-2 text-xs text-slate-400">Mencari customer…</div>}
          {customers.length > 0 && <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200">{customers.map(customer => <button type="button" key={customer.id} onClick={() => selectCustomer(customer)} className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 ${selected?.id === customer.id ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50'}`}>{customer.name}{customer.owner_name && <span className="ml-2 text-xs text-slate-400">· {customer.owner_name}</span>}</button>)}</div>}
          {!loading && search.trim().length >= 2 && customers.length === 0 && <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm"><span className="text-slate-500">Customer tidak ditemukan.</span>{canCreateCustomer && <button type="button" onClick={() => { setCreateForm(form => ({ ...form, name: search.trim() })); setCreateError(''); setCreatingCustomer(true); }} className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:text-teal-800"><Plus className="h-4 w-4" /> Buat customer</button>}</div>}
          {canAssignCustomerOwner && <div className="mt-3"><label htmlFor="zoom-customer-owner" className="mb-1 block text-xs font-semibold text-slate-700">Pemilik data customer (Sales/Presales) <span className="text-rose-600">*</span></label><select id="zoom-customer-owner" value={customerOwnerId} onChange={event => setCustomerOwnerId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"><option value="">Pilih Sales/Presales</option>{salesUsers.map(user => <option key={user.id} value={user.id}>{user.name}{user.email ? ` · ${user.email}` : ''}</option>)}</select><p className="mt-1 text-xs text-slate-500">Customer akan muncul pada akses data Sales/Presales yang dipilih.</p></div>}
          {creatingCustomer && <form onSubmit={createCustomer} className="mt-3 space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3"><div className="text-sm font-semibold text-slate-800">Customer baru</div><div><label htmlFor="zoom-new-customer-name" className="mb-1 block text-xs font-medium text-slate-600">Nama perusahaan <span className="text-rose-600">*</span></label><input id="zoom-new-customer-name" required maxLength={255} value={createForm.name} onChange={event => setCreateForm(form => ({ ...form, name: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500" /></div><div><label htmlFor="zoom-new-customer-address" className="mb-1 block text-xs font-medium text-slate-600">Alamat <span className="font-normal text-slate-400">(opsional)</span></label><input id="zoom-new-customer-address" value={createForm.address} onChange={event => setCreateForm(form => ({ ...form, address: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500" /></div><div className="grid gap-3 sm:grid-cols-3"><div><label htmlFor="zoom-new-customer-pic" className="mb-1 block text-xs font-medium text-slate-600">Nama PIC (opsional)</label><input id="zoom-new-customer-pic" value={createForm.picName} onChange={event => setCreateForm(form => ({ ...form, picName: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500" /></div><div><label htmlFor="zoom-new-customer-email" className="mb-1 block text-xs font-medium text-slate-600">Email PIC</label><input id="zoom-new-customer-email" type="email" value={createForm.picEmail} onChange={event => setCreateForm(form => ({ ...form, picEmail: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500" /></div><div><label htmlFor="zoom-new-customer-phone" className="mb-1 block text-xs font-medium text-slate-600">Telepon PIC</label><input id="zoom-new-customer-phone" value={createForm.picPhone} onChange={event => setCreateForm(form => ({ ...form, picPhone: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500" /></div></div>{createError && <div className="text-xs font-medium text-rose-700">{createError}</div>}<div className="flex justify-end gap-2"><button type="button" disabled={createLoading} onClick={() => setCreatingCustomer(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Batal</button><button type="submit" disabled={createLoading || !createForm.name.trim() || (canAssignCustomerOwner && !customerOwnerId)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Buat dan pilih</button></div></form>}
        </div>
        <div><label htmlFor="zoom-sales-pic" className="mb-2 block text-sm font-semibold text-slate-700">Sales PIC renewal <span className="font-normal text-slate-400">(opsional)</span></label><select id="zoom-sales-pic" value={salesPicId} onChange={event => setSalesPicId(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"><option value="">Belum ditentukan — reminder tidak dikirim</option>{salesUsers.map(user => <option key={user.id} value={user.id}>{user.name}{user.email ? ` · ${user.email}` : ''}</option>)}</select><p className="mt-1 text-xs text-slate-500">PIC ini akan menjadi penerima reminder renewal Zoom.</p></div>
        {selected && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Konfirmasi:</strong> kaitkan sub-account ini dengan customer <strong>{selected.name}</strong>?</div>}
      </div>
      <div className="flex flex-col-reverse justify-between gap-2 border-t border-slate-100 p-5 sm:flex-row">
        {account.customer ? <button type="button" disabled={saving} onClick={() => save(null, true)} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Unlink className="h-4 w-4" /> Lepas kaitan</button> : <span />}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Batal</button><button type="button" disabled={!selected || saving || (canAssignCustomerOwner && !customerOwnerId)} onClick={() => save(selected)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Konfirmasi kaitkan</button></div>
      </div>
    </div>
  </div>;
}

export default function SubAccountList({ subAccounts, syncRuns = [], summary = {}, filters = {}, zoomConfigured = false, canSync = false, canMatchCustomers = false, canCreateCustomer = false, canAssignCustomerOwner = false, currentUserId = '', isSalesLogin = false, canViewDetails = false, salesUsers = [] }) {
  const [search, setSearch] = useState(filters.search || '');
  const [match, setMatch] = useState(filters.match || 'all');
  const [presence, setPresence] = useState(filters.presence || 'present');
  const [expiry, setExpiry] = useState(filters.expiry || 'all');
  const [syncing, setSyncing] = useState(false);
  const [refreshingAccountId, setRefreshingAccountId] = useState(null);
  const [detailRefreshNotice, setDetailRefreshNotice] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [exportProgress, setExportProgress] = useState(null);

  const applyFilters = event => {
    event.preventDefault();
    router.get(route('zoom.sub-accounts.index'), { search: search || undefined, match: match !== 'all' ? match : undefined, presence: presence !== 'present' ? presence : undefined, expiry: expiry !== 'all' ? expiry : undefined }, { preserveState: true, preserveScroll: true });
  };
  const filterByExpiry = value => {
    setExpiry(value);
    router.get(route('zoom.sub-accounts.index'), { search: search || undefined, match: match !== 'all' ? match : undefined, presence: presence !== 'present' ? presence : undefined, expiry: value !== 'all' ? value : undefined }, { preserveState: true, preserveScroll: true });
  };
  const resetAllFilters = () => {
    setSearch('');
    setMatch('all');
    setPresence('present');
    setExpiry('all');
    router.get(route('zoom.sub-accounts.index'), {}, { preserveState: true, preserveScroll: true });
  };
  const exportUrl = format => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (match !== 'all') params.set('match', match);
    if (presence !== 'present') params.set('presence', presence);
    if (expiry !== 'all') params.set('expiry', expiry);
    const query = params.toString();
    return `${route(`zoom.sub-accounts.export.${format}`)}${query ? `?${query}` : ''}`;
  };
  const startExport = async format => {
    const requestFilters = {
      search: search.trim() || undefined,
      match: match !== 'all' ? match : undefined,
      presence: presence !== 'present' ? presence : undefined,
      expiry: expiry !== 'all' ? expiry : undefined,
    };
    setExporting(format);
    setExportProgress({ total: 0, completed: 0, failed: 0 });
    try {
      const { data } = await axios.post(route('zoom.sub-accounts.export.prepare'), requestFilters);
      const missingIds = data.missing_ids || [];
      setExportProgress({ total: missingIds.length, completed: 0, failed: 0 });
      let completed = 0;
      let failed = 0;
      for (let index = 0; index < missingIds.length; index += 10) {
        const batch = missingIds.slice(index, index + 10);
        const response = await axios.post(route('zoom.sub-accounts.export.prepare'), { ...requestFilters, account_ids: batch });
        completed += response.data.fetched || 0;
        failed += response.data.failed || 0;
        setExportProgress({ total: missingIds.length, completed: Math.min(index + batch.length, missingIds.length), failed });
      }
      if (failed > 0 && !window.confirm(`${failed} detail akun tidak berhasil diambil dari Zoom. Cache yang berhasil diperbarui. Tetap buat laporan dengan detail yang tidak tersedia ditandai?`)) return;
      setExportProgress({ total: missingIds.length, completed: missingIds.length, failed, generating: true });
      window.location.assign(exportUrl(format));
    } catch (error) {
      window.alert(error.response?.data?.message || 'Pengecekan detail atau pembuatan laporan gagal. Silakan coba lagi.');
    } finally {
      setExporting(null);
      setExportProgress(null);
    }
  };
  const sync = () => {
    setSyncing(true);
    router.post(route('zoom.sub-accounts.sync'), {}, { preserveScroll: true, onFinish: () => setSyncing(false) });
  };
  const refreshAccountDetails = async account => {
    setRefreshingAccountId(account.zoom_account_id);
    setDetailRefreshNotice(null);
    try {
      const { data } = await axios.post(route('zoom.sub-accounts.details.refresh', account.zoom_account_id));
      setDetailRefreshNotice({ type: 'success', message: `${data.message} ${account.account_name || account.account_number} · ${data.account?.account_type || 'Tipe akun tidak dikirim Zoom.'}` });
      router.reload({ only: ['subAccounts'], preserveScroll: true });
    } catch (error) {
      setDetailRefreshNotice({ type: 'error', message: error.response?.data?.message || 'Detail akun gagal diperbarui. Coba lagi beberapa saat.' });
    } finally {
      setRefreshingAccountId(null);
    }
  };

  return <AuthenticatedLayout>
    <Head title="Zoom Sub Account List" />
    <div className="w-full space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Video className="h-5 w-5" /></div><h1 className="text-2xl font-bold text-slate-900">Sub Account List</h1></div><p className="mt-2 text-sm text-slate-500">Daftar akun Zoom dari sinkronisasi Server-to-Server. Kaitan ke customer selalu memerlukan konfirmasi.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewDetails && <>
            <button type="button" disabled={!!exporting} onClick={() => startExport('excel')} title="Periksa dan cache detail akun sebelum membuat laporan Excel" className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" /> {exporting === 'excel' ? 'Memeriksa…' : 'Excel'}</button>
            <button type="button" disabled={!!exporting} onClick={() => startExport('pdf')} title="Periksa dan cache detail akun sebelum membuat laporan PDF" className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><FileText className="h-4 w-4" /> {exporting === 'pdf' ? 'Memeriksa…' : 'PDF'}</button>
          </>}
          {canSync ? <button type="button" disabled={!zoomConfigured || syncing} onClick={sync} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sinkronkan sekarang</button> : <span className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-500">Akses sinkronisasi tidak diberikan</span>}
        </div>
      </div>

      {detailRefreshNotice && <div className={`rounded-xl border px-4 py-3 text-sm ${detailRefreshNotice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status" aria-live="polite">{detailRefreshNotice.message}</div>}

      {exporting && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status" aria-live="polite">
        <div className="flex items-center gap-2 font-semibold"><Loader2 className="h-4 w-4 animate-spin" />{exportProgress?.generating ? 'Detail sudah diperiksa. Laporan sedang dibuat…' : exportProgress?.total ? `Memeriksa detail akun Zoom: ${exportProgress.completed} dari ${exportProgress.total}` : 'Memeriksa cache detail akun Zoom…'}</div>
        {exportProgress?.failed > 0 && <p className="mt-1 text-xs">{exportProgress.failed} akun belum berhasil diambil detailnya.</p>}
      </div>}

      {!zoomConfigured && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="h-5 w-5 shrink-0" /><div>Kredensial Zoom Server-to-Server belum lengkap. Sinkronisasi belum dapat dijalankan.</div></div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Akun Zoom', summary.total ?? 0, Video, 'text-blue-600'],
          ['Sudah dikaitkan', summary.matched ?? 0, Link2, 'text-emerald-600'],
          ['Perlu ditinjau', summary.unmatched ?? 0, Users, 'text-amber-600'],
          ['Sinkronisasi terakhir', timestamp(summary.last_sync_at), Clock3, 'text-slate-600'],
        ].map(([label, value, Icon, color]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-sm text-slate-500"><span>{label}</span><Icon className={`h-4 w-4 ${color}`} /></div><div className="mt-2 text-xl font-bold text-slate-900">{value}</div></div>)}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filter masa renewal dan data akun">
        <button type="button" onClick={resetAllFilters} className={`rounded-xl border border-slate-200 bg-white p-4 text-left text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow ${expiry === 'all' && !filters.search && filters.match === 'all' && filters.presence === 'present' ? 'ring-2 ring-teal-500 ring-offset-1' : ''}`}><div className="text-sm font-semibold">Semua Data</div><div className="mt-1 text-2xl font-bold">{summary.total ?? 0}</div><div className="mt-1 text-[11px] text-slate-500">Hapus semua filter · urutan default</div></button>
        {[
          ['0-30', '1 Bulan', '0–30 hari', summary.expiring_30 ?? 0, 'bg-amber-50 text-amber-800 border-amber-200'],
          ['31-60', '2 Bulan', '31–60 hari', summary.expiring_60 ?? 0, 'bg-orange-50 text-orange-800 border-orange-200'],
          ['61-90', '3 Bulan', '61–90 hari', summary.expiring_90 ?? 0, 'bg-rose-50 text-rose-800 border-rose-200'],
        ].map(([value, label, range, count, color]) => <button key={value} type="button" onClick={() => filterByExpiry(value)} className={`rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow ${color} ${expiry === value ? 'ring-2 ring-teal-500 ring-offset-1' : ''}`}><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{label}</span><span className="text-[11px] opacity-75">{range}</span></div><div className="mt-1 text-2xl font-bold">{count}</div><div className="mt-1 text-[11px] opacity-80">Klik untuk melihat akun</div></button>)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={applyFilters} className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama, ID, nomor akun, email, atau customer" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
          <select value={match} onChange={event => setMatch(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="all">Semua kaitan</option><option value="unmatched">Belum dikaitkan</option><option value="matched">Sudah dikaitkan</option></select>
          <select value={presence} onChange={event => setPresence(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="present">Terlihat di Zoom</option><option value="missing">Tidak terlihat di sync terakhir</option><option value="all">Semua status</option></select>
          <select aria-label="Filter masa renewal" value={expiry} onChange={event => setExpiry(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="all">Semua masa renewal</option><option value="expired">Sudah lewat</option><option value="0-30">1 Bulan (0–30 hari)</option><option value="31-60">2 Bulan (31–60 hari)</option><option value="61-90">3 Bulan (61–90 hari)</option></select>
          <button type="submit" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Terapkan</button>
        </form>
        <div className="overflow-x-auto"><table className="w-full min-w-[1150px] table-fixed text-left text-sm">
          <colgroup><col className="w-[220px]" /><col className="w-[170px]" /><col className="w-[105px]" /><col className="w-[175px]" /><col className="w-[275px]" /><col className="w-[125px]" /><col className="w-[80px]" /></colgroup>
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3.5">Zoom Account</th><th className="px-3 py-3.5">Account Owner</th><th className="px-3 py-3.5">Paket</th><th className="px-3 py-3.5">Masa Aktif</th><th className="px-3 py-3.5">Customer QSales / Sales PIC</th><th className="px-3 py-3.5">Sinkronisasi</th><th className="px-3 py-3.5 text-center">Aksi</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {subAccounts?.data?.length ? subAccounts.data.map(account => <tr key={account.id} className="align-top transition-colors hover:bg-slate-50/70">
              <td className="px-3 py-3.5">{canViewDetails ? <Link href={route('zoom.sub-accounts.show', account.zoom_account_id)} className="line-clamp-2 font-semibold leading-5 text-blue-700 hover:underline" title={account.account_name || 'Tanpa nama'}>{account.account_name || 'Tanpa nama'}</Link> : <div className="line-clamp-2 font-semibold leading-5 text-slate-800">{account.account_name || 'Tanpa nama'}</div>}<div className="mt-1.5 flex items-center gap-1.5 text-xs"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">ZAN</span>{canViewDetails ? <Link href={route('zoom.sub-accounts.show', account.zoom_account_id)} className="font-medium text-slate-700 hover:text-blue-700 hover:underline">{account.account_number || '—'}</Link> : <span className="font-medium text-slate-700">{account.account_number || '—'}</span>}</div></td>
              <td className="px-3 py-3.5"><div className="truncate text-xs text-slate-700" title={account.owner_email || ''}>{account.owner_email || '—'}</div><div className="mt-1.5 text-[10px] text-slate-400">Dibuat {date(account.zoom_created_at)}</div></td>
              <td className="px-3 py-3.5"><div className="font-semibold text-slate-700">{account.account_type || '—'}</div><span className="mt-1.5 inline-flex whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">{account.seats ?? '—'} license{account.seats === 1 ? '' : 's'}</span>{(account.bulk_license || account.is_sub_reseller) && <div className="mt-1 truncate text-[10px] text-slate-500" title={[account.bulk_license ? 'Bulk license' : '', account.is_sub_reseller ? 'Reseller' : ''].filter(Boolean).join(' · ')}>{[account.bulk_license ? 'Bulk license' : '', account.is_sub_reseller ? 'Reseller' : ''].filter(Boolean).join(' · ')}</div>}</td>
              <td className="px-3 py-3.5"><div className="space-y-2 text-xs"><div><div className="text-[10px] uppercase tracking-wide text-slate-400">Mulai layanan</div><div className="mt-0.5 whitespace-nowrap font-medium text-slate-700">{date(account.subscription_start_time)}</div></div><div><div className="text-[10px] uppercase tracking-wide text-slate-400">Renewal</div><div className="mt-0.5 whitespace-nowrap font-medium text-amber-700">{date(account.subscription_end_time)}</div></div></div></td>
              <td className="px-3 py-3.5">{account.customer ? <><div className="truncate font-semibold text-slate-800" title={account.customer.name}>{account.customer.name}</div><div className="mt-1 truncate text-[10px] text-emerald-700" title={account.matcher?.name ? `Sales terkait: ${account.matcher.name}` : 'Kaitan customer dikonfirmasi'}><CheckCircle2 className="mr-1 inline h-3 w-3" />Terkait{account.matcher?.name ? ` · ${account.matcher.name}` : ''}</div></> : <div><div className="text-xs font-medium text-amber-700">Belum ditautkan</div>{canMatchCustomers && account.suggestions?.[0] && <button type="button" onClick={() => setSelectedAccount({ ...account, initialSuggestion: account.suggestions[0] })} title={`${account.suggestions[0].name} · ${account.suggestions[0].score}% cocok`} className="mt-1 block max-w-full truncate text-left text-[10px] text-blue-700 hover:underline">Saran: {account.suggestions[0].name} <span className="font-semibold">{account.suggestions[0].score}%</span></button>}</div>}{account.sales_pic ? <div className="mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-md bg-teal-50 px-2 py-1 text-[10px] text-teal-800" title={`Sales PIC renewal: ${account.sales_pic.name}`}><Users className="h-3 w-3 shrink-0" />PIC: {account.sales_pic.name}</div> : <div className="mt-2 truncate text-[10px] text-amber-700" title="Reminder renewal tidak dikirim tanpa Sales PIC">PIC belum ditentukan · tanpa reminder</div>}</td>
              <td className="px-3 py-3.5">{account.is_present ? <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Aktif</span> : <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"><AlertCircle className="h-3 w-3" /> Hilang</span>}<div className="mt-2 text-[10px] leading-4 text-slate-400" title={`Terakhir terlihat: ${timestamp(account.last_seen_at)}`}>{timestamp(account.last_seen_at)}</div></td>
              <td className="px-3 py-3.5"><div className="flex justify-center gap-1.5">{canViewDetails && <><Link href={route('zoom.sub-accounts.show', account.zoom_account_id)} title="Lihat detail plan" aria-label={`Lihat detail plan ${account.account_name || account.zoom_account_id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Eye className="h-4 w-4" /></Link><button type="button" onClick={() => refreshAccountDetails(account)} disabled={!!refreshingAccountId} title="Perbarui detail akun dari Zoom" aria-label={`Perbarui detail akun ${account.account_name || account.zoom_account_id} dari Zoom`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-wait disabled:opacity-50">{refreshingAccountId === account.zoom_account_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button></>}{canMatchCustomers && <button type="button" onClick={() => setSelectedAccount(account)} title={account.customer ? 'Ubah customer dan Sales PIC' : 'Tinjau saran dan tautkan customer'} aria-label={account.customer ? `Ubah kaitan ${account.account_name || account.zoom_account_id}` : `Tautkan customer ${account.account_name || account.zoom_account_id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"><Link2 className="h-4 w-4" /></button>}</div></td>
            </tr>) : <tr><td colSpan={8} className="px-4 py-14 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-slate-300" /><div className="mt-2 font-medium text-slate-700">Belum ada data sub-account</div><div className="mt-1 text-sm text-slate-400">Jalankan sinkronisasi Zoom untuk mengambil daftar akun.</div></td></tr>}
          </tbody>
        </table></div>
        {subAccounts?.links?.length > 3 && <div className="flex flex-wrap justify-end gap-1 border-t border-slate-100 p-3">{subAccounts.links.map((link, index) => <button key={index} type="button" disabled={!link.url} onClick={() => link.url && router.visit(link.url, { preserveScroll: true })} dangerouslySetInnerHTML={{ __html: link.label }} className={`rounded-lg px-3 py-1.5 text-xs ${link.active ? 'bg-teal-600 text-white' : 'border border-slate-200 text-slate-600'} disabled:opacity-40`} />)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-slate-500" /><h2 className="font-bold text-slate-900">Monitor Sinkronisasi</h2></div><p className="mt-1 text-sm text-slate-500">Riwayat proses sinkronisasi manual dan hasil pembaruan data.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase text-slate-400"><tr><th className="py-2">Waktu</th><th className="py-2">Pemicu</th><th className="py-2">Status</th><th className="py-2">Hasil</th><th className="py-2">Keterangan</th></tr></thead><tbody className="divide-y divide-slate-100">{syncRuns.length ? syncRuns.map(run => <tr key={run.id}><td className="py-3 text-slate-600">{timestamp(run.started_at)}</td><td className="py-3 text-slate-600">{run.triggered_by?.name || 'Sistem'}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${run.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : run.status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{run.status}</span></td><td className="py-3 text-xs text-slate-600">{run.status === 'completed' ? `${run.accounts_seen} dilihat · ${run.accounts_added} baru · ${run.accounts_updated} diperbarui · ${run.accounts_unchanged} tetap` : '—'}</td><td className="max-w-xs py-3 text-xs text-slate-500">{run.error_message || `${run.pages_fetched} halaman Zoom`}</td></tr>) : <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">Belum ada riwayat sinkronisasi.</td></tr>}</tbody></table></div>
      </section>
    </div>
    {selectedAccount && <MatchModal account={selectedAccount} salesUsers={salesUsers} canCreateCustomer={canCreateCustomer} canAssignCustomerOwner={canAssignCustomerOwner} isSalesLogin={isSalesLogin} currentUserId={currentUserId} onClose={() => setSelectedAccount(null)} />}
  </AuthenticatedLayout>;
}
