import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore.js';
import Login from './pages/Login.jsx';
import Layout from './components/Layout.jsx';
import Quotations from './pages/Quotations.jsx';
import Customers from './pages/Customers.jsx';
import Products from './pages/Products.jsx';
import Brands from './pages/Brands.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Manager from './pages/Manager.jsx';

function App() {
  const { user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <path d="M6 24L16 4L26 24" stroke="#00A88F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 18H22" stroke="#009680" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="text-sm font-semibold text-brand-600">Memuat ACTiV Portal...</span>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="quotations" element={<Quotations />} />
          <Route path="customers" element={<Customers />} />
          <Route path="products" element={<Products />} />
          <Route path="brands" element={<Brands />} />
          <Route path="analytics" element={<AnalyticsPlaceholder />} />
          <Route path="manager" element={<Manager />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function AnalyticsPlaceholder() {
  return (
    <div className="animate-fade-in-up bg-white rounded-xl border border-surface-200 p-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
      <h3 className="text-base font-bold text-surface-800 mb-1">Analytics</h3>
      <p className="text-sm text-surface-400">Laporan grafik dan analisis mendalam akan tersedia setelah integrasi database Supabase selesai.</p>
    </div>
  );
}

export default App;
