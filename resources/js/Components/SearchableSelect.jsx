import React, { useState } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronDown, Search } from 'lucide-react';

export default function SearchableSelect({
    options = [],
    value = '',
    onChange,
    placeholder = 'Cari atau pilih...',
    emptyLabel = 'Pilihan tidak ditemukan.',
    required = false,
    disabled = false,
    className = '',
    inputClassName = '',
    'aria-label': ariaLabel = 'Cari pilihan',
}) {
    const [query, setQuery] = useState('');
    const normalizedOptions = options.map(option => typeof option === 'object'
        ? { value: String(option.value ?? option.id ?? ''), label: String(option.label ?? option.name ?? '') }
        : { value: String(option), label: String(option) });
    const selected = normalizedOptions.find(option => option.value === String(value)) || null;
    const matches = normalizedOptions.filter(option => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

    return (
        <Combobox
            value={selected}
            onChange={option => onChange(option?.value ?? '')}
            onClose={() => setQuery('')}
            disabled={disabled}
            by="value"
        >
            <div className={`relative ${className}`}>
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <ComboboxInput
                    aria-label={ariaLabel}
                    displayValue={option => option?.label || ''}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={placeholder}
                    required={required && !value}
                    autoComplete="off"
                    className={`w-full rounded-xl border border-surface-200 bg-white py-2.5 pl-9 pr-10 text-sm text-surface-800 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-50 disabled:cursor-not-allowed disabled:bg-surface-100 ${inputClassName}`}
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-3 text-surface-500" aria-label="Buka pilihan">
                    <ChevronDown className="h-4 w-4" />
                </ComboboxButton>
                <ComboboxOptions anchor="bottom" className="z-[100010] mt-1 max-h-60 w-[var(--input-width)] overflow-y-auto rounded-xl border border-surface-200 bg-white p-1 shadow-lg empty:hidden">
                    {matches.map(option => (
                        <ComboboxOption key={option.value} value={option} className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-surface-700 data-[focus]:bg-brand-50 data-[selected]:font-semibold data-[selected]:text-brand-700">
                            <span>{option.label}</span>
                            <Check className="hidden h-4 w-4 shrink-0 group-data-[selected]:block" />
                        </ComboboxOption>
                    ))}
                    {!matches.length && <p className="px-3 py-3 text-sm text-surface-500">{emptyLabel}</p>}
                </ComboboxOptions>
            </div>
        </Combobox>
    );
}
