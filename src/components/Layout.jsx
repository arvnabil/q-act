import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import QuotationModal from './QuotationModal';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);

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
