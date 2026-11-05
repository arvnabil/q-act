import React, { useState } from 'react';
import Sidebar from '@/Components/Sidebar';
import Topbar from '@/Components/Topbar';
import FlashMessages from '@/Components/FlashMessages';

export default function AuthenticatedLayout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-surface-50">
            <FlashMessages />
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
