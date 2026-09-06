// ============================================
// ACTiV Quotation Dashboard — Main Router
// ============================================
import './style.css';
import { QUOTATIONS, CUSTOMERS, BRANDS, PRODUCTS, showToast } from './utils.js';
import { renderDashboard, bindDashboardEvents } from './pages/dashboard.js';
import { renderQuotations, bindQuotationEvents, resetQuotationState, openEditQuotation } from './pages/quotations.js';
import { renderCustomers, bindCustomerEvents, resetCustomerState } from './pages/customers.js';
import { renderProducts, bindProductEvents, resetProductState } from './pages/products.js';
import { renderProductsBrands, bindProductsBrandsEvents, resetBrandState } from './pages/brands.js';
import { renderAnalytics, bindAnalyticsEvents } from './pages/analytics.js';
import { renderSettings, bindSettingsEvents } from './pages/settings.js';
import { renderLogin, bindLoginEvents } from './pages/login.js';
import { renderProfile, bindProfileEvents } from './pages/profile.js';
import { renderUsers, bindUsersEvents } from './pages/users.js';
import { renderRoles, bindRolesEvents } from './pages/roles.js';
import { renderManager, bindManagerEvents } from './pages/manager.js';
import { renderGuide, bindGuideEvents } from './pages/guide.js';
import { renderSupport, bindSupportEvents } from './pages/support.js';

// ---- State ----
let activePage = 'dashboard';

