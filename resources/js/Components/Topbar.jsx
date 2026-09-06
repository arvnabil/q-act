import React, { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, Plus, CheckCheck, Trash2, Info, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';

const PAGE_CONFIG = {
    '/dashboard': { title: 'Dashboard', subtitle: 'Overview kinerja quotation bulan ini' },
    '/quotations': { title: 'Quotations', subtitle: 'Kelola semua penawaran harga' },
    '/sales-orders': { title: 'Sales Orders', subtitle: 'Manajemen sales orders' },
    '/customers': { title: 'Customers', subtitle: 'Manajemen data pelanggan' },
    '/products': { title: 'Products', subtitle: 'Katalog produk per brand' },
    '/brands': { title: 'Brands', subtitle: 'Manajemen brand produk' },
    '/analytics': { title: 'Analytics', subtitle: 'Laporan dan analisis mendalam' },
    '/settings': { title: 'Settings', subtitle: 'Pengaturan sistem quotation' },
    '/profile': { title: 'Profil Pengguna', subtitle: 'Kelola informasi akun dan pengaturan profil' },
};

function NotifIcon({ title }) {
    const t = (title || '').toLowerCase();
    if (t.includes('disetujui') || t.includes('selesai') || t.includes('baru')) return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    if (t.includes('hapus') || t.includes('batal') || t.includes('reject')) return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
    if (t.includes('perbarui') || t.includes('status')) return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    return <Info className="w-4 h-4 text-brand-500 shrink-0" />;
}

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}h lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function Topbar({ setMobileOpen }) {
    const { url, props } = usePage();
    const pathname = new URL(url, window.location.origin).pathname;
    const config = PAGE_CONFIG[pathname] || PAGE_CONFIG['/dashboard'] || { title: 'Portal', subtitle: 'Sales Portal' };

    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);

    const initialNotifs = props.notifications || [];
    const initialUnread = props.unread_count || 0;

    const [notifications, setNotifications] = useState(initialNotifs);
    const [unreadCount, setUnreadCount] = useState(initialUnread);

    // Update state when page props change
    useEffect(() => {
        setNotifications(props.notifications || []);
        setUnreadCount(props.unread_count || 0);
    }, [props.notifications, props.unread_count]);

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

    const handleNotifClick = async (notif) => {
        if (!notif.is_read) {
            try {
                await axios.post(`/notifications/${notif.id}/read`);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (e) {
                console.error(e);
            }
        }
        setNotifOpen(false);
        if (notif.link) {
            router.visit(notif.link);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await axios.post('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await axios.delete(`/notifications/${id}`);
            const deleted = notifications.find(n => n.id === id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (deleted && !deleted.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (e) {
            console.error(e);
        }
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
                            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-brand-600" />
                                    <span className="font-bold text-sm text-surface-900">Notifikasi</span>
                                    {unreadCount > 0 && (
                                        <span className="bg-brand-50 text-brand-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                            {unreadCount} baru
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={handleMarkAllRead} 
                                            className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" /> Tandai Semua dibaca
                                        </button>
                                    )}
                                    <button onClick={() => setNotifOpen(false)} className="p-1 hover:bg-surface-100 rounded-lg transition-colors cursor-pointer">
                                        <X className="w-3.5 h-3.5 text-surface-400" />
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[420px] overflow-y-auto divide-y divide-surface-100">
                                {notifications.length > 0 ? (
                                    notifications.map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotifClick(notif)}
                                            className={`p-3.5 flex items-start gap-3 hover:bg-surface-50 transition-colors cursor-pointer group ${
                                                !notif.is_read ? 'bg-brand-50/40' : ''
                                            }`}
                                        >
                                            <div className="mt-0.5">
                                                <NotifIcon title={notif.title} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className={`text-xs font-semibold ${!notif.is_read ? 'text-brand-900' : 'text-surface-800'}`}>
                                                        {notif.title}
                                                    </span>
                                                    <span className="text-[10px] text-surface-400 shrink-0">
                                                        {timeAgo(notif.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-surface-600 line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(e, notif.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-200 rounded text-surface-400 hover:text-red-500 transition-all shrink-0 cursor-pointer"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-surface-400">
                                        <Bell className="w-8 h-8 opacity-30" />
                                        <span className="text-xs font-medium">Belum ada notifikasi</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <Link 
                    href="/quotations/create"
                    className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Buat Quotation</span>
                </Link>
            </div>
        </header>
    );
}
