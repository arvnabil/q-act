import React from 'react';

export const MANAGEMENT_PAGES = {
    '/users': { title: 'Manajemen User', subtitle: 'Kelola pengguna, role, dan akses masuk tim.' },
    '/roles': { title: 'Roles & Hak Akses', subtitle: 'Kelola izin fitur dan cakupan data untuk setiap role.' },
    '/business-units': { title: 'Business Units', subtitle: 'Kelola anggota BU dan berbagi data sesuai permission role.' },
};

export default function ManagementPageHeader({ page, icon: Icon, children }) {
    const { title, subtitle } = MANAGEMENT_PAGES[page];
    return <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-surface-900">
                <Icon className="w-6 h-6 shrink-0 text-brand-600" />{title}
            </h1>
            <p className="mt-1 text-sm text-surface-500">{subtitle}</p>
        </div>
        {children && <div className="shrink-0">{children}</div>}
    </div>;
}
