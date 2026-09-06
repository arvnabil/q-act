// ============================================
// ACTiV Quotation Dashboard — Roles Page (Mockup)
// ============================================
import { showToast } from '../utils.js';

const ROLES = ['Administrator', 'Manager', 'Sales', 'Presales'];

const FEATURES = [
  { id: 'quotations_view', label: 'Lihat Quotation', desc: 'Membuka dan melihat daftar quotation' },
  { id: 'quotations_create', label: 'Buat Quotation', desc: 'Membuat draft quotation baru' },
  { id: 'quotations_edit', label: 'Edit Quotation', desc: 'Mengubah rincian quotation yang ada' },
  { id: 'quotations_delete', label: 'Hapus Quotation', desc: 'Menghapus penawaran harga' },
  { id: 'customers_manage', label: 'Kelola Customer & PIC', desc: 'Menambah dan mengedit data pelanggan' },
  { id: 'products_manage', label: 'Katalog Produk & Brand', desc: 'Mengelola daftar barang dan brand' },
  { id: 'user_management', label: 'User & Role Management', desc: 'Mengatur hak akses dan pengguna' },
];

let rolePermissions = {
  Administrator: ['quotations_view', 'quotations_create', 'quotations_edit', 'quotations_delete', 'customers_manage', 'products_manage', 'user_management'],
  Manager: ['quotations_view', 'quotations_create', 'quotations_edit', 'customers_manage', 'products_manage'],
  Sales: ['quotations_view', 'quotations_create', 'quotations_edit', 'customers_manage'],
  Presales: ['quotations_view', 'products_manage'],
};

export function renderRoles() {
  return `
    <div className="animate-fade-in-up max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-surface-900 tracking-tight">Peran & Hak Akses (Roles)</h1>
          <p className="text-sm text-surface-500 mt-1">Kelola matriks hak akses fitur berdasarkan peran (role) pengguna secara dinamis.</p>
        </div>
        <button id="btnSaveRoles" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer">
          Simpan Hak Akses
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="py-4 px-6 text-xs font-bold text-surface-500 uppercase tracking-wider w-80">Fitur & Modul</th>
                ${ROLES.map(r => `
                  <th className="py-4 px-4 text-center text-xs font-bold text-surface-700 uppercase tracking-wider">
                    ${r}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              ${FEATURES.map(f => `
                <tr className="hover:bg-surface-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="text-sm font-bold text-surface-800 block">${f.label}</span>
                    <span className="text-xs text-surface-400 block mt-0.5">${f.desc}</span>
                  </td>
                  ${ROLES.map(r => {
                    const isChecked = rolePermissions[r]?.includes(f.id);
                    const isDisabled = r === 'Administrator' && f.id === 'user_management';
                    return `
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          class="perm-checkbox w-4 h-4 rounded cursor-pointer"
                          data-role="${r}"
                          data-feature="${f.id}"
                          ${isChecked ? 'checked' : ''}
                          ${isDisabled ? 'disabled title="Lockout protection"' : ''}
                        />
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function bindRolesEvents() {
  const btnSave = document.getElementById('btnSaveRoles');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      showToast('Perubahan Hak Akses berhasil disimpan.', 'success');
    });
  }

  document.querySelectorAll('.perm-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const role = e.target.getAttribute('data-role');
      const feature = e.target.getAttribute('data-feature');
      if (e.target.checked) {
        if (!rolePermissions[role].includes(feature)) rolePermissions[role].push(feature);
      } else {
        rolePermissions[role] = rolePermissions[role].filter(f => f !== feature);
      }
    });
  });
}
