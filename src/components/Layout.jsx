import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import QuotationModal from './QuotationModal';
import useAuthStore from '../store/authStore';
import { useMaintenanceMode } from '../hooks/useSupabase';
import MaintenanceScreen from './MaintenanceScreen';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const { user } = useAuthStore();
  const { data: maintenanceSettings, isLoading } = useMaintenanceMode();

  // If loading maintenance state, show a clean loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <path d="M6 24L16 4L26 24" stroke="#00A88F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 18H22" stroke="#009680" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-brand-600">Sinkronisasi status portal...</span>
      </div>
    );
  }

  // Check if maintenance mode is active and affects the current domain
  const isMaintenanceActive = maintenanceSettings?.enabled;
  const affectedDomains = maintenanceSettings?.domains || [];

  // If specific domains are configured, check if current domain is affected
  const currentDomain = window.location.hostname.toLowerCase();
  const isDomainAffected = affectedDomains.length === 0 || affectedDomains.some(d => {
    const cleanDomain = d.trim().toLowerCase();
    return currentDomain === cleanDomain || currentDomain.endsWith('.' + cleanDomain);
  });

  // Admin and Administrator are exempt from maintenance mode block
  const isAdminUser = ['admin', 'Administrator'].includes(user?.role);
  const isUserBlocked = isMaintenanceActive && isDomainAffected && !isAdminUser;

  if (isUserBlocked) {
    return <MaintenanceScreen domains={affectedDomains} />;
  }

  return (
    <div className="flex min-h-screen bg-surface-50">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-1 lg:ml-60 flex flex-col min-h-screen transition-all">
        <Topbar 
          setMobileOpen={setMobileOpen} 
          openQuotationModal={() => setIsQuotationModalOpen(true)} 
        />
        <div className="flex-1 p-5 lg:p-7 flex flex-col gap-5">
          <Outlet />
        </div>
      </main>
      
      <QuotationModal 
        isOpen={isQuotationModalOpen} 
        onClose={() => setIsQuotationModalOpen(false)} 
      />
    </div>
  );
}

