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
            toast.success(flash.message);
        }
        if (flash?.error && lastShownErrorRef.current !== flash.error) {
            lastShownErrorRef.current = flash.error;
            toast.error(flash.error);
        }
    }, [flash?.message, flash?.error]);

    return (
        <div className="flex min-h-screen bg-surface-50">
            <Toaster
                position="bottom-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#ffffff',
                        color: '#1e293b',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
                        borderRadius: '0.75rem',
                        padding: '10px 16px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                    },
                    success: {
                        iconTheme: {
                            primary: '#009680',
                            secondary: '#ffffff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#ffffff',
                        },
                    },
                }}
            />
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
