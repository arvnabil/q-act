import React, { useEffect, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AlertCircle, CheckCircle2, Clock3, Link2, Loader2, RefreshCw, Search, ShieldCheck, Unlink, Users, Video, X } from 'lucide-react';

const date = value => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const timestamp = value => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah';

function MatchModal({ account, onClose }) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(account.initialSuggestion || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const save = customer => {
    setSaving(true);
    router.put(route('zoom.sub-accounts.customer.update', account.zoom_account_id), { customer_id: customer?.id ?? null }, {
      preserveScroll: true,
      onFinish: () => setSaving(false),
      onSuccess: onClose,
    });
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="match-title">
    <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 p-5">
        <div><h2 id="match-title" className="text-lg font-bold text-slate-900">Tinjau kaitan customer</h2><p className="mt-1 text-sm text-slate-500">Saran hanya rekomendasi. Customer baru dikaitkan setelah Anda mengonfirmasi.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Tutup"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Zoom Sub Account</div><div className="mt-1 font-semibold text-slate-800">{account.account_name || 'Tanpa nama'}</div><div className="mt-1 text-xs text-slate-500">ID: {account.zoom_account_id}</div></div>
        {account.suggestions?.length > 0 && <div><div className="mb-2 text-sm font-semibold text-slate-700">Saran berdasarkan kemiripan nama</div><div className="space-y-2">{account.suggestions.map(candidate => <button key={candidate.id} type="button" onClick={() => setSelected(candidate)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${selected?.id === candidate.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'}`}><span className="font-medium text-slate-800">{candidate.name}</span><span className="text-xs text-slate-500">{candidate.score}% cocok</span></button>)}</div></div>}
        <div><label htmlFor="customer-search" className="mb-2 block text-sm font-semibold text-slate-700">Cari customer lain</label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="customer-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ketik minimal 2 karakter nama customer" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></div>
          {loading && <div className="mt-2 text-xs text-slate-400">Mencari customer…</div>}
          {customers.length > 0 && <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200">{customers.map(customer => <button type="button" key={customer.id} onClick={() => setSelected(customer)} className={`block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0 ${selected?.id === customer.id ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50'}`}>{customer.name}</button>)}</div>}
        </div>
        {selected && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Konfirmasi:</strong> kaitkan sub-account ini dengan customer <strong>{selected.name}</strong>?</div>}
      </div>
      <div className="flex flex-col-reverse justify-between gap-2 border-t border-slate-100 p-5 sm:flex-row">
        {account.customer ? <button type="button" disabled={saving} onClick={() => save(null)} className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Unlink className="h-4 w-4" /> Lepas kaitan</button> : <span />}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Batal</button><button type="button" disabled={!selected || saving} onClick={() => save(selected)} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Konfirmasi kaitkan</button></div>
      </div>
    </div>
  </div>;
}

export default function SubAccountList({ subAccounts, syncRuns = [], summary = {}, filters = {}, zoomConfigured = false, canSync = false, canMatchCustomers = false, canViewDetails = false }) {
  const [search, setSearch] = useState(filters.search || '');
  const [match, setMatch] = useState(filters.match || 'all');
  const [presence, setPresence] = useState(filters.presence || 'present');
  const [syncing, setSyncing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const applyFilters = event => {
    event.preventDefault();
    router.get(route('zoom.sub-accounts.index'), { search: search || undefined, match: match !== 'all' ? match : undefined, presence: presence !== 'present' ? presence : undefined }, { preserveState: true, preserveScroll: true });
  };
  const sync = () => {
    setSyncing(true);
    router.post(route('zoom.sub-accounts.sync'), {}, { preserveScroll: true, onFinish: () => setSyncing(false) });
  };

  return <AuthenticatedLayout>
    <Head title="Zoom Sub Account List" />
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><div className="flex items-center gap-2"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><Video className="h-5 w-5" /></div><h1 className="text-2xl font-bold text-slate-900">Sub Account List</h1></div><p className="mt-2 text-sm text-slate-500">Daftar akun Zoom dari sinkronisasi Server-to-Server. Kaitan ke customer selalu memerlukan konfirmasi.</p></div>
        {canSync ? <button type="button" disabled={!zoomConfigured || syncing} onClick={sync} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sinkronkan sekarang</button> : <span className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-500">Akses sinkronisasi tidak diberikan</span>}
      </div>

      {!zoomConfigured && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="h-5 w-5 shrink-0" /><div>Kredensial Zoom Server-to-Server belum lengkap. Sinkronisasi belum dapat dijalankan.</div></div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Akun Zoom', summary.total ?? 0, Video, 'text-blue-600'],
          ['Sudah dikaitkan', summary.matched ?? 0, Link2, 'text-emerald-600'],
          ['Perlu ditinjau', summary.unmatched ?? 0, Users, 'text-amber-600'],
          ['Sinkronisasi terakhir', timestamp(summary.last_sync_at), Clock3, 'text-slate-600'],
        ].map(([label, value, Icon, color]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-sm text-slate-500"><span>{label}</span><Icon className={`h-4 w-4 ${color}`} /></div><div className="mt-2 text-xl font-bold text-slate-900">{value}</div></div>)}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form onSubmit={applyFilters} className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari nama, ID, nomor akun, email, atau customer" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500" /></div>
          <select value={match} onChange={event => setMatch(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="all">Semua kaitan</option><option value="unmatched">Belum dikaitkan</option><option value="matched">Sudah dikaitkan</option></select>
          <select value={presence} onChange={event => setPresence(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="present">Terlihat di Zoom</option><option value="missing">Tidak terlihat di sync terakhir</option><option value="all">Semua status</option></select>
          <button type="submit" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Terapkan</button>
        </form>
        <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Account Name / Number</th><th className="px-4 py-3">Account Owner</th><th className="px-4 py-3">Account Type</th><th className="px-4 py-3">Service Effective Date</th><th className="px-4 py-3">Creation Time</th><th className="px-4 py-3">Customer QSales</th><th className="px-4 py-3">Status Sync</th><th className="px-4 py-3 text-right">Detail</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {subAccounts?.data?.length ? subAccounts.data.map(account => <tr key={account.id} className="align-top hover:bg-slate-50/70">
              <td className="px-4 py-4">{canViewDetails ? <Link href={route('zoom.sub-accounts.show', account.zoom_account_id)} className="font-semibold text-blue-700 hover:underline">{account.account_name || 'Tanpa nama'}</Link> : <div className="font-semibold text-slate-800">{account.account_name || 'Tanpa nama'}</div>}{account.account_number && <div className="mt-1 text-xs text-slate-600">{canViewDetails ? <Link href={route('zoom.sub-accounts.show', account.zoom_account_id)} className="hover:text-blue-700 hover:underline">{account.account_number}</Link> : account.account_number}</div>}<div className="mt-1 text-[11px] text-slate-400">ID {account.zoom_account_id}</div></td>
              <td className="px-4 py-4 text-xs text-slate-600">{account.owner_email || '—'}</td>
              <td className="px-4 py-4 text-slate-600"><div>{account.account_type || '—'}</div><div className="mt-1 text-xs">Seats (License): {account.seats ?? '—'}{account.bulk_license ? ' · Bulk license' : ''}{account.is_sub_reseller ? ' · Reseller' : ''}</div></td>
              <td className="px-4 py-4 text-xs text-slate-600">{date(account.subscription_start_time)}</td>
              <td className="px-4 py-4 text-xs text-slate-600">{timestamp(account.zoom_created_at)}</td>
              <td className="px-4 py-4">{account.customer ? <><div className="font-medium text-slate-800">{account.customer.name}</div><div className="mt-1 text-xs text-emerald-700">Dikonfirmasi{account.matcher?.name ? ` oleh ${account.matcher.name}` : ''}</div></> : <div className="space-y-2"><div className="text-xs text-amber-700">Belum dikaitkan</div>{canMatchCustomers && account.suggestions?.length > 0 && <div className="space-y-1">{account.suggestions.slice(0, 2).map(suggestion => <button key={suggestion.id} type="button" onClick={() => setSelectedAccount({ ...account, initialSuggestion: suggestion })} className="block max-w-[250px] truncate text-left text-xs text-blue-700 hover:underline">Saran: {suggestion.name} · {suggestion.score}%</button>)}</div>}</div>}</td>
              <td className="px-4 py-4">{account.is_present ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Ada</span> : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"><AlertCircle className="h-3.5 w-3.5" /> Tidak terlihat</span>}<div className="mt-1 text-xs text-slate-400">Terakhir terlihat: {timestamp(account.last_seen_at)}</div></td>
              <td className="px-4 py-4 text-right">{canViewDetails ? <Link href={route('zoom.sub-accounts.show', account.zoom_account_id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Lihat Plan</Link> : <span className="text-xs text-slate-400">Tidak ada izin detail</span>}{canMatchCustomers && <button type="button" onClick={() => setSelectedAccount(account)} className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-700"><Link2 className="h-3.5 w-3.5" /> {account.customer ? 'Ubah kaitan' : 'Tinjau & kaitkan'}</button>}</td>
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
    {selectedAccount && <MatchModal account={selectedAccount} onClose={() => setSelectedAccount(null)} />}
  </AuthenticatedLayout>;
}
