// ============================================
// ACTiV Quotation Dashboard — Users Page (Mockup)
// ============================================
import { SALES_TEAM, showToast } from '../utils.js';

let teamMembers = [...SALES_TEAM];

export function renderUsers() {
  return `
    <div className="animate-fade-in-up max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Manajemen User</h1>
          <p className="text-sm text-surface-500 mt-1">Kelola daftar tim dan akses masuk mereka.</p>
        </div>
        <button
          id="btnAddUser"
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          <span>Tambah User</span>
        </button>
      </div>

      {/* Team Member List */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Nama</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Email</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Mobile</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Kode Sales</th>
                <th className="py-3 px-4 text-left text-xs font-bold text-surface-400 uppercase tracking-wider">Role</th>
                <th className="py-3 px-4 text-center text-xs font-bold text-surface-400 uppercase tracking-wider w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              ${teamMembers.map(s => {
                const initials = (s.name || s.email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                const roleBadge = (s.role === 'Administrator' || s.role === 'admin')
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : s.role === 'Manager'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                return `
                  <tr className="hover:bg-surface-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0">
                          ${initials}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-surface-800 block">${s.name || '-'}</span>
                          <span className="text-[11px] text-surface-400 block">${s.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-surface-600">${s.email}</td>
                    <td className="py-3.5 px-4 text-sm text-surface-600">${s.mobile || '-'}</td>
                    <td className="py-3.5 px-4 text-sm font-mono text-surface-700 font-semibold">${s.sales_code || '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadge}">
                        ${s.role || 'Sales'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button className="text-surface-400 hover:text-red-600 p-1 rounded transition-colors btn-delete-user" data-id="${s.id}">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function bindUsersEvents() {
  const btnAdd = document.getElementById('btnAddUser');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      showToast('Form Tambah User dibuka dalam mode interaktif.', 'info');
    });
  }

  document.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
        teamMembers = teamMembers.filter(m => m.id !== id);
        showToast('User berhasil dihapus.', 'success');
        document.getElementById('pageContent').innerHTML = renderUsers();
        bindUsersEvents();
      }
    });
  });
}
