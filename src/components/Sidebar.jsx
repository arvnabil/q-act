import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { LayoutDashboard, FileText, Users, Box, Settings, LogOut, ChevronRight, BarChart2, ShieldCheck } from 'lucide-react';
import { useQuotations, useQuotationsByUser } from '../hooks/useSupabase.js';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user, signOut } = useAuthStore();
  const isManager = user?.role === 'admin' || user?.role === 'Sales Manager';

  const allQuotations  = useQuotations();
  const mineQuotations = useQuotationsByUser(user?.id);
  const quotationsData = isManager ? allQuotations.data : mineQuotations.data;
  const quotationsCount = quotationsData?.length || 0;

  const mainNav = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/quotations', label: 'Quotations', icon: FileText, badge: quotationsCount },
    { path: '/customers', label: 'Customers', icon: Users },
    { 
      path: '/products-group', 
      label: 'Products', 
      icon: Box,
      submenu: [
        { path: '/products', label: 'Katalog Produk' },
        { path: '/brands', label: 'Kelola Brand' },
      ]
    },
  ];

  if (!user) return null;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`w-60 h-screen bg-white border-r border-surface-200 flex flex-col fixed left-0 top-0 z-50 shrink-0 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} id="sidebar">
        
        <div className="px-5 py-5 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <path d="M6 24L16 4L26 24" stroke="#00A88F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 18H22" stroke="#009680" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-wide text-brand-700">ACTiV</span>
              <span className="text-[10px] text-surface-400 font-medium">Sales Portal</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="mb-5">
            <span className="text-[10px] font-bold text-surface-400 tracking-widest uppercase px-3 mb-2 block">MAIN</span>
            <div className="flex flex-col gap-0.5">
              {mainNav.map((n) => (
                <div key={n.label} className="flex flex-col">
                  {n.submenu ? (
                    <>
                      <div className="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative text-surface-500 hover:bg-surface-100 hover:text-surface-700">
                        <n.icon className="w-5 h-5" />
                        <span>{n.label}</span>
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </div>
                      <div className="flex flex-col gap-0.5 mt-1 ml-4 border-l border-surface-200 pl-2">
                        {n.submenu.map(sub => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) => `flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive ? 'text-brand-700 bg-brand-50/50' : 'text-surface-400 hover:bg-surface-50 hover:text-surface-700'}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            {({ isActive }) => (
                              <>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-brand-500' : 'bg-surface-300'}`}></span>
                                <span>{sub.label}</span>
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </>
                  ) : (
                    <NavLink
                      to={n.path}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r"></div>}
                          <n.icon className="w-5 h-5" />
                          <span>{n.label}</span>
                          {n.badge !== undefined && <span className="ml-auto text-xs font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">{n.badge}</span>}
                        </>
                      )}
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-5">
            <span className="text-[10px] font-bold text-surface-400 tracking-widest uppercase px-3 mb-2 block">REPORTS</span>
            <div className="flex flex-col gap-0.5">
              <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${isActive ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`} onClick={() => setMobileOpen(false)}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r"></div>}
                    <BarChart2 className="w-5 h-5" />
                    <span>Analytics</span>
                  </>
                )}
              </NavLink>
              {(user?.role === 'admin' || user?.role === 'Sales Manager') && (
                <NavLink to="/manager" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${isActive ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`} onClick={() => setMobileOpen(false)}>
                  {({ isActive }) => (
                    <>
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r"></div>}
                      <ShieldCheck className="w-5 h-5" />
                      <span>Manager View</span>
                    </>
                  )}
                </NavLink>
              )}
            </div>
          </div>

          {/* Settings — only admin sees this */}
          {user?.role === 'admin' && (
          <div className="mb-5">
            <span className="text-[10px] font-bold text-surface-400 tracking-widest uppercase px-3 mb-2 block">SYSTEM</span>
            <div className="flex flex-col gap-0.5">
              <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${isActive ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`} onClick={() => setMobileOpen(false)}>
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r"></div>}
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                  </>
                )}
              </NavLink>
            </div>
          </div>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-surface-100 flex items-center justify-between">
          <Link to="/profile" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer flex-1 min-w-0" onClick={() => setMobileOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.avatar_initials || user.name?.slice(0, 2).toUpperCase() || 'U'
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-surface-800 truncate">{user.name || user.email}</span>
              <span className="text-[10px] text-surface-400 truncate">
                {user.role === 'admin' ? 'Administrator' : user.role || 'Sales'}
              </span>
            </div>
          </Link>
          <button 
            onClick={signOut}
            className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer" 
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}
