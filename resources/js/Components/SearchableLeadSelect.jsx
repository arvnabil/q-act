import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Building2 } from 'lucide-react';

export default function SearchableLeadSelect({
    leads = [],
    value = '',
    onChange,
    customerId = null,
    placeholder = '-- Pilih Lead Aktif --',
    required = false,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opening dropdown
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        } else {
            setSearch('');
        }
    }, [isOpen]);

    // Find currently selected lead
    const selectedLead = useMemo(() => {
        if (!value) return null;
        return (leads || []).find((l) => String(l.id) === String(value)) || null;
    }, [leads, value]);

    // Filter leads based on search query
    const filteredLeads = useMemo(() => {
        const list = leads || [];
        if (!search.trim()) return list;

        const q = search.toLowerCase().trim();
        return list.filter((l) => {
            const title = (l.title || '').toLowerCase();
            const code = (l.lead_code || '').toLowerCase();
            const custName = (l.customer?.name || l.customer_name || '').toLowerCase();
            return title.includes(q) || code.includes(q) || custName.includes(q);
        });
    }, [leads, search]);

    // Separate into customer-matching leads and other leads
    const { customerLeads, otherLeads } = useMemo(() => {
        if (!customerId) {
            return { customerLeads: [], otherLeads: filteredLeads };
        }
        const custMatch = [];
        const others = [];
        filteredLeads.forEach((l) => {
            if (l.customer_id && String(l.customer_id) === String(customerId)) {
                custMatch.push(l);
            } else {
                others.push(l);
            }
        });
        return { customerLeads: custMatch, otherLeads: others };
    }, [filteredLeads, customerId]);

    const handleSelect = (lead) => {
        onChange?.(lead ? lead.id : '');
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange?.('');
    };

    const isCustomerMatch = selectedLead && customerId && String(selectedLead.customer_id) === String(customerId);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Hidden native input for required form validation */}
            {required && (
                <input
                    type="text"
                    value={value || ''}
                    required={required}
                    readOnly
                    tabIndex={-1}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    aria-hidden="true"
                />
            )}

            {/* Trigger Button */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                tabIndex={0}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsOpen(!isOpen);
                    } else if (e.key === 'Escape') {
                        setIsOpen(false);
                    }
                }}
                className={`w-full min-h-[42px] px-3 py-2 bg-white border rounded-lg text-sm flex items-center justify-between gap-2 cursor-pointer transition-all ${
                    isOpen
                        ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-xs'
                        : 'border-surface-300 hover:border-surface-400'
                }`}
            >
                <div className="flex-1 truncate">
                    {selectedLead ? (
                        <div className="flex items-center gap-1.5 truncate">
                            {selectedLead.lead_code && (
                                <span className="shrink-0 font-mono text-xs font-bold text-surface-600 bg-surface-100 px-1.5 py-0.5 rounded">
                                    [{selectedLead.lead_code}]
                                </span>
                            )}
                            <span className="font-semibold text-surface-800 truncate">
                                {selectedLead.title}
                            </span>
                            {isCustomerMatch && (
                                <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                                    ⭐ Customer Ini
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-surface-400 font-normal">{placeholder}</span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0 text-surface-400">
                    {selectedLead && (
                        <button
                            type="button"
                            onClick={handleClear}
                            title="Hapus pilihan"
                            className="p-1 hover:text-surface-700 hover:bg-surface-100 rounded transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-600' : ''}`}
                    />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-[1000] bg-white rounded-xl border border-surface-200 shadow-xl overflow-hidden animate-scale-in">
                    {/* Search Input Box */}
                    <div className="p-2 border-b border-surface-100 bg-surface-50/70">
                        <div className="relative flex items-center">
                            <Search className="w-4 h-4 text-surface-400 absolute left-2.5 pointer-events-none" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Ketik kode, nama lead, atau customer..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 text-surface-400 hover:text-surface-600 p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-surface-100 text-xs">
                        {filteredLeads.length === 0 ? (
                            <div className="py-6 px-4 text-center text-surface-400">
                                <p className="font-medium">Tidak ada lead yang cocok</p>
                                <p className="text-[11px] mt-0.5">Coba gunakan kata kunci pencarian yang lain.</p>
                            </div>
                        ) : (
                            <>
                                {/* Group: Customer-matching leads */}
                                {customerLeads.length > 0 && (
                                    <div>
                                        <div className="bg-emerald-50/80 px-3 py-1.5 text-[10px] font-bold text-emerald-800 tracking-wider uppercase flex items-center justify-between border-b border-emerald-100">
                                            <span>⭐ Lead Milik Customer Ini</span>
                                            <span className="font-normal text-emerald-600">Disarankan</span>
                                        </div>
                                        <div className="p-1 space-y-0.5">
                                            {customerLeads.map((lead) => {
                                                const isSelected = String(lead.id) === String(value);
                                                return (
                                                    <div
                                                        key={lead.id}
                                                        onClick={() => handleSelect(lead)}
                                                        className={`px-3 py-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? 'bg-brand-50 text-brand-900 font-semibold'
                                                                : 'hover:bg-surface-50 text-surface-700'
                                                        }`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                {lead.lead_code && (
                                                                    <span className="font-mono text-[11px] font-bold text-brand-700">
                                                                        [{lead.lead_code}]
                                                                    </span>
                                                                )}
                                                                <span className="truncate">{lead.title}</span>
                                                            </div>
                                                            {(lead.customer?.name || lead.customer_name) && (
                                                                <div className="text-[10px] text-surface-400 flex items-center gap-1 mt-0.5">
                                                                    <Building2 className="w-2.5 h-2.5" />
                                                                    <span className="truncate">{lead.customer?.name || lead.customer_name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <Check className="w-4 h-4 text-brand-600 shrink-0" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Group: Other leads */}
                                {otherLeads.length > 0 && (
                                    <div>
                                        {customerLeads.length > 0 && (
                                            <div className="bg-surface-100/60 px-3 py-1 text-[10px] font-bold text-surface-500 tracking-wider uppercase">
                                                Lead Lainnya ({otherLeads.length})
                                            </div>
                                        )}
                                        <div className="p-1 space-y-0.5">
                                            {otherLeads.map((lead) => {
                                                const isSelected = String(lead.id) === String(value);
                                                return (
                                                    <div
                                                        key={lead.id}
                                                        onClick={() => handleSelect(lead)}
                                                        className={`px-3 py-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? 'bg-brand-50 text-brand-900 font-semibold'
                                                                : 'hover:bg-surface-50 text-surface-700'
                                                        }`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                {lead.lead_code && (
                                                                    <span className="font-mono text-[11px] font-bold text-surface-500">
                                                                        [{lead.lead_code}]
                                                                    </span>
                                                                )}
                                                                <span className="truncate">{lead.title}</span>
                                                            </div>
                                                            {(lead.customer?.name || lead.customer_name) && (
                                                                <div className="text-[10px] text-surface-400 flex items-center gap-1 mt-0.5">
                                                                    <Building2 className="w-2.5 h-2.5" />
                                                                    <span className="truncate">{lead.customer?.name || lead.customer_name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <Check className="w-4 h-4 text-brand-600 shrink-0" />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
