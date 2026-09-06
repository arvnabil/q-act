import React, { useState, useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import toast, { Toaster } from 'react-hot-toast';

export default function AuthenticatedLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { flash } = usePage().props;

    const lastShownMessageRef = useRef(null);
    const lastShownErrorRef = useRef(null);

    useEffect(() => {
        if (flash?.message && lastShownMessageRef.current !== flash.message) {
            lastShownMessageRef.current = flash.message;
            toast.success(flash.message, {
                style: {
                    background: '#1F2937', // dark slate
                    color: '#fff',
                    borderRadius: '0.75rem',
                    padding: '12px 16px',
                    fontWeight: '600',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                },
                iconTheme: {
                    primary: '#10B981', // emerald
                    secondary: '#fff',
                },
                duration: 4000,
            });
        }
        if (flash?.error && lastShownErrorRef.current !== flash.error) {
            lastShownErrorRef.current = flash.error;
            toast.error(flash.error, {
                style: {
                    background: '#1F2937',
                    color: '#fff',
                    borderRadius: '0.75rem',
                    padding: '12px 16px',
                    fontWeight: '600',
                },
                iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                }
            });
        }
    }, [flash?.message, flash?.error]);

    return (
        <div className="flex min-h-screen bg-surface-50">
            <Toaster position="bottom-center" />
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <main className="flex-1 lg:ml-60 flex flex-col min-h-screen transition-all min-w-0">
                <Topbar setMobileOpen={setMobileOpen} />
                <div className="flex-1 p-5 lg:p-7 flex flex-col gap-5 min-w-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
