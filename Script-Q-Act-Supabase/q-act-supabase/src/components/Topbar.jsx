import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, Plus, Check, CheckCheck, Trash2, Loader2, Info, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useDeleteNotification } from '../hooks/useSupabase.js';
import useAuthStore from '../store/authStore.js';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

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

function timeAgo(dateStr) {
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return '';
    return formatDistanceToNow(d, { addSuffix: true, locale: idLocale });
  } catch { return ''; }
}

function NotifIcon({ type }) {
  if (type === 'success' || type === 'approved') return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (type === 'warning' || type === 'rejected') return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
  if (type === 'error') return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <Info className="w-4 h-4 text-brand-500 shrink-0" />;
}

export default function Topbar({ setMobileOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const config = PAGE_CONFIG[location.pathname] || PAGE_CONFIG['/'];

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const { data: notifications = [], isLoading: loadingNotifs } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotif = useDeleteNotification();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (notif) => {
    if (!notif.is_read) markRead.mutate(notif.id);
    if (notif.link) navigate(notif.link);
    setNotifOpen(false);
  };

  const handleMarkAllRead = () => {
    if (user?.id) markAllRead.mutate(user.id);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    deleteNotif.mutate(id);
  };

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

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(prev => !prev)}
            className="relative p-2 text-surface-400 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer"
            title="Notifikasi"
          >
            <Bell className={`w-5 h-5 transition-all ${notifOpen ? 'text-brand-600' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-surface-200 z-50 overflow-hidden animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-600" />
                  <span className="font-bold text-sm text-surface-900">Notifikasi</span>
                  {unreadCount > 0 && (
                    <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} baru
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
                      title="Tandai semua sudah dibaca"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Baca semua
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="p-1 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer">
                    <X className="w-3.5 h-3.5 text-surface-400" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[420px] overflow-y-auto">
                {loadingNotifs ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                    <span className="text-xs text-surface-400">Memuat notifikasi...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-surface-400">
                    <Bell className="w-8 h-8 opacity-30" />
                    <span className="text-xs font-medium">Belum ada notifikasi</span>
                  </div>
                ) : (
                  <div className="divide-y divide-surface-50">
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group ${
                          notif.is_read ? 'hover:bg-surface-50/70' : 'bg-brand-50/40 hover:bg-brand-50/70'
                        }`}
                      >
                        {/* Unread dot */}
                        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                          <NotifIcon type={notif.type} />
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-snug mb-0.5 ${notif.is_read ? 'text-surface-700' : 'font-semibold text-surface-900'}`}>
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-surface-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] text-surface-400 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, notif.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 hover:text-red-500 text-surface-400 transition-all"
                          title="Hapus notifikasi"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-surface-100 text-center">
                  <span className="text-[11px] text-surface-400">{notifications.length} notifikasi total</span>
                </div>
              )}
            </div>
          )}
        </div>

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