function getCurrentUser() {
  const userJson = localStorage.getItem('activ_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

const PAGE_CONFIG = {
  dashboard:  { title: 'Dashboard', subtitle: 'Overview kinerja quotation bulan ini' },
  quotations: { title: 'Quotations', subtitle: 'Kelola semua penawaran harga' },
  customers:  { title: 'Customers', subtitle: 'Manajemen data pelanggan' },
  products:   { title: 'Products', subtitle: 'Katalog produk per brand' },
  'products-catalog': { title: 'Products', subtitle: 'Katalog produk per brand' },
  'products-brands':  { title: 'Products', subtitle: 'Manajemen brand produk' },
  analytics:  { title: 'Analytics', subtitle: 'Laporan dan analisis mendalam' },
  manager:    { title: 'Manager Dashboard', subtitle: 'Semua quotation dari seluruh tim sales' },
  users:      { title: 'Manajemen User', subtitle: 'Kelola daftar tim dan akses masuk' },
  roles:      { title: 'Roles & Hak Akses', subtitle: 'Pengaturan matriks hak akses fitur' },
  settings:   { title: 'Settings', subtitle: 'Pengaturan sistem quotation' },
  profile:    { title: 'Profil Pengguna', subtitle: 'Kelola informasi akun dan pengaturan profil' },
  guide:      { title: 'Pusat Panduan', subtitle: 'Dokumentasi penggunaan portal' },
  support:    { title: 'Pusat Bantuan', subtitle: 'Layanan dukungan pelanggan & kendala teknis' },
};

// ---- Navigation ----
function navigateTo(page) {
  if (activePage === page) return;
  activePage = page;
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderPage() {
  const container = document.getElementById('pageContent');
  const titleEl = document.getElementById('pageTitle');
  const subtitleEl = document.getElementById('pageSubtitle');
  const config = PAGE_CONFIG[activePage] || PAGE_CONFIG.dashboard;

  if (titleEl) titleEl.textContent = config.title;
  if (subtitleEl) subtitleEl.textContent = config.subtitle;

  // Update sidebar active state
  document.querySelectorAll('.nav-link').forEach(el => {
    const key = el.dataset.nav;
    const isCurrentActive = key === activePage || 
      (key === 'products' && (activePage === 'products-catalog' || activePage === 'products-brands'));

    if (isCurrentActive) {
      el.classList.add('bg-brand-50', 'text-brand-700', 'font-semibold');
      el.classList.remove('text-surface-500', 'hover:bg-surface-100', 'hover:text-surface-700');
      el.querySelector('.nav-indicator')?.classList.remove('hidden');
      
      const chevron = el.querySelector('svg:last-child');
      chevron?.classList.add('rotate-90');
      
      const submenu = document.getElementById(`submenu-${key}`);
      if (submenu) {
        submenu.classList.remove('max-h-0', 'opacity-0');
        submenu.classList.add('max-h-24', 'opacity-100');
      }
    } else {
      el.classList.remove('bg-brand-50', 'text-brand-700', 'font-semibold');
      el.classList.add('text-surface-500', 'hover:bg-surface-100', 'hover:text-surface-700');
      el.querySelector('.nav-indicator')?.classList.add('hidden');
      
      const chevron = el.querySelector('svg:last-child');
      chevron?.classList.remove('rotate-90');
      
      const submenu = document.getElementById(`submenu-${key}`);
      if (submenu) {
        submenu.classList.add('max-h-0', 'opacity-0');
        submenu.classList.remove('max-h-24', 'opacity-100');
      }
    }
  });

  // Update submenu items active state
  document.querySelectorAll('.nav-sub-link').forEach(el => {
    const key = el.dataset.nav;
    const isSubActive = key === activePage;
    if (isSubActive) {
      el.classList.add('text-brand-700', 'bg-brand-50/50');
      el.classList.remove('text-surface-400', 'hover:bg-surface-50', 'hover:text-surface-700');
      el.querySelector('span')?.classList.add('bg-brand-500');
      el.querySelector('span')?.classList.remove('bg-surface-300');
    } else {
      el.classList.remove('text-brand-700', 'bg-brand-50/50');
      el.classList.add('text-surface-400', 'hover:bg-surface-50', 'hover:text-surface-700');
      el.querySelector('span')?.classList.remove('bg-brand-500');
      el.querySelector('span')?.classList.add('bg-surface-300');
    }
  });

  // Render page content
  switch (activePage) {
    case 'dashboard':
      container.innerHTML = renderDashboard();
      bindDashboardEvents(navigateTo);
      break;
    case 'quotations':
      container.innerHTML = renderQuotations();
      bindQuotationEvents(() => { container.innerHTML = renderQuotations(); bindQuotationEvents(() => renderPage()); });
      break;
    case 'customers':
      container.innerHTML = renderCustomers();
      bindCustomerEvents(() => { container.innerHTML = renderCustomers(); bindCustomerEvents(() => renderPage()); });
      break;
    case 'products':
    case 'products-catalog':
      container.innerHTML = renderProducts();
      bindProductEvents(() => { container.innerHTML = renderProducts(); bindProductEvents(() => renderPage()); });
      break;
    case 'products-brands':
      container.innerHTML = renderProductsBrands();
      bindProductsBrandsEvents(() => { container.innerHTML = renderProductsBrands(); bindProductsBrandsEvents(() => renderPage()); });
      break;
    case 'analytics':
      container.innerHTML = renderAnalytics();
      bindAnalyticsEvents();
      break;
    case 'manager':
      container.innerHTML = renderManager();
      bindManagerEvents();
      break;
    case 'users':
      container.innerHTML = renderUsers();
      bindUsersEvents();
      break;
    case 'roles':
      container.innerHTML = renderRoles();
      bindRolesEvents();
      break;
    case 'settings':
      container.innerHTML = renderSettings();
      bindSettingsEvents();
      break;
    case 'guide':
      container.innerHTML = renderGuide();
      bindGuideEvents();
      break;
    case 'support':
      container.innerHTML = renderSupport();
      bindSupportEvents();
      break;
    case 'profile':
      container.innerHTML = renderProfile();
      bindProfileEvents(() => {
        // re-render the whole layout so the sidebar avatar updates
        const user = getCurrentUser();
        if (user) {
          const app = document.getElementById('app');
          app.innerHTML = `
            ${renderSidebar(user)}
            <main class="flex-1 lg:ml-60 flex flex-col min-h-screen transition-all">
              ${renderTopbar()}
              <div class="flex-1 p-5 lg:p-7 flex flex-col gap-5" id="pageContent"></div>
            </main>
            ${renderModal()}
            <div class="fixed top-5 right-5 flex flex-col gap-2 z-[300]" id="toastContainer"></div>
          `;
          renderPage();
          globalEventsBound = false;
          bindGlobalEvents();
        }
      });
      break;
    default:
      container.innerHTML = renderDashboard();
      bindDashboardEvents(navigateTo);
  }
}

// ---- Sidebar ----
function renderSidebar(user) {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>` },
    { key: 'quotations', label: 'Quotations', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>`, badge: QUOTATIONS.length },
    { key: 'customers', label: 'Customers', icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
    { 
      key: 'products', 
      label: 'Products', 
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
      submenu: [
        { key: 'products-catalog', label: 'Katalog Produk' },
        { key: 'products-brands', label: 'Kelola Brand' },
      ]
    },
  ];

  const mainNav = navItems.map(n => {
    const hasSubmenu = !!n.submenu;
    const isCurrentActive = activePage === n.key || (hasSubmenu && n.submenu.some(sub => sub.key === activePage));
    
    let submenuHtml = '';
    if (hasSubmenu) {
      const subItemsHtml = n.submenu.map(sub => {
        const isSubActive = activePage === sub.key;
        return `
          <a href="#" class="nav-sub-link flex items-center gap-2 pl-10 pr-3 py-2 rounded-lg text-xs font-semibold transition-all
            ${isSubActive ? 'text-brand-700 bg-brand-50/50' : 'text-surface-400 hover:bg-surface-50 hover:text-surface-700'}" data-nav="${sub.key}">
            <span class="w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-brand-500' : 'bg-surface-300'} shrink-0"></span>
            <span>${sub.label}</span>
          </a>
        `;
      }).join('');
      
      submenuHtml = `
        <div class="flex flex-col gap-0.5 mt-1 transition-all duration-300 overflow-hidden ${isCurrentActive ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}" id="submenu-${n.key}">
          ${subItemsHtml}
        </div>
      `;
    }

    return `
      <div class="flex flex-col">
        <a href="#" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative
          ${isCurrentActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}" 
          data-nav="${n.key}" data-has-submenu="${hasSubmenu}">
          <div class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r ${isCurrentActive ? '' : 'hidden'}"></div>
          ${n.icon}
          <span>${n.label}</span>
          ${n.badge ? `<span class="ml-auto text-xs font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">${n.badge}</span>` : ''}
          ${hasSubmenu ? `
            <svg class="w-4 h-4 ml-auto text-surface-400 transform transition-transform duration-200 ${isCurrentActive ? 'rotate-90' : ''}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          ` : ''}
        </a>
        ${submenuHtml}
      </div>
    `;
  }).join('');

  return `
    <div class="w-60 h-screen bg-white border-r border-surface-200 flex flex-col fixed left-0 top-0 z-50 shrink-0 lg:translate-x-0 -translate-x-full transition-transform duration-300" id="sidebar">
      <div class="px-5 py-5 border-b border-surface-100">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M6 24L16 4L26 24" stroke="#00A88F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 18H22" stroke="#009680" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-base font-extrabold tracking-wide text-brand-700">ACTiV</span>
            <span class="text-[10px] text-surface-400 font-medium">Sales Portal</span>
          </div>
        </div>
      </div>

      <nav class="flex-1 px-3 py-4 overflow-y-auto">
        <div class="mb-5">
          <span class="text-[10px] font-bold text-surface-400 tracking-widest uppercase px-3 mb-2 block">MAIN</span>
          <div class="flex flex-col gap-0.5">${mainNav}</div>
        </div>
        <div class="mb-5">
          <span class="text-[10px] font-bold text-surface-400 tracking-widest uppercase px-3 mb-2 block">REPORTS</span>
          <div class="flex flex-col gap-0.5">
            <a href="#" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${activePage === 'analytics' ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}" data-nav="analytics">
              <div class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r ${activePage === 'analytics' ? '' : 'hidden'}"></div>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>Analytics</span>
            </a>
          </div>
        </div>
        <div class="mb-5">
          <span class="text-[10px] font-bold text-surface-400 tracking-widest uppercase px-3 mb-2 block">SYSTEM</span>
          <div class="flex flex-col gap-0.5">
            <a href="#" class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${activePage === 'settings' ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}" data-nav="settings">
              <div class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r ${activePage === 'settings' ? '' : 'hidden'}"></div>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span>Settings</span>
            </a>
          </div>
        </div>
      </nav>

      <div class="px-4 py-4 border-t border-surface-100 flex items-center justify-between">
        <div class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer flex-1 min-w-0" id="sidebarProfileContainer">
          <div class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
            ${user.avatarImg ? `<img src="${user.avatarImg}" class="w-full h-full object-cover" />` : user.avatar}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold text-surface-800 truncate">${user.name}</span>
            <span class="text-[10px] text-surface-400 truncate">${user.role}</span>
          </div>
        </div>
        <button id="logoutBtn" class="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer" title="Keluar">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </div>`;
}

function renderTopbar() {
  const config = PAGE_CONFIG[activePage] || PAGE_CONFIG.dashboard;
  return `
    <header class="sticky top-0 h-16 px-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-surface-200 z-40">
      <div class="flex items-center gap-4">
        <button id="menuToggle" class="lg:hidden text-surface-500 hover:bg-surface-100 p-2 rounded-lg transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div>
          <h1 class="text-lg font-bold text-surface-900" id="pageTitle">${config.title}</h1>
          <p class="text-xs text-surface-400" id="pageSubtitle">${config.subtitle}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden sm:flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-full px-4 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50 transition-all min-w-[220px]">
          <svg class="w-4 h-4 text-surface-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="globalSearch" placeholder="Cari quotation, customer..." class="bg-transparent border-none outline-none text-sm text-surface-700 placeholder-surface-400 w-full" />
        </div>
        <button class="relative p-2 text-surface-400 hover:bg-surface-100 rounded-lg transition-colors" title="Notifications">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full notif-dot"></span>
        </button>
        <button id="createQuotation" class="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span class="hidden sm:inline">Buat Quotation</span>
        </button>
      </div>
    </header>`;
}

function renderModal() {
  const existingCustomerOptions = CUSTOMERS.map(c =>
    `<option value="${c.name}" data-pic="${c.pic}" data-phone="${c.phone}">${c.name}</option>`
  ).join('');

  return `
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-200" id="modalOverlay">
      <div class="bg-white rounded-2xl border border-surface-200 shadow-2xl w-[580px] max-w-[95vw] max-h-[90vh] overflow-y-auto transform translate-y-4 scale-[0.97] transition-all duration-200" id="createModal">
        
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div>
            <h2 class="text-base font-bold text-surface-900">Buat Quotation Baru</h2>
            <p class="text-xs text-surface-400 mt-0.5">Isi data customer & quotation, produk ditambahkan di langkah berikutnya</p>
          </div>
          <button id="modalClose" class="text-surface-400 hover:text-surface-600 hover:bg-surface-100 p-1.5 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="px-6 py-5 flex flex-col gap-5">

          <!-- Step 1: Customer -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
              <span class="text-sm font-bold text-surface-800">Data Customer</span>
            </div>

            <!-- Toggle: existing vs new -->
            <div class="flex items-center gap-1 p-1 bg-surface-100 rounded-lg mb-4 w-fit">
              <button id="modeExisting" class="px-3 py-1.5 text-xs font-semibold rounded-md bg-white shadow-sm text-brand-700 transition-all">Pilih yang sudah ada</button>
              <button id="modeNew" class="px-3 py-1.5 text-xs font-semibold rounded-md text-surface-500 hover:text-surface-700 transition-all">+ Customer baru</button>
            </div>

            <!-- Existing customer panel -->
            <div id="panelExisting" class="flex flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-surface-600">Nama Perusahaan</label>
                <select id="modalExistingCustomer" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer">
                  <option value="">-- Pilih Customer --</option>
                  ${existingCustomerOptions}
                </select>
              </div>
              <!-- PIC fields — pre-filled but editable -->
              <!-- PIC fields — pre-filled but editable -->
              <div id="existingPicArea" class="hidden flex-col gap-3">
                <div class="flex items-center justify-between mb-0.5">
                  <label class="text-xs font-semibold text-surface-600">Pilih / Ubah PIC untuk Quotation ini</label>
                </div>
                <select id="existingPicSelect" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 cursor-pointer">
                  <!-- options injected via JS -->
                </select>
                <div class="grid grid-cols-3 gap-2">
                  <input type="text" id="existingPicName" placeholder="Nama PIC" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors" />
                  <input type="text" id="existingPicPhone" placeholder="No. Telp" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors" />
                  <input type="email" id="existingPicEmail" placeholder="Email PIC" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500 transition-colors" />
                </div>
                <p class="text-xs text-surface-400">
                  <svg class="w-3 h-3 inline-block mr-1 text-surface-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Jika Anda mengganti nama PIC di atas, data akan tersimpan sebagai PIC tambahan untuk customer ini.
                </p>
              </div>
            </div>

            <!-- New customer panel -->
            <div id="panelNew" class="hidden flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-surface-600">Nama PT / Perusahaan <span class="text-red-400">*</span></label>
                <input type="text" id="modalNewPT" placeholder="Contoh: PT. Maju Bersama" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" />
              </div>

              <!-- PIC list (can add multiple) -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-semibold text-surface-600">Daftar PIC <span class="text-red-400">*</span></label>
                  <button type="button" id="addPicBtn" class="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tambah PIC
                  </button>
                </div>
                <div id="picList" class="flex flex-col gap-2">
                  <!-- PIC rows will be rendered here -->
                  <div class="pic-row grid gap-2" style="grid-template-columns: 1fr 1fr 1fr auto">
                    <input type="text" placeholder="Nama PIC" class="pic-name bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
                    <input type="text" placeholder="No. Telp" class="pic-phone bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
                    <input type="email" placeholder="Email PIC" class="pic-email bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500" />
                    <button type="button" class="remove-pic-btn text-surface-300 hover:text-red-500 p-1.5 rounded-lg transition-colors opacity-0 pointer-events-none self-center">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="h-px bg-surface-100"></div>

          <!-- Step 2: Quotation Info -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <span class="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
              <span class="text-sm font-bold text-surface-800">Info Quotation</span>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-surface-600">Sales (Pembuat)</label>
                <input type="text" id="modalSalesName" placeholder="Nama sales..." class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-surface-600">Masa Berlaku (Hari)</label>
                <input type="number" id="modalExpiry" value="7" min="1" max="90" class="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-500" />
              </div>
            </div>
            <p class="text-xs text-surface-400 mt-3">
              <svg class="w-3.5 h-3.5 inline-block mr-1 text-brand-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Produk, harga, dan syarat & ketentuan diisi di halaman berikutnya.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
          <button id="modalCancelBtn" class="px-4 py-2 text-sm font-semibold text-surface-600 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors">Batal</button>
          <button id="modalGenerateBtn" class="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-lg hover:bg-brand-600 shadow-sm hover:shadow transition-all">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9,18 15,12 9,6"/></svg>
            Lanjut & Isi Produk
          </button>
        </div>
      </div>
    </div>`;
}

// ---- Mount ----
function mount() {
  const user = getCurrentUser();
  const app = document.getElementById('app');

  const currentHash = window.location.hash;
  if (currentHash === '#guide' || activePage === 'guide') {
    activePage = 'guide';
    app.className = 'min-h-screen w-full bg-surface-50 flex flex-col';
    app.innerHTML = renderGuide();
    bindGuideEvents(() => {
      window.location.hash = '';
      activePage = user ? 'dashboard' : 'login';
      mount();
    });
    return;
  }

  if (currentHash === '#support' || activePage === 'support') {
    activePage = 'support';
    app.className = 'min-h-screen w-full bg-surface-50 flex flex-col';
    app.innerHTML = renderSupport();
    bindSupportEvents(() => {
      window.location.hash = '';
      activePage = user ? 'dashboard' : 'login';
      mount();
    });
    return;
  }

  if (!user) {
    app.className = 'min-h-screen w-full bg-surface-50 flex flex-col';
    app.innerHTML = renderLogin();
    bindLoginEvents(() => {
      activePage = 'dashboard';
      mount();
    });
    document.querySelectorAll('.nav-footer-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href === '#guide') {
          window.location.hash = 'guide';
          activePage = 'guide';
          mount();
        } else if (href === '#support') {
          window.location.hash = 'support';
          activePage = 'support';
          mount();
        }
      });
    });
    return;
  }

  app.className = 'flex min-h-screen bg-surface-50';
  app.innerHTML = `
    ${renderSidebar(user)}
    <main class="flex-1 lg:ml-60 flex flex-col min-h-screen transition-all">
      ${renderTopbar()}
      <div class="flex-1 p-5 lg:p-7 flex flex-col gap-5" id="pageContent"></div>
    </main>
    ${renderModal()}
    <div class="fixed top-5 right-5 flex flex-col gap-2 z-[300]" id="toastContainer"></div>
  `;
  renderPage();
  bindGlobalEvents();
}

let globalEventsBound = false;
function bindGlobalEvents() {
  if (globalEventsBound) return;
  globalEventsBound = true;

  // Navigation (delegating main nav and submenu link clicks)
  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-link') || e.target.closest('.nav-sub-link');
    if (navLink) {
      e.preventDefault();
      
      const hasSubmenu = navLink.dataset.hasSubmenu === 'true';
      const page = navLink.dataset.nav;
      
      if (hasSubmenu) {
        // Toggle submenu dropdown height smoothly
        const submenu = document.getElementById(`submenu-${page}`);
        const chevron = navLink.querySelector('svg:last-child');
        
        if (submenu) {
          const isCollapsed = submenu.classList.contains('max-h-0');
          if (isCollapsed) {
            submenu.classList.remove('max-h-0', 'opacity-0');
            submenu.classList.add('max-h-24', 'opacity-100');
            chevron?.classList.add('rotate-90');
          } else {
            submenu.classList.remove('max-h-24', 'opacity-100');
            submenu.classList.add('max-h-0', 'opacity-0');
            chevron?.classList.remove('rotate-90');
          }
        }
        return; // Just toggle, don't perform page redirect
      }
      
      if (page) {
        // Reset page states when switching
        if (page !== 'quotations') resetQuotationState();
        if (page !== 'customers') resetCustomerState();
        if (page !== 'products' && page !== 'products-catalog' && page !== 'products-brands') resetProductState();
        navigateTo(page);
        
        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.add('-translate-x-full');
        sidebar?.classList.remove('translate-x-0');
      }
    }
  });

  // Mobile menu
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('#menuToggle');
    if (toggle) {
      const sidebar = document.getElementById('sidebar');
      sidebar?.classList.toggle('-translate-x-full');
      sidebar?.classList.toggle('translate-x-0');
    }
  });

  // Profile click
  document.addEventListener('click', (e) => {
    const profileContainer = e.target.closest('#sidebarProfileContainer');
    if (profileContainer) {
      if (activePage !== 'profile') {
        navigateTo('profile');
        
        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.add('-translate-x-full');
        sidebar?.classList.remove('translate-x-0');
      }
    }
  });

  // Modal interactions
  document.addEventListener('click', (e) => {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('createModal');

    const resetModal = () => {
      // Reset to "existing customer" mode
      document.getElementById('modeExisting')?.classList.add('bg-white', 'shadow-sm', 'text-brand-700');
      document.getElementById('modeExisting')?.classList.remove('text-surface-500');
      document.getElementById('modeNew')?.classList.remove('bg-white', 'shadow-sm', 'text-brand-700');
      document.getElementById('modeNew')?.classList.add('text-surface-500');
      document.getElementById('panelExisting')?.classList.remove('hidden');
      document.getElementById('panelNew')?.classList.add('hidden');
      document.getElementById('panelNew')?.classList.remove('flex');

      // Clear customer dropdown & hide PIC area
      const custSel = document.getElementById('modalExistingCustomer');
      if (custSel) custSel.value = '';
      const picArea = document.getElementById('existingPicArea');
      if (picArea) { picArea.classList.add('hidden'); picArea.classList.remove('flex'); }
      const picName = document.getElementById('existingPicName');
      const picPhone = document.getElementById('existingPicPhone');
      if (picName) picName.value = '';
      if (picPhone) picPhone.value = '';

      // Reset new customer fields
      const newPT = document.getElementById('modalNewPT');
      if (newPT) newPT.value = '';
      // Reset PIC list to 1 empty row
      const picList = document.getElementById('picList');
      if (picList) {
        picList.innerHTML = `
          <div class="pic-row flex items-center gap-2">
            <div class="flex-1">
              <input type="text" placeholder="Nama PIC" class="pic-name bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 w-full" />
            </div>
            <div class="flex-1">
              <input type="text" placeholder="No. Telp PIC" class="pic-phone bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 w-full" />
            </div>
            <button type="button" class="remove-pic-btn text-surface-300 hover:text-red-500 p-1.5 rounded-lg transition-colors opacity-0 pointer-events-none">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>`;
      }

      // Reset expiry to 7
      const expiry = document.getElementById('modalExpiry');
      if (expiry) expiry.value = '7';

      // Pre-fill sales from current user
      const user = getCurrentUser();
      const salesInput = document.getElementById('modalSalesName');
      if (salesInput) salesInput.value = user?.name || '';
    };

    const openModal = () => {
      overlay?.classList.remove('opacity-0', 'pointer-events-none');
      overlay?.classList.add('opacity-100');
      modal?.classList.remove('translate-y-4', 'scale-[0.97]');
      modal?.classList.add('translate-y-0', 'scale-100');
      resetModal();
    };
    const closeModal = () => {
      overlay?.classList.add('opacity-0', 'pointer-events-none');
      overlay?.classList.remove('opacity-100');
      modal?.classList.add('translate-y-4', 'scale-[0.97]');
      modal?.classList.remove('translate-y-0', 'scale-100');
    };

    if (e.target.closest('#createQuotation')) { e.preventDefault(); openModal(); return; }
    if (e.target.closest('#modalClose') || e.target.closest('#modalCancelBtn')) { e.preventDefault(); closeModal(); return; }
    if (e.target === overlay) { closeModal(); return; }

    // Toggle existing/new customer mode
    if (e.target.closest('#modeExisting')) {
      document.getElementById('modeExisting')?.classList.add('bg-white', 'shadow-sm', 'text-brand-700');
      document.getElementById('modeExisting')?.classList.remove('text-surface-500');
      document.getElementById('modeNew')?.classList.remove('bg-white', 'shadow-sm', 'text-brand-700');
      document.getElementById('modeNew')?.classList.add('text-surface-500');
      document.getElementById('panelExisting')?.classList.remove('hidden');
      document.getElementById('panelNew')?.classList.add('hidden');
      document.getElementById('panelNew')?.classList.remove('flex');
      return;
    }
    if (e.target.closest('#modeNew')) {
      document.getElementById('modeNew')?.classList.add('bg-white', 'shadow-sm', 'text-brand-700');
      document.getElementById('modeNew')?.classList.remove('text-surface-500');
      document.getElementById('modeExisting')?.classList.remove('bg-white', 'shadow-sm', 'text-brand-700');
      document.getElementById('modeExisting')?.classList.add('text-surface-500');
      document.getElementById('panelNew')?.classList.remove('hidden');
      document.getElementById('panelNew')?.classList.add('flex');
      document.getElementById('panelExisting')?.classList.add('hidden');
      return;
    }

    // Add PIC row
    if (e.target.closest('#addPicBtn')) {
      const picList = document.getElementById('picList');
      if (!picList) return;
      const row = document.createElement('div');
      row.className = 'pic-row flex items-center gap-2';
      row.innerHTML = `
        <div class="flex-1">
          <input type="text" placeholder="Nama PIC" class="pic-name bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 w-full" />
        </div>
        <div class="flex-1">
          <input type="text" placeholder="No. Telp PIC" class="pic-phone bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-sm text-surface-700 outline-none focus:border-brand-500 w-full" />
        </div>
        <button type="button" class="remove-pic-btn text-surface-300 hover:text-red-500 p-1.5 rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      picList.appendChild(row);
      // Update remove buttons visibility
      const rows = picList.querySelectorAll('.pic-row');
      rows.forEach((r, i) => {
        const btn = r.querySelector('.remove-pic-btn');
        if (rows.length === 1) { btn.classList.add('opacity-0', 'pointer-events-none'); }
        else { btn.classList.remove('opacity-0', 'pointer-events-none'); }
      });
      return;
    }

    // Remove PIC row
    if (e.target.closest('.remove-pic-btn')) {
      const row = e.target.closest('.pic-row');
      row?.remove();
      const picList = document.getElementById('picList');
      const rows = picList?.querySelectorAll('.pic-row');
      if (rows?.length === 1) {
        rows[0].querySelector('.remove-pic-btn')?.classList.add('opacity-0', 'pointer-events-none');
      }
      return;
    }

    // Generate / submit modal
    if (e.target.closest('#modalGenerateBtn')) {
      e.preventDefault();
      const isNewMode = !document.getElementById('panelNew')?.classList.contains('hidden');
      let customerName = '';
      let pic = '';
      let phone = '';
      let email = '';

      if (isNewMode) {
        customerName = document.getElementById('modalNewPT')?.value.trim();
        const picRows = document.querySelectorAll('#picList .pic-row');
        const pics = [];
        picRows.forEach(row => {
          const n = row.querySelector('.pic-name')?.value.trim();
          const p = row.querySelector('.pic-phone')?.value.trim();
          const e = row.querySelector('.pic-email')?.value.trim();
          if (n) pics.push({ name: n, phone: p, email: e });
        });
        if (!customerName) { showToast('Nama PT / Perusahaan wajib diisi!', 'error'); return; }
        if (pics.length === 0 || !pics[0].name) { showToast('Minimal 1 nama PIC wajib diisi!', 'error'); return; }
        pic = pics[0].name;
        phone = pics[0].phone;
        email = pics[0].email;
        // Add new customer to in-memory CUSTOMERS array
        const newId = 'C' + String(CUSTOMERS.length + 1).padStart(3, '0');
        CUSTOMERS.push({ id: newId, name: customerName, pic, phone, email, pics: pics.slice(1), totalSpend: 0 });
      } else {
        const sel = document.getElementById('modalExistingCustomer');
        customerName = sel?.value;
        if (!customerName) { showToast('Pilih customer terlebih dahulu!', 'error'); return; }
        // Read from the editable PIC inputs (pre-filled but may have been changed)
        pic = document.getElementById('existingPicName')?.value.trim() || '';
        phone = document.getElementById('existingPicPhone')?.value.trim() || '';
        email = document.getElementById('existingPicEmail')?.value.trim() || '';
        if (!pic) { showToast('Nama PIC wajib diisi!', 'error'); return; }
        
        // Save new PIC back to customer master data if it doesn't exist
        const cust = CUSTOMERS.find(c => c.name === customerName);
        if (cust) {
          cust.pics = cust.pics || [];
          const exists = cust.pic === pic || cust.pics.some(p => p.name === pic);
          if (!exists) {
            cust.pics.push({ name: pic, phone, email });
          }
        }
      }

      const salesName = document.getElementById('modalSalesName')?.value.trim();
      if (!salesName) { showToast('Nama sales wajib diisi!', 'error'); return; }

      const expiry = parseInt(document.getElementById('modalExpiry')?.value) || 7;
      const today = new Date();
      const expired = new Date(today);
      expired.setDate(today.getDate() + expiry);
      const dateStr = today.toISOString().split('T')[0];
      const expiredStr = expired.toISOString().split('T')[0];

      // Generate quotation number
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = String(today.getFullYear()).slice(2);
      const seq = String(QUOTATIONS.length + 1).padStart(3, '0');
      const newId = `QO5.${year}${month}.${seq}`;

      const newQuotation = {
        id: newId,
        customer: customerName,
        pic,
        phone,
        email,
        brand: '',
        items: [],
        sales: salesName,
        date: dateStr,
        expired: expiredStr,
        status: 'draft',
        ppnRate: 0.11
      };
      QUOTATIONS.unshift(newQuotation);

      // Close modal
      overlay?.classList.add('opacity-0', 'pointer-events-none');
      overlay?.classList.remove('opacity-100');
      modal?.classList.add('translate-y-4', 'scale-[0.97]');
      modal?.classList.remove('translate-y-0', 'scale-100');

      showToast(`Quotation ${newId} berhasil dibuat!`, 'success');

      // Navigate to quotations and open edit mode for the new quotation
      openEditQuotation(newId);
      activePage = 'quotations';
      renderPage();
      return;
    }
  });

  // Existing customer: when selected, load PICs into dropdown
  document.addEventListener('change', (e) => {
    if (e.target.id === 'modalExistingCustomer') {
      const val = e.target.value;
      const cust = CUSTOMERS.find(c => c.name === val);
      const picArea = document.getElementById('existingPicArea');
      const picSelect = document.getElementById('existingPicSelect');
      
      if (cust && picArea && picSelect) {
        picArea.classList.remove('hidden');
        picArea.classList.add('flex');
        
        // Gather all PICs
        const allPics = [];
        if (cust.pic) allPics.push({ name: cust.pic, phone: cust.phone || '', email: cust.email || '' });
        if (cust.pics && Array.isArray(cust.pics)) {
          cust.pics.forEach(p => {
            if (!allPics.find(x => x.name === p.name)) allPics.push(p);
          });
        }
        
        picSelect.innerHTML = allPics.map((p, i) => `<option value="${i}">${p.name} (${p.phone})</option>`).join('') + `<option value="new">+ Tambah PIC Baru...</option>`;
        picSelect.dataset.pics = JSON.stringify(allPics);
        
        // Trigger select change to fill inputs with first PIC
        picSelect.value = "0";
        picSelect.dispatchEvent(new Event('change', { bubbles: true }));

      } else if (picArea) {
        picArea.classList.add('hidden');
        picArea.classList.remove('flex');
      }
    }
  });

  // Handle existing PIC select change
  document.addEventListener('change', (e) => {
    if (e.target.id === 'existingPicSelect') {
      const val = e.target.value;
      const picName = document.getElementById('existingPicName');
      const picPhone = document.getElementById('existingPicPhone');
      const picEmail = document.getElementById('existingPicEmail');
      
      if (val === 'new') {
        if (picName) { picName.value = ''; picName.focus(); }
        if (picPhone) picPhone.value = '';
        if (picEmail) picEmail.value = '';
      } else {
        const pics = JSON.parse(e.target.dataset.pics || '[]');
        const p = pics[parseInt(val)];
        if (p) {
          if (picName) picName.value = p.name || '';
          if (picPhone) picPhone.value = p.phone || '';
          if (picEmail) picEmail.value = p.email || '';
        }
      }
    }
  });

  // Logout action
  document.addEventListener('click', (e) => {
    const logoutBtn = e.target.closest('#logoutBtn');
    if (logoutBtn) {
      e.preventDefault();
      localStorage.removeItem('activ_user');
      showToast('Anda telah keluar dari sistem.', 'info');
      mount();
    }
  });

  // Global search
  document.addEventListener('keydown', (e) => {
    const searchInput = e.target.closest('#globalSearch');
    if (searchInput && e.key === 'Enter' && searchInput.value.trim()) {
      navigateTo('quotations');
    }
  });
}

// ---- Init ----
window.addEventListener('hashchange', mount);
document.addEventListener('DOMContentLoaded', mount);
mount();
