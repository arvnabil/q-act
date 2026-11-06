import React, { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import { 
  Search, Eye, Download, Trash2, Loader2, FileText, Users, ShieldCheck, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import Pagination from '@/Components/Pagination';
import JSZip from 'jszip';

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'all',      label: 'Semua'    },
  { key: 'created',  label: 'Created'  },
  { key: 'sent',     label: 'Sent'     },
  { key: 'approved', label: 'PO'       },
  { key: 'rejected', label: 'Rejected' },
  { key: 'expired',  label: 'Expired'  },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'superseded', label: 'Superseded' },
  { key: 'trash',    label: '🗑️ Trash / Terhapus' },
];

const statusClasses = (status) => {
  switch (status) {
    case 'created':
    case 'draft':    return 'bg-surface-100 text-surface-600 border border-surface-200';
    case 'sent':     return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'approved': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'rejected': return 'bg-red-50 text-red-700 border border-red-200';
    case 'expired':  return 'bg-orange-50 text-orange-700 border border-orange-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border border-red-200';
    case 'superseded': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'revision_draft': return 'bg-violet-50 text-violet-700 border border-violet-200';
    case 'deleted':  return 'bg-gray-100 text-gray-500 border border-gray-300';
    default:         return 'bg-surface-100 text-surface-600';
  }
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

const formatDate = (str) => {
  if (!str) return '-';
  try {
    const d = parseISO(str);
    return isValid(d) ? format(d, 'd MMM yyyy', { locale: idLocale }) : str;
  } catch { return str; }
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}[char]));

const reportStatusLabels = {
  created: 'Created',
  draft: 'Draft',
  sent: 'Sent',
  approved: 'PO',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
  revision_draft: 'Revision Draft',
};

const pptxXmlEscape = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const pptxEmu = (inches) => Math.round(inches * 914400);

const pptxRun = (text, { size = 18, color = '172033', bold = false } = {}) =>
  `<a:r><a:rPr lang="id-ID" sz="${size * 100}"${bold ? ' b="1"' : ''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Aptos"/></a:rPr><a:t>${pptxXmlEscape(text)}</a:t></a:r>`;

