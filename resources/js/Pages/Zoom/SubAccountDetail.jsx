import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ArrowLeft, Building2, CreditCard, FileText, Info, RefreshCw, Video } from 'lucide-react';

const date = value => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const datetime = value => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const title = value => String(value || '').replace(/^plan[_-]?/i, '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const planTypeLabel = value => {
  const knownTypes = {
    zoe_yearly: 'Zoom Workplace Enterprise · Tahunan',
    large1000_yearly: 'Large Meeting · 1.000 peserta · Tahunan',
    phone_payongo: 'Zoom Phone · Pay As You Go',
  };
  if (!value) return '—';
  if (knownTypes[value]) return knownTypes[value];
  if (String(value).toLowerCase() === 'yearly') return 'Tahunan';
  if (String(value).toLowerCase() === 'monthly') return 'Bulanan';
  if (String(value).toLowerCase() === 'quarterly') return 'Triwulanan';

  return String(value)
    .replace(/_yearly$/i, ' · Tahunan')
    .replace(/_monthly$/i, ' · Bulanan')
    .replace(/_quarterly$/i, ' · Triwulanan')
    .replace(/_payongo$/i, ' · Pay As You Go')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

function rowsForPlans(payload) {
  const rows = [];
  const visit = (value, name) => {
    if (Array.isArray(value)) {
      value.forEach(item => visit(item, name));
    } else if (value && typeof value === 'object') {
      if (value.status || value.type || value.plan_name || value.hosts || value.quantity || value.pending !== undefined) {
        rows.push({
          name: value.plan_name || title(name),
          type: planTypeLabel(value.type || value.plan_type),
          quantity: value.quantity ?? value.hosts ?? value.seats ?? '—',
          pending: value.pending ?? 0,
          usage: value.usage ?? '—',
          status: value.status || '—',
          billingPeriod: value.billing_period || value.billing_cycle || value.billing_frequency || '—',
          effective: value.service_effective_date || value.service_start_date,
          nextInvoice: value.next_invoice_date,
          subscription: value.zr_sub_refer_id,
        });
      }
      Object.entries(value).forEach(([key, child]) => {
        if (child && typeof child === 'object') visit(child, key);
      });
    }
  };
  if (payload && typeof payload === 'object') Object.entries(payload).forEach(([key, value]) => visit(value, key));
  return rows;
}

function DataState({ result }) {
  if (result?.available) return null;
  return <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><Info className="h-5 w-5 shrink-0" /><div>{result?.message || 'Data dari Zoom tidak tersedia.'}<div className="mt-1 text-xs text-amber-800">Periksa scope API Server-to-Server, izin master account, dan apakah akun memenuhi syarat endpoint Zoom.</div></div></div>;
}

function KeyValue({ label, value }) {
  return <div className="border-b border-slate-100 py-3 last:border-0"><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || '—'}</dd></div>;
}

function PlanTable({ result, pending = false }) {
  if (!result?.available) return <DataState result={result} />;
  const rows = rowsForPlans(result.data);
  const filtered = pending
    ? rows.filter(row => Number(row.pending) > 0 || ['pending', 'scheduled', 'upcoming'].includes(String(row.status).toLowerCase()))
    : rows.filter(row => String(row.status).toLowerCase() === 'active');
  return <>
    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Detail disimpan di QSales setelah berhasil dibaca dari Zoom. Tab Pending menampilkan jumlah lisensi pending dari API; permintaan aktivasi/pembatalan pending di portal mungkin tidak tersedia melalui API.</div>
    {filtered.length ? <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Seats (License)</th>{pending ? <><th className="px-4 py-3">Lisensi Pending</th><th className="px-4 py-3">Penggunaan</th></> : <><th className="px-4 py-3">Jenis / Siklus</th><th className="px-4 py-3">Periode Billing</th><th className="px-4 py-3">Tanggal Efektif</th><th className="px-4 py-3">Invoice Berikutnya</th><th className="px-4 py-3">Status</th></>}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row, index) => <tr key={`${row.name}-${index}`}><td className="px-4 py-3 font-medium text-slate-800">{row.name}</td><td className="px-4 py-3">{row.quantity}</td>{pending ? <><td className="px-4 py-3">{row.pending}</td><td className="px-4 py-3">{row.usage}</td></> : <><td className="px-4 py-3">{row.type}</td><td className="px-4 py-3">{row.billingPeriod}</td><td className="px-4 py-3">{date(row.effective)}</td><td className="px-4 py-3">{date(row.nextInvoice)}</td><td className="px-4 py-3 capitalize">{row.status}</td></>}</tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{pending ? 'Zoom tidak mengembalikan lisensi berstatus pending.' : 'Belum ada plan aktif yang dikembalikan Zoom.'}</div>}
  </>;
}

