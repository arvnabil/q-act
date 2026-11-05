import React, { useState } from 'react';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Search, ChevronDown, Check } from 'lucide-react';

export default function LeadPicker({ leads = [], value, onChange }) {
    const [query, setQuery] = useState('');
    const selected = leads.find(lead => lead.id === value) || null;
    const matches = leads.filter(lead => [lead.lead_code, lead.title, lead.customer?.name, lead.customer_name].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    return <Combobox value={selected} onChange={lead => onChange(lead?.id || '')} onClose={() => setQuery('')}>
        <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-surface-400" />
            <ComboboxInput aria-label="Cari lead" displayValue={lead => lead ? [lead.lead_code, lead.title].filter(Boolean).join(' · ') : ''} onChange={event => setQuery(event.target.value)} placeholder="Ketik kode, nama lead, atau customer..." className="w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-10 text-sm text-surface-800 focus:border-brand-500 focus:ring-brand-500" />
            <ComboboxButton className="absolute right-0 top-0 p-3 text-surface-500" aria-label="Buka pilihan lead"><ChevronDown className="h-4 w-4" /></ComboboxButton>
            <ComboboxOptions className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-surface-200 bg-white p-1 shadow-lg empty:hidden">
                <ComboboxOption value={null} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-surface-500 data-[focus]:bg-brand-50">Tanpa lead — langsung pilih customer</ComboboxOption>
                {matches.map(lead => <ComboboxOption key={lead.id} value={lead} className="group flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm data-[focus]:bg-brand-50 data-[selected]:text-brand-700"><div><p className="font-semibold">{lead.title}</p><p className="text-xs text-surface-500">{lead.lead_code}{lead.customer?.name || lead.customer_name ? ' · ' + (lead.customer?.name || lead.customer_name) : ''}</p></div><Check className="hidden h-4 w-4 shrink-0 group-data-[selected]:block" /></ComboboxOption>)}
                {!matches.length && <p className="px-3 py-4 text-sm text-surface-500">Lead tidak ditemukan. Coba kata kunci lain.</p>}
            </ComboboxOptions>
        </div>
    </Combobox>;
}
