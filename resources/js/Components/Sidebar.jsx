import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { LayoutDashboard, FileText, Users, Box, Settings, LogOut, ChevronRight, ChevronDown, BarChart2, ShieldCheck, UserCog, FileStack } from 'lucide-react';

export default function Sidebar({ mobileOpen, setMobileOpen }) {
    const { auth } = usePage().props;
    const { user, permissions } = auth;

    const hasPermission = (perm) => {
        if (!permissions) return false;
        if (Array.isArray(permissions)) {
            return permissions.includes(perm);
        }
        return Boolean(permissions[perm]);
    };

    const effectiveRole = user?.spatie_role ?? user?.role;
    const isManager = ['Administrator', 'Sales Manager', 'Manager'].includes(effectiveRole);
    const isAdmin = ['Administrator'].includes(effectiveRole);
    const isFinance = effectiveRole === 'Finance';

    const canAnalytics = user && (isAdmin || isManager || isFinance || hasPermission('view_reports') || hasPermission('analytics'));
    const canManager = user && (isAdmin || isManager || hasPermission('manager_view'));
    const canUserManagement = user && (isAdmin || hasPermission('user_management'));

    const [expandedMenus, setExpandedMenus] = useState({});

    const toggleMenu = (menuName) => {
        setExpandedMenus(prev => ({
            ...prev,
            [menuName]: !prev[menuName]
        }));
    };

    // Assuming quotations count is passed or loaded separately later. 
    // For now we will keep it as undefined (no badge) unless provided.
    const quotationsCount = undefined; 

    const rawNav = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/quotations', label: 'Quotations', icon: FileText, badge: quotationsCount },
        { path: '/sales-orders', label: 'Sales Orders', icon: FileStack },
        { path: '/customers', label: 'Customers', icon: Users, hideForFinance: true },
        { 
            path: '/products-group', 
            label: 'Products', 
            icon: Box,
            hideForFinance: true,
            submenu: [
                { path: '/products', label: 'Katalog Produk' },
                { path: '/brands', label: 'Kelola Brand' },
            ]
        },
    ];

    const mainNav = isFinance ? rawNav.filter(n => !n.hideForFinance) : rawNav;

    if (!user) return null;

    const { url } = usePage();
    const isActiveLink = (path) => url.startsWith(path);
    const isActiveExact = (path) => url === path;

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
                        <div className="w-9 h-9 rounded-lg bg-brand-50/50 p-1 flex items-center justify-center border border-brand-100 overflow-hidden shrink-0">
                            <img src="/logo.png" alt="ACTiV" className="w-full h-full object-contain" onError={(e) => e.target.style.display = 'none'} />
                            <span className="text-brand-700 font-black text-xs" style={{ display: 'none' }}>A</span>
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
                            {mainNav.map((n) => {
                                const active = n.submenu ? n.submenu.some(sub => isActiveLink(sub.path)) : isActiveLink(n.path);
                                const isExpanded = expandedMenus[n.label] ?? active;
                                
                                return (
                                <div key={n.label} className="flex flex-col">
                                    {n.submenu ? (
                                        <>
                                            <div 
                                                onClick={() => toggleMenu(n.label)}
                                                className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative cursor-pointer ${active ? 'text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`}
                                            >
                                                <n.icon className="w-5 h-5" />
                                                <span>{n.label}</span>
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 ml-auto" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 ml-auto" />
                                                )}
                                            </div>
                                            {isExpanded && (
                                                <div className="flex flex-col gap-0.5 mt-1 ml-4 border-l border-surface-200 pl-2">
                                                    {n.submenu.map(sub => {
                                                        const isSubActive = isActiveExact(sub.path);
                                                        return (
                                                        <Link
                                                            key={sub.path}
                                                            href={sub.path}
                                                            className={`flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg text-xs font-semibold transition-all ${isSubActive ? 'text-brand-700 bg-brand-50/50' : 'text-surface-400 hover:bg-surface-50 hover:text-surface-700'}`}
                                                            onClick={() => setMobileOpen(false)}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSubActive ? 'bg-brand-500' : 'bg-surface-300'}`}></span>
                                                            <span>{sub.label}</span>
                                                        </Link>
                                                    )})}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <Link
                                            href={n.path}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${active ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`}
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r"></div>}
                                            <n.icon className="w-5 h-5" />
                                            <span>{n.label}</span>
                                            {n.badge !== undefined && <span className="ml-auto text-xs font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">{n.badge}</span>}
                                        </Link>
                                    )}
                                </div>
                            )})}
                        </div>
                    </div>
                    
                    {(canAnalytics || canManager) && (
                        <div className="mb-5">
                            <span className="text-[10px] font-bold text-surface-400 tracking-widest uppercase px-3 mb-2 block">REPORTS</span>
                            <div className="flex flex-col gap-0.5">
                                {canAnalytics && (
                                    <Link href="/analytics" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${isActiveLink('/analytics') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`} onClick={() => setMobileOpen(false)}>
                                        {isActiveLink('/analytics') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r"></div>}
                                        <BarChart2 className="w-5 h-5" />
                                        <span>Analytics</span>
                                    </Link>
                                )}
                                {canManager && (
                                    <Link href="/manager" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${isActiveLink('/manager') ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`} onClick={() => setMobileOpen(false)}>
                                        {isActiveLink('/manager') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r"></div>}
                                        <ShieldCheck className="w-5 h-5" />
                                        <span>Manager View</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {canUserManagement && (() => {
                        const isUserMgmtActive = ['/users', '/roles', '/business-units'].some(p => isActiveLink(p));
                        const isUserMgmtExpanded = expandedMenus['User Management'] ?? isUserMgmtActive;

                        return (
                        <div className="mb-5">
                            <span className="text-[10px] font-bold text-surface-400 tracking-widest uppercase px-3 mb-2 block">SYSTEM</span>
                            <div className="flex flex-col gap-0.5">
                                
                                {/* User Management Submenu */}
                                <div className="flex flex-col">
                                    <div 
                                        onClick={() => toggleMenu('User Management')}
                                        className={`nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative cursor-pointer ${isUserMgmtActive ? 'text-brand-700 font-semibold' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`}
                                    >
                                        <UserCog className="w-5 h-5" />
                                        <span>User Management</span>
                                        {isUserMgmtExpanded ? (
                                            <ChevronDown className="w-4 h-4 ml-auto" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 ml-auto" />
                                        )}
                                    </div>
                                    {isUserMgmtExpanded && (
                                        <div className="flex flex-col gap-0.5 mt-1 ml-4 border-l border-surface-200 pl-2">
                                            <Link
                                                href="/users"
                                                className={`flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActiveLink('/users') ? 'text-brand-700 bg-brand-50/50' : 'text-surface-400 hover:bg-surface-50 hover:text-surface-700'}`}
                                                onClick={() => setMobileOpen(false)}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActiveLink('/users') ? 'bg-brand-500' : 'bg-surface-300'}`}></span>
                                                <span>Users</span>
                                            </Link>
                                            <Link
                                                href="/roles"
                                                className={`flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActiveLink('/roles') ? 'text-brand-700 bg-brand-50/50' : 'text-surface-400 hover:bg-surface-50 hover:text-surface-700'}`}
                                                onClick={() => setMobileOpen(false)}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActiveLink('/roles') ? 'bg-brand-500' : 'bg-surface-300'}`}></span>
                                                <span>Roles</span>
                                            </Link>
                                            <Link
                                                href="/business-units"
                                                className={`flex items-center gap-2 pl-3 pr-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActiveLink('/business-units') ? 'text-brand-700 bg-brand-50/50' : 'text-surface-400 hover:bg-surface-50 hover:text-surface-700'}`}
                                                onClick={() => setMobileOpen(false)}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActiveLink('/business-units') ? 'bg-brand-500' : 'bg-surface-300'}`}></span>
                                                <span>Business Units</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                <Link href="/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${isActiveLink('/settings') ? 'bg-brand-50 text-brand-700' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`} onClick={() => setMobileOpen(false)}>
                                    {isActiveLink('/settings') && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-500 rounded-r"></div>}
                                    <Settings className="w-5 h-5" />
                                    <span>Settings</span>
                                </Link>
                            </div>
                        </div>
                        );
                    })()}
                </nav>

                <div className="px-4 py-4 border-t border-surface-100 flex items-center justify-between">
                    <Link href="/profile" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-50 transition-colors cursor-pointer flex-1 min-w-0" onClick={() => setMobileOpen(false)}>
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
                                {user.role === 'Administrator' ? 'Administrator' : user.role || 'Sales'}
                            </span>
                        </div>
                    </Link>
                    <Link 
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 cursor-pointer" 
                        title="Keluar"
                    >
                        <LogOut className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </>
    );
}
