// ============================================
// ACTiV Quotation Dashboard — Manager Page (Mockup)
// ============================================
import { QUOTATIONS, SALES_TEAM, formatCurrency, formatDate } from '../utils.js';

let filterStatus = 'all';
let filterSales = 'all';

export function renderManager() {
  const filtered = QUOTATIONS.filter(q => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (filterSales !== 'all' && (q.sales_id || q.created_by) !== filterSales) return false;
    return true;
  });

  const total = QUOTATIONS.length;
  const approved = QUOTATIONS.filter(q => q.status === 'approved').length;
  const pending = QUOTATIONS.filter(q => q.status === 'sent').length;
  const revenue = QUOTATIONS.filter(q => q.status === 'approved').reduce((sum, q) => sum + (q.grand_total || 0), 0);

  return `
    <div className="animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl p-5 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <div>
            <h2 className="text-base font-bold">Manager Dashboard</h2>
            <p className="text-xs text-white/70">Semua quotation dari seluruh tim sales</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <div className="text-xl font-bold">${total}</div>
            <div className="text-xs text-white/70 mt-0.5">Total QO</div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <div className="text-xl font-bold text-emerald-200">${approved}</div>
            <div className="text-xs text-white/70 mt-0.5">Approved</div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <div className="text-xl font-bold text-yellow-200">${pending}</div>
            <div className="text-xs text-white/70 mt-0.5">Pending (Sent)</div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <div className="text-lg font-bold">${formatCurrency(revenue)}</div>
            <div className="text-xs text-white/70 mt-0.5">Total Revenue</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-surface-500 uppercase">Filter Sales:</label>
          <select id="selectSalesFilter" className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-surface-700 outline-none">
            <option value="all" ${filterSales === 'all' ? 'selected' : ''}>Semua Sales</option>
            ${SALES_TEAM.map(s => `<option value="${s.id}" ${filterSales === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200">
              <th className="py-3 px-4 text-xs font-bold text-surface-400 uppercase">No. QO</th>
              <th className="py-3 px-4 text-xs font-bold text-surface-400 uppercase">Customer</th>
              <th className="py-3 px-4 text-xs font-bold text-surface-400 uppercase">Sales</th>
              <th className="py-3 px-4 text-right text-xs font-bold text-surface-400 uppercase">Grand Total</th>
              <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            ${filtered.map(q => `
              <tr className="hover:bg-surface-50/50 transition-colors">
                <td className="py-3.5 px-4 font-bold text-brand-700 text-sm">${q.id}</td>
                <td className="py-3.5 px-4 text-sm text-surface-800 font-semibold">${q.customer?.name || '-'}</td>
                <td className="py-3.5 px-4 text-sm text-surface-600">${q.creator?.name || 'Sales'}</td>
                <td className="py-3.5 px-4 text-right text-sm font-bold text-surface-900">${formatCurrency(q.grand_total)}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">${q.status}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function bindManagerEvents() {
  const sel = document.getElementById('selectSalesFilter');
  if (sel) {
    sel.addEventListener('change', (e) => {
      filterSales = e.target.value;
      document.getElementById('pageContent').innerHTML = renderManager();
      bindManagerEvents();
    });
  }
}
