import React from 'react';
import { Menu, Search, Bell, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const PAGE_CONFIG = {
  '/': { title: 'Dashboard', subtitle: 'Overview kinerja quotation bulan ini' },
  '/quotations': { title: 'Quotations', subtitle: 'Kelola semua penawaran harga' },
  '/customers': { title: 'Customers', subtitle: 'Manajemen data pelanggan' },
  '/products': { title: 'Products', subtitle: 'Katalog produk per brand' },
  '/brands': { title: 'Products', subtitle: 'Manajemen brand produk' },
  '/analytics': { title: 'Analytics', subtitle: 'Laporan dan analisis mendalam' },
  '/settings': { title: 'Settings', subtitle: 'Pengaturan sistem quotation' },
  '/profile': { title: 'Profil Pengguna', subtitle: 'Kelola informasi akun dan pengaturan profil' },
};

export default function Topbar({ setMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const config = PAGE_CONFIG[location.pathname] || PAGE_CONFIG['/'];

  return (
    <header className="sticky top-0 h-16 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-surface-200 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setMobileOpen(true)}
          className="lg:hidden text-surface-500 hover:bg-surface-100 p-2 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-surface-900">{config.title}</h1>
          <p className="text-xs text-surface-400">{config.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-full px-4 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50 transition-all min-w-[220px]">
          <Search className="w-4 h-4 text-surface-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Cari quotation, customer..." 
            className="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" 
          />
        </div>
        <button className="relative p-2 text-surface-400 hover:bg-surface-100 rounded-lg transition-colors" title="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full notif-dot"></span>
        </button>
        <button 
          onClick={() => navigate('/quotations?create=true')}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Buat Quotation</span>
        </button>
      </div>
    </header>
  );
}