const pptxTextBox = ({ id, x, y, w, h, text, size = 18, color = '172033', bold = false, align = 'l' }) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${pptxEmu(x)}" y="${pptxEmu(y)}"/><a:ext cx="${pptxEmu(w)}" cy="${pptxEmu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/><a:p><a:pPr algn="${align}"/>${pptxRun(text, { size, color, bold })}<a:endParaRPr lang="id-ID"/></a:p></p:txBody></p:sp>`;

const pptxRect = ({ id, x, y, w, h, fill = 'FFFFFF', line = fill, radius = false }) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${pptxEmu(x)}" y="${pptxEmu(y)}"/><a:ext cx="${pptxEmu(w)}" cy="${pptxEmu(h)}"/></a:xfrm><a:prstGeom prst="${radius ? 'roundRect' : 'rect'}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody></p:sp>`;

const pptxSlide = (content) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${content}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;

export default function Manager({ 
  activeQuotations = [], 
  trashQuotations = [], 
  salesUsers = [], 
  businessUnits = [],
  pendingChangeRequests = []
}) {
  const { auth } = usePage().props;
  const user = auth?.user || {};

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSales, setFilterSales]   = useState('all');
  const [filterBU, setFilterBU]         = useState('all');
  const [search, setSearch]             = useState('');
  const [page, setPage]                 = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedIds, setSelectedIds]   = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const isTrashTab = filterStatus === 'trash';
  const quotations = isTrashTab ? trashQuotations : activeQuotations;

  useEffect(() => { 
    setPage(1);
    setSelectedIds([]);
  }, [search, filterStatus, filterSales, filterBU]);

  const calcGrandTotal = (q) => {
    if (q.grand_total != null && q.grand_total > 0) return q.grand_total;
    return q.items?.reduce((sum, item) => sum + ((item.qty || 0) * (item.price || 0)), 0) || 0;
  };

  const isQuotationInBU = (q, targetBuId) => {
    if (!targetBuId || targetBuId === 'all') return true;
    const targetBu = businessUnits.find(b => b.id === targetBuId);

    if (q.bu_id === targetBuId) return true;

    const creatorId = q.sales_id || q.created_by || q.creator?.id;
    if (targetBu && creatorId && targetBu.members?.some(m => m.user_id === creatorId)) return true;

    if (targetBu?.code) {
      const codeUpper = targetBu.code.toUpperCase();
      if (q.id?.toUpperCase().startsWith(codeUpper + '.') || q.id?.toUpperCase().startsWith(codeUpper)) return true;
    }

    return false;
  };

  const countByStatus = (key) => {
    if (key === 'trash') return trashQuotations.length;
    let base = activeQuotations;
    if (filterSales !== 'all') base = base.filter(q => (q.sales_id || q.created_by) === filterSales);
    if (filterBU !== 'all') base = base.filter(q => isQuotationInBU(q, filterBU));
    return key === 'all' ? base.length : base.filter(q => q.status === key).length;
  };

  const summaryStats = () => {
    let base = activeQuotations;
    if (filterSales !== 'all') base = base.filter(q => (q.sales_id || q.created_by) === filterSales);
    if (filterBU !== 'all') base = base.filter(q => isQuotationInBU(q, filterBU));
    return {
      total:    base.length,
      approved: base.filter(q => q.status === 'approved').length,
      pending:  base.filter(q => q.status === 'sent').length,
      revenue:  base.filter(q => q.status === 'approved').reduce((s, q) => s + calcGrandTotal(q), 0),
    };
  };

  const stats = summaryStats();

  const filtered = quotations?.filter(q => {
    if (!isTrashTab && filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (filterSales !== 'all' && (q.sales_id || q.created_by) !== filterSales) return false;
    if (filterBU !== 'all' && !isQuotationInBU(q, filterBU)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.id?.toLowerCase().includes(s) ||
      q.customer?.name?.toLowerCase().includes(s) ||
      q.creator?.name?.toLowerCase().includes(s)
    );
  }) || [];

  const totalNilaiQuotation = filtered.reduce((sum, q) => sum + calcGrandTotal(q), 0);

  const handleLegacyExportReport = () => {
    const generatedAt = format(new Date(), 'd MMMM yyyy HH:mm', { locale: idLocale });
    const dateStamp = format(new Date(), 'yyyy-MM-dd');
    const statusLabel = STATUS_TABS.find((tab) => tab.key === filterStatus)?.label || 'Semua';
    const salesLabel = filterSales === 'all'
      ? 'Semua sales'
      : salesUsers.find((sales) => String(sales.id) === String(filterSales))?.name || 'Sales terpilih';
    const buLabel = filterBU === 'all'
      ? 'Semua business unit'
      : businessUnits.find((bu) => String(bu.id) === String(filterBU))?.name || 'BU terpilih';
    const poRows = filtered.filter((q) => q.status === 'approved');
    const sentRows = filtered.filter((q) => q.status === 'sent');
    const reportRows = filtered.slice(0, 50);
    const statusRows = STATUS_TABS
      .filter((tab) => !['all', 'trash'].includes(tab.key))
      .map((tab) => `<div class="status-row"><span>${escapeHtml(tab.label)}</span><strong>${countByStatus(tab.key)}</strong></div>`)
      .join('');
    const tableRows = reportRows.length
      ? reportRows.map((q) => `<tr>
          <td>${escapeHtml(q.number || q.quotation_no || q.id || '-')}</td>
          <td>${escapeHtml(q.customer?.name || '-')}</td>
          <td>${escapeHtml(q.sales?.name || q.creator?.name || '-')}</td>
          <td>${escapeHtml(reportStatusLabels[q.status] || q.status || '-')}</td>
          <td>${escapeHtml(formatDate(q.date || q.created_at))}</td>
          <td class="money">${escapeHtml(formatCurrency(calcGrandTotal(q)))}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="empty">Tidak ada data pada filter ini.</td></tr>';
    const reportHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Report Manager View</title>
      <style>
        @page{size:13.333in 7.5in;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#172033;background:#fff}
        .slide{width:13.333in;height:7.5in;page-break-after:always;position:relative;padding:.62in .75in;overflow:hidden;background:#fff}
        .slide:last-child{page-break-after:auto}.cover{background:linear-gradient(135deg,#effcf9 0%,#fff 58%,#e9f8f5 100%)}
        .cover:after{content:"";position:absolute;right:-1.2in;bottom:-1.5in;width:4.5in;height:4.5in;border-radius:50%;background:#bdeee4;opacity:.45}
        .brand{font-size:23px;font-weight:800;letter-spacing:.04em;color:#009f86}.eyebrow{color:#688097;font-size:15px;letter-spacing:.08em;text-transform:uppercase;font-weight:700}
        .accent{width:78px;height:7px;border-radius:7px;background:#00a88f;margin:24px 0}.cover h1{font-size:54px;line-height:1.03;margin:0 0 20px;max-width:8in;color:#172033}.cover p{font-size:21px;color:#688097;margin:0}.meta{position:absolute;left:.75in;bottom:.78in;color:#688097;font-size:15px}.footer{position:absolute;left:.75in;right:.75in;bottom:.25in;border-top:1px solid #d9ece8;padding-top:10px;color:#8a9bab;font-size:11px;display:flex;justify-content:space-between}
        .title{font-size:32px;margin:0;color:#172033}.subtitle{margin:8px 0 28px;color:#688097;font-size:15px}.filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}.pill{padding:8px 12px;border-radius:999px;background:#e9f8f5;color:#008d77;font-size:12px;font-weight:700}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.kpi{border:1px solid #d7ebe7;border-top:5px solid #00a88f;border-radius:12px;padding:20px;background:#fbfefd}.kpi .label{color:#688097;font-size:14px}.kpi .value{font-size:29px;font-weight:800;color:#172033;margin-top:12px}.kpi .hint{color:#009f86;font-size:12px;margin-top:8px;font-weight:700}.split{display:grid;grid-template-columns:1.25fr .75fr;gap:20px;margin-top:20px}.panel{border:1px solid #d7ebe7;border-radius:12px;padding:20px;background:#fff}.panel h3{margin:0 0 14px;font-size:16px}.status-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #edf3f2;color:#688097;font-size:13px}.status-row:last-child{border-bottom:0}.status-row strong{color:#172033}.bar{height:26px;background:#e9f8f5;border-radius:8px;margin:10px 0 16px;overflow:hidden}.bar i{display:block;height:100%;background:#00a88f;border-radius:8px}.bar-label{display:flex;justify-content:space-between;color:#688097;font-size:13px}.table-wrap{border:1px solid #d7ebe7;border-radius:12px;overflow:hidden}.table{width:100%;border-collapse:collapse;font-size:11px}.table th{background:#e9f8f5;color:#007f6c;text-align:left;padding:10px}.table td{padding:9px 10px;border-top:1px solid #edf3f2;color:#4d6074}.table .money{text-align:right;font-weight:700;color:#172033}.table .empty{text-align:center;padding:45px;color:#8a9bab}
      </style></head><body>
      <section class="slide cover"><div class="brand">Qsales</div><div class="accent"></div><div class="eyebrow">Manager View · Report Penjualan</div><h1>Ringkasan kinerja quotation</h1><p>Monitoring pipeline, status quotation, dan nilai penawaran tim.</p><div class="meta">${escapeHtml(generatedAt)} · ${escapeHtml(statusLabel)}</div><div class="footer"><span>Qsales · Manager View</span><span>1</span></div></section>
      <section class="slide"><div class="eyebrow">Executive summary</div><h2 class="title">Ringkasan periode terpilih</h2><p class="subtitle">Data mengikuti filter Manager View yang sedang aktif.</p><div class="filters"><span class="pill">Status: ${escapeHtml(statusLabel)}</span><span class="pill">Sales: ${escapeHtml(salesLabel)}</span><span class="pill">BU: ${escapeHtml(buLabel)}</span><span class="pill">${filtered.length} quotation</span></div><div class="grid"><div class="kpi"><div class="label">Total quotation</div><div class="value">${filtered.length}</div><div class="hint">Sesuai cakupan filter</div></div><div class="kpi"><div class="label">Nilai quotation</div><div class="value">${escapeHtml(formatCurrency(totalNilaiQuotation))}</div><div class="hint">Grand total quotation</div></div><div class="kpi"><div class="label">Quotation PO</div><div class="value">${poRows.length}</div><div class="hint">Status approved / PO</div></div><div class="kpi"><div class="label">Quotation sent</div><div class="value">${sentRows.length}</div><div class="hint">Menunggu keputusan customer</div></div></div><div class="split"><div class="panel"><h3>Komposisi status</h3><div class="bar-label"><span>PO dari quotation terfilter</span><strong>${filtered.length ? Math.round((poRows.length / filtered.length) * 100) : 0}%</strong></div><div class="bar"><i style="width:${filtered.length ? Math.round((poRows.length / filtered.length) * 100) : 0}%"></i></div><div class="bar-label"><span>Sent dari quotation terfilter</span><strong>${filtered.length ? Math.round((sentRows.length / filtered.length) * 100) : 0}%</strong></div><div class="bar"><i style="width:${filtered.length ? Math.round((sentRows.length / filtered.length) * 100) : 0}%"></i></div></div><div class="panel"><h3>Status quotation</h3>${statusRows}</div></div><div class="footer"><span>Qsales · Data Manager View</span><span>2</span></div></section>
      <section class="slide"><div class="eyebrow">Detail data</div><h2 class="title">Daftar quotation</h2><p class="subtitle">Menampilkan maksimal 50 baris pertama dari hasil filter.</p><div class="table-wrap"><table class="table"><thead><tr><th>Quotation</th><th>Customer</th><th>Sales</th><th>Status</th><th>Tanggal</th><th style="text-align:right">Nilai</th></tr></thead><tbody>${tableRows}</tbody></table></div><div class="footer"><span>Qsales · Manager View</span><span>3</span></div></section></body></html>`;
    const blob = new Blob([reportHtml], { type: 'application/vnd.ms-powerpoint' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `qsales-manager-report-${dateStamp}.ppt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pagedItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Restore soft deleted quotation
  const handleRestore = (id) => {
    setActionLoadingId(id);
    router.post(route('manager.quotations.restore', id), {}, {
      preserveScroll: true,
      onFinish: () => setActionLoadingId(null)
    });
  };

  // Hard delete quotation
  const handleHardDelete = (id) => {
    if (!window.confirm(`Apakah Anda yakin ingin MENGHAPUS PERMANEN quotation ${id}? Data tidak dapat dikembalikan lagi.`)) return;
    setActionLoadingId(id);
    router.delete(route('manager.quotations.force-delete', id), {
      preserveScroll: true,
      onFinish: () => setActionLoadingId(null)
    });
  };

  const approveChangeRequest = (id) => {
    if (!window.confirm('Setujui pengajuan ini? Dokumen lama akan ditandai cancelled/superseded.')) return;
    router.post(route('change-requests.approve', id), {}, { preserveScroll: true });
  };

  const rejectChangeRequest = (id) => {
    const manager_comment = window.prompt('Alasan penolakan:');
    if (!manager_comment?.trim()) return;
    router.post(route('change-requests.reject', id), { manager_comment }, { preserveScroll: true });
  };

  // Selection toggle logic
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const allPagedSelected = pagedItems.length > 0 && pagedItems.every(q => selectedIds.includes(q.id));

  const handleToggleSelectAll = () => {
    if (allPagedSelected) {
      const pagedIds = pagedItems.map(q => q.id);
      setSelectedIds(prev => prev.filter(id => !pagedIds.includes(id)));
    } else {
      const pagedIds = pagedItems.map(q => q.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pagedIds])));
    }
  };

  // Batch Restore
  const handleBatchRestore = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Apakah Anda yakin ingin MEMULIHKAN ${selectedIds.length} quotation yang dipilih?`)) return;

    setIsBatchProcessing(true);
    router.post(route('manager.quotations.batch-restore'), { ids: selectedIds }, {
      preserveScroll: true,
      onSuccess: () => setSelectedIds([]),
      onFinish: () => setIsBatchProcessing(false)
    });
  };

  // Batch Force Delete
  const handleBatchForceDelete = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`⚠️ PERINGATAN BATCH DELETE:\n\nApakah Anda yakin ingin MENGHAPUS PERMANEN ${selectedIds.length} quotation yang dipilih? Data yang dihapus tidak dapat dikembalikan lagi.`)) return;

    setIsBatchProcessing(true);
    router.post(route('manager.quotations.batch-force-delete'), { ids: selectedIds }, {
      preserveScroll: true,
      onSuccess: () => setSelectedIds([]),
      onFinish: () => setIsBatchProcessing(false)
    });
  };

  return (
    <AuthenticatedLayout
      header={<h2 className="font-semibold text-xl text-surface-800 leading-tight">Manager View</h2>}
    >
      <Head title="Manager View" />

      <div className="animate-fade-in-up space-y-6 pb-12 max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        
        {/* Top Banner */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-brand-600" />
              <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Manager View</h1>
            </div>
            <p className="text-xs text-surface-500">Monitoring seluruh penawaran tim sales, approval status, dan pengelolaan arsip quotation terhapus.</p>
          </div>
          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
          >
            <Download className="h-4 w-4" />
            Export Report PPT
          </button>
        </div>

        {pendingChangeRequests.length > 0 && <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-amber-900 mb-3">Pengajuan Perubahan Menunggu Persetujuan ({pendingChangeRequests.length})</h3>
          <div className="space-y-3">{pendingChangeRequests.map(cr => <div key={cr.id} className="bg-white rounded-xl border border-amber-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-xs"><div className="font-bold text-surface-900">{cr.type === 'revision' ? 'Revisi' : 'Cancel PO'} · {cr.quotation?.id} · SO {cr.sales_order?.id || '-'}</div><div className="text-surface-600 mt-1">{cr.reason}</div><div className="text-surface-400 mt-1">Diajukan oleh {cr.requester?.name || '-'} </div></div>
            <div className="flex gap-2 shrink-0"><button onClick={() => approveChangeRequest(cr.id)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Setujui</button><button onClick={() => rejectChangeRequest(cr.id)} className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold">Tolak</button></div>
          </div>)}</div>
        </div>}

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Total Quotation</span>
            <div className="text-2xl font-extrabold text-surface-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Total Nilai Quotation</span>
            <div className="text-2xl font-extrabold text-emerald-600">{formatCurrency(totalNilaiQuotation)}</div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Quotation PO</span>
            <div className="text-2xl font-extrabold text-blue-600">{stats.approved}</div>
          </div>

          <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
            <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-1">Pending PO</span>
            <div className="text-2xl font-extrabold text-amber-600">{stats.pending}</div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
          
          {/* Status Tabs */}
          <div className="flex border-b border-surface-200 overflow-x-auto bg-surface-50/50">
            {STATUS_TABS.map(tab => {
              const count = countByStatus(tab.key);
              const isActive = filterStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterStatus(tab.key)}
                  className={`py-3.5 px-5 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? tab.key === 'trash' ? 'border-red-500 text-red-600 bg-white' : 'border-brand-600 text-brand-700 bg-white'
                      : 'border-transparent text-surface-500 hover:text-surface-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isActive
                      ? tab.key === 'trash' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-800'
                      : 'bg-surface-200 text-surface-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Controls Bar */}
          <div className="p-4 border-b border-surface-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Cari ID, customer, sales..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              {businessUnits.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-surface-500 font-semibold whitespace-nowrap">BU:</span>
                  <select
                    value={filterBU}
                    onChange={e => setFilterBU(e.target.value)}
                    className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-surface-700 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                  >
                    <option value="all">Semua BU</option>
                    {businessUnits.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-surface-500 font-semibold whitespace-nowrap">Sales:</span>
                <select
                  value={filterSales}
                  onChange={e => setFilterSales(e.target.value)}
                  className="px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-xs font-medium text-surface-700 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                >
                  <option value="all">Semua Sales</option>
                  {salesUsers?.filter(s => {
                    const r = (s.role || '').trim().toLowerCase();
                    return r === 'sales' || r === 'presales';
                  }).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Batch Action Bar for Trash Tab */}
          {isTrashTab && (
            <div className="bg-red-50/80 border-b border-red-200 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                <input
                  type="checkbox"
                  checked={allPagedSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded border-red-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                  id="selectAllHeader"
                />
                <label htmlFor="selectAllHeader" className="cursor-pointer">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} quotation terhapus dipilih`
                    : 'Pilih semua di halaman ini'}
                </label>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleBatchRestore}
                    disabled={isBatchProcessing}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isBatchProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Pulihkan Terpilih ({selectedIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchForceDelete}
                    disabled={isBatchProcessing}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isBatchProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Hapus Permanen ({selectedIds.length})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Table Content */}
          {pagedItems.length === 0 ? (
            <div className="py-20 text-center text-surface-400 flex flex-col items-center justify-center gap-2">
              <FileText className="w-8 h-8 text-surface-300" />
              <span className="text-xs">{isTrashTab ? 'Tidak ada quotation yang terhapus.' : 'Tidak ada quotation ditemukan.'}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                    {isTrashTab && (
                      <th className="py-3.5 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          checked={allPagedSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded border-surface-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                          title="Pilih Semua di halaman ini"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-4">Quotation ID</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Pembuat (Sales)</th>
                    <th className="py-3.5 px-4">Tanggal {isTrashTab ? 'Dihapus' : 'Buat'}</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Grand Total</th>
                    <th className="py-3.5 px-4 text-center">Aksi Manager</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-xs">
                  {pagedItems.map(q => {
                    const creatorName = (q.creator?.name || 'Sales').trim().split(/\s+/)[0];
                    const customerName = q.customer?.name || 'Customer';
                    const grandTotal = calcGrandTotal(q);
                    const isActioning = actionLoadingId === q.id;
                    const isSelected = selectedIds.includes(q.id);

                    return (
                      <tr key={q.id} className={`hover:bg-surface-50/60 transition-colors ${isSelected ? 'bg-red-50/40' : ''}`}>
                        {isTrashTab && (
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(q.id)}
                              className="rounded border-surface-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-700">{q.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-surface-800">{customerName}</td>
                        <td className="py-3.5 px-4 text-surface-600">{creatorName}</td>
                        <td className="py-3.5 px-4 text-surface-500">{formatDate(isTrashTab ? q.deleted_at : q.created_at)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClasses(q.status)}`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-surface-900 text-right">{formatCurrency(grandTotal)}</td>
                        <td className="py-3.5 px-4 text-center">
                          {isTrashTab ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRestore(q.id)}
                                disabled={isActioning}
                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                title="Pulihkan Quotation ke Aktif"
                              >
                                {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                <span>Pulihkan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleHardDelete(q.id)}
                                disabled={isActioning}
                                className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                title="Hapus Permanen dari Database"
                              >
                                {isActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                <span>Permanen</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-surface-400 text-[11px]">Aktif</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {filtered.length > PAGE_SIZE && (
            <div className="p-4 border-t border-surface-200">
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                itemLabel="quotation"
                onPageChange={setPage}
              />
            </div>
          )}

        </div>
      </div>
    </AuthenticatedLayout>
  );
}