export default function SubAccountDetail({ account, tab = 'account', details, plans, billing, canViewBilling = false }) {
  const tabs = [
    ['account', 'Account Details', Video],
    ['current-plans', 'Current Plans', CreditCard],
    ['pending-plans', 'Pending Plans', FileText],
    ...(canViewBilling ? [['billing', 'Billing Information', Building2]] : []),
  ];
  const detail = details?.data || {};
  const options = detail.options || {};
  const billingData = billing?.data || {};
  const activeResult = tab === 'account' ? details : tab === 'billing' ? billing : plans;
  const refreshHref = `${route('zoom.sub-accounts.show', account.zoom_account_id)}?tab=${tab}&refresh=1`;

  return <AuthenticatedLayout>
    <Head title={`${account.account_name || 'Zoom Sub Account'} · Zoom`} />
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <Link href={route('zoom.sub-accounts.index')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-700"><ArrowLeft className="h-4 w-4" /> Kembali ke Sub Account List</Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Video className="h-6 w-6" /></div><div><h1 className="text-2xl font-bold text-slate-900">{account.account_name || 'Tanpa nama'}</h1><p className="mt-1 text-sm text-slate-500">Sub Account Zoom</p></div></div></div>
          <div className="grid gap-3 text-sm sm:grid-cols-2"><div><div className="text-xs text-slate-400">Account Number</div><div className="font-semibold text-slate-800">{account.account_number || '—'}</div></div><div><div className="text-xs text-slate-400">Creation Time</div><div className="font-semibold text-slate-800">{datetime(account.zoom_created_at)}</div></div></div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Detail sub-account">
        {tabs.map(([key, label, Icon]) => <Link key={key} href={`${route('zoom.sub-accounts.show', account.zoom_account_id)}?tab=${key}`} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon className="h-4 w-4" />{label}</Link>)}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>{activeResult?.fetched_at ? `Disimpan ${datetime(activeResult.fetched_at)}${activeResult.cached ? ' · dari cache lokal' : ' · baru diperbarui'}` : 'Belum tersimpan di QSales'}</span>
        <Link href={refreshHref} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"><RefreshCw className="h-3.5 w-3.5" /> Perbarui dari Zoom</Link>
      </div>
      {activeResult?.refresh_error && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Pembaruan Zoom gagal; data cache sebelumnya tetap ditampilkan. {activeResult.refresh_error}</div>}

      {tab === 'account' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!details?.available ? <DataState result={details} /> : <div className="grid gap-x-8 md:grid-cols-2"><dl><KeyValue label="Account Name" value={detail.account_name || account.account_name} /><KeyValue label="Account Number" value={detail.account_number || account.account_number} /><KeyValue label="Account Type" value={detail.account_type || account.account_type} /><KeyValue label="Account Owner" value={detail.owner_email || account.owner_email} /><KeyValue label="Who will pay" value={options.pay_mode === 'master' ? 'Master account holder' : options.pay_mode === 'sub' ? 'Sub-account holder' : 'Tidak tersedia'} /><KeyValue label="Seats (License)" value={detail.seats ?? account.seats} /></dl><dl><KeyValue label="Creation Time" value={datetime(detail.created_at || account.zoom_created_at)} /><KeyValue label="Service Effective Date" value={date(detail.subscription_start_time || account.subscription_start_time)} /><KeyValue label="Subscription End" value={date(detail.subscription_end_time || account.subscription_end_time)} /><KeyValue label="Auto Renew" value={options.billing_auto_renew === true ? 'Ya' : options.billing_auto_renew === false ? 'Tidak' : '—'} /><KeyValue label="RPS Status" value="Tidak disediakan pada respons API akun yang tersedia" /><KeyValue label="Customer QSales" value={account.customer?.name} /><KeyValue label="Sales PIC Renewal" value={account.sales_pic?.name ? `${account.sales_pic.name}${account.sales_pic.email ? ` (${account.sales_pic.email})` : ''}` : 'Belum ditentukan — reminder tidak dikirim'} /></dl></div>}
      </section>}

      {(tab === 'current-plans' || tab === 'pending-plans') && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-lg font-bold text-slate-900">{tab === 'current-plans' ? 'Current Plans' : 'Pending Plans'}</h2><p className="mt-1 text-sm text-slate-500">Plan dan jadwal billing yang disediakan oleh Zoom.</p></div><PlanTable result={plans} pending={tab === 'pending-plans'} /></section>}

      {tab === 'billing' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-lg font-bold text-slate-900">Billing Information</h2><p className="mt-1 text-sm text-slate-500">Informasi billing read-only dari Zoom. Data kontak hanya ditampilkan untuk role yang memiliki permission billing.</p></div>{!billing?.available ? <DataState result={billing} /> : <div className="grid gap-x-8 md:grid-cols-2"><dl><KeyValue label="Nama Kontak" value={[billingData.first_name, billingData.last_name].filter(Boolean).join(' ')} /><KeyValue label="Email" value={billingData.email} /><KeyValue label="Nomor Telepon" value={billingData.phone_number} /><KeyValue label="Jumlah Karyawan" value={billingData.employee_count} /></dl><dl><KeyValue label="Alamat" value={[billingData.address, billingData.apt, billingData.city, billingData.state, billingData.zip, billingData.country].filter(Boolean).join(', ')} /></dl></div>}</section>}
    </div>
  </AuthenticatedLayout>;
}
