import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, BookOpen, FileText, Users, Box, UserCog, ArrowLeft, ChevronDown, HelpCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Guide() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openSection, setOpenSection] = useState('create-quotation');

  const categories = [
    { id: 'all', label: 'Semua Topik', icon: BookOpen },
    { id: 'quotation', label: 'Quotation', icon: FileText },
    { id: 'customer', label: 'Customer & PIC', icon: Users },
    { id: 'product', label: 'Produk & Brand', icon: Box },
    { id: 'roles', label: 'Role & Hak Akses', icon: UserCog },
  ];

  const guideTopics = [
    {
      id: 'create-quotation',
      category: 'quotation',
      title: 'Cara Membuat Quotation Penawaran Baru',
      summary: 'Panduan langkah demi langkah membuat penawaran harga resmi dengan kalkulasi otomatis.',
      steps: [
        'Klik tombol "+ Buat Quotation" pada header atau menu Quotations.',
        'Pilih Customer dan PIC penerima penawaran. Sistem akan mengisi alamat & kontak otomatis.',
        'Tambahkan item produk, tentukan kuantitas (QTY) dan diskon jika ada.',
        'Tentukan Term of Payment (TOP), Garansi, dan tanggal berlaku (Expired Date).',
        'Pilih Rekening Bank pembayar yang akan dicantumkan di penawaran.',
        'Simpan sebagai Draft atau langsung ubah ke status Sent/PO.',
        'Klik ikon Print/PDF untuk mengunduh penawaran resmi berformat PDF.'
      ]
    },
    {
      id: 'pdf-export',
      category: 'quotation',
      title: 'Cetak & Ekspor Penawaran ke PDF',
      summary: 'Fitur cetak otomatis dengan tata letak profesional lengkap dengan logo, syarat & ketentuan, serta tanda tangan.',
      steps: [
        'Buka daftar Quotations dan klik ikon Mata (Detail) atau tombol Cetak.',
        'Sistem akan menyusun tata letak PDF standar perusahaan secara otomatis.',
        'Rincian barang, total harga, PPN, bank penerima, dan tanda tangan digital Sales akan tercantum.',
        'Gunakan tombol "Print / Save PDF" di browser untuk mengunduh file PDF resmi.'
      ]
    },
    {
      id: 'manage-customers',
      category: 'customer',
      title: 'Mengelola Data Customer & Banyak PIC',
      summary: 'Cara mendaftarkan perusahaan klien beserta beberapa kontak PIC (Person In Charge).',
      steps: [
        'Buka menu Customers di Sidebar.',
        'Klik tombol "+ Tambah Customer" di pojok kanan atas.',
        'Isi Nama Perusahaan, Alamat Lengkap, dan Informasi Pajak (NPWP).',
        'Tambahkan satu atau beberapa data PIC (Nama, Email, Nomor WhatsApp).',
        'Tentukan PIC Utama (Primary PIC) yang akan muncul otomatis saat membuat Quotation.',
        'Simpan data customer. Anda bisa mengeditnya kapan saja.'
      ]
    },
    {
      id: 'products-brands',
      category: 'product',
      title: 'Katalog Produk & Kelola Brand',
      summary: 'Menambahkan produk baru, mengatur stok/SKU, dan menyesuaikan warna brand.',
      steps: [
        'Akses menu Products -> Katalog Produk untuk melihat daftar barang.',
        'Klik "+ Tambah Produk" untuk menambahkan barang baru lengkap dengan gambar, SKU, dan harga.',
        'Gunakan menu Products -> Kelola Brand untuk menambah brand baru beserta warna khasnya.',
        'Produk yang terdaftar akan otomatis muncul di pencarian autocomplete saat membuat Quotation.'
      ]
    },
    {
      id: 'user-management',
      category: 'roles',
      title: 'Manajemen User & Hak Akses Role Dinamis',
      summary: 'Pengaturan matriks hak akses untuk Administrator, Manager, Sales, dan Presales.',
      steps: [
        'Akses menu System -> User Management di Sidebar (khusus Administrator).',
        'Di submenu Users: Tambah anggota tim baru dengan email, password, dan role yang sesuai.',
        'Di submenu Roles: Atur matriks hak akses fitur dengan mencentang kotak centang.',
        'Perubahan hak akses tersimpan dinamis ke database dan berlaku secara real-time.'
      ]
    },
    {
      id: 'manager-dashboard',
      category: 'quotation',
      title: 'Manager Dashboard & Filter Sales',
      summary: 'Monitoring performa penawaran seluruh tim sales dalam satu tampilan.',
      steps: [
        'Akses menu Reports -> Manager View di Sidebar.',
        'Gunakan filter Sales di pojok kanan atas untuk melihat penawaran dari sales tertentu.',
        'Gunakan tab status (Draft, Sent, PO, Rejected, Expired) untuk memfilter progres penawaran.',
        'Pantau total potensi revenue dan quotation yang membutuhkan persetujuan.'
      ]
    }
  ];

  const filteredTopics = guideTopics.filter(t => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch = !search || 
      t.title.toLowerCase().includes(search.toLowerCase()) || 
      t.summary.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-surface-800 pb-16">
      {/* Header Bar */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center border border-surface-200 shadow-sm shrink-0">
              <img src="/logo.png" alt="ACTiV" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-base font-extrabold text-brand-700 tracking-tight block">ACTiV</span>
              <span className="text-[10px] font-bold text-surface-400 tracking-wider uppercase block -mt-1">Pusat Panduan</span>
            </div>
          </div>

          <button
            onClick={() => navigate(user ? '/' : '/login')}
            className="flex items-center gap-2 text-sm font-semibold text-surface-600 hover:text-brand-600 px-3.5 py-2 rounded-lg bg-surface-100 hover:bg-brand-50 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{user ? 'Kembali ke Dashboard' : 'Kembali ke Login'}</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-900 text-white py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-brand-100 backdrop-blur-sm border border-white/10 mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Dokumentasi & Panduan Pengguna
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Bagaimana Kami Bisa Membantu Anda?
          </h1>
          <p className="text-sm sm:text-base text-brand-100/90 max-w-2xl mx-auto mb-8">
            Temukan panduan lengkap penggunaan portal penawaran harga ACTiV, mulai dari membuat quotation hingga pengelolaan hak akses tim.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-surface-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari topik panduan (misal: buat quotation, customer, cetak pdf)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white text-surface-800 pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium outline-none shadow-lg placeholder-surface-400 focus:ring-2 focus:ring-brand-400 transition-all"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        {/* Category Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'bg-white text-surface-600 hover:bg-surface-100 border border-surface-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Topics Accordion List */}
        <div className="space-y-4">
          {filteredTopics.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-surface-200 shadow-sm">
              <HelpCircle className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-surface-800 mb-1">Topik tidak ditemukan</h3>
              <p className="text-xs text-surface-500">Coba gunakan kata kunci pencarian yang lain atau pilih kategori Semua Topik.</p>
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const isOpen = openSection === topic.id;
              return (
                <div
                  key={topic.id}
                  className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden transition-all duration-200 hover:border-brand-300"
                >
                  <button
                    onClick={() => setOpenSection(isOpen ? null : topic.id)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer hover:bg-surface-50/50 transition-colors"
                  >
                    <div className="pr-4">
                      <h3 className="text-base font-bold text-surface-900 mb-1 flex items-center gap-2">
                        <span>{topic.title}</span>
                      </h3>
                      <p className="text-xs text-surface-500">{topic.summary}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isOpen ? 'bg-brand-100 text-brand-700 rotate-180' : 'bg-surface-100 text-surface-500'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 border-t border-surface-100 bg-surface-50/30 animate-fade-in">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700 mb-3">Langkah-Langkah:</h4>
                      <ol className="space-y-2.5">
                        {topic.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-surface-700 leading-relaxed">
                            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Support Banner */}
        <div className="mt-12 bg-gradient-to-r from-surface-900 to-surface-800 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div>
            <h3 className="text-lg font-bold mb-1">Masih Butuh Bantuan Tambahan?</h3>
            <p className="text-xs text-surface-300">Tim dukungan kami siap membantu menjawab pertanyaan teknis Anda.</p>
          </div>
          <Link
            to="/support"
            className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg whitespace-nowrap shrink-0"
          >
            Hubungi Layanan Bantuan →
          </Link>
        </div>
      </main>
    </div>
  );
}
