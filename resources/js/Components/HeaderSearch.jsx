import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import axios from 'axios';

export default function HeaderSearch() {
    const { url } = usePage();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [active, setActive] = useState(-1);
    const container = useRef(null);
    const generation = useRef(0);
    useEffect(() => { setOpen(false); setQuery(''); }, [url]);
    useEffect(() => {
        const close = (event) => { if (!container.current?.contains(event.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    useEffect(() => {
        const current = ++generation.current;
        const controller = new AbortController();
        setResults([]); setError(''); setActive(-1);
        if (query.trim().length < 2) { setLoading(false); return; }
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const response = await axios.get('/header-search', { params: { q: query.trim() }, signal: controller.signal });
                if (current === generation.current) setResults(response.data.results);
            } catch (e) {
                if (!controller.signal.aborted && current === generation.current) setError('Pencarian gagal. Silakan coba lagi.');
            } finally {
                if (!controller.signal.aborted && current === generation.current) setLoading(false);
            }
        }, 300);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query]);
    const visit = (result) => { setOpen(false); router.visit(result.url); };
    return <div ref={container} className="relative hidden sm:block w-72">
        <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-full px-4 py-2 focus-within:border-brand-400">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input type="search" role="combobox" aria-label="Cari quotation, SO, atau customer" aria-expanded={open} aria-controls="header-search-results" aria-autocomplete="list" aria-activedescendant={active >= 0 ? `header-result-${active}` : undefined}
                value={query} maxLength={100} placeholder="Cari quotation, SO, customer..."
                className="bg-transparent border-none outline-none text-sm w-full"
                onFocus={() => setOpen(true)} onChange={e => { ++generation.current; setQuery(e.target.value); setResults([]); setActive(-1); setOpen(true); }}
                onKeyDown={e => {
                    if (e.key === 'Escape') setOpen(false);
                    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, results.length - 1)); }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
                    if (e.key === 'Enter' && open && results[active]) { e.preventDefault(); visit(results[active]); }
                }} />
        </div>
        {open && <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-auto bg-white border border-surface-200 rounded-xl shadow-xl z-50">
            <div role="status" className="px-4 py-2 text-xs text-surface-500">
                {query.trim().length < 2 ? 'Ketik minimal 2 karakter.' : loading ? 'Mencari...' : error || (results.length ? 'Hasil sesuai hak akses Anda (maks. 5 per kategori).' : 'Tidak ada hasil.')}
            </div>
            <ul id="header-search-results" role="listbox" aria-label="Hasil pencarian">
                {results.map((result, i) => <li key={result.key} id={`header-result-${i}`} role="option" aria-selected={active === i}>
                    <button type="button" onMouseEnter={() => setActive(i)} onClick={() => visit(result)} className={`w-full text-left px-4 py-3 border-t border-surface-100 ${active === i ? 'bg-brand-50' : 'hover:bg-surface-50'}`}>
                        <span className="text-xs text-brand-600">{result.type}{result.status ? ` · ${result.status}` : ''}</span>
                        <span className="block text-sm font-semibold break-words">{result.title}</span>
                        <span className="block text-xs text-surface-500 break-words">{result.subtitle}</span>
                    </button>
                </li>)}
            </ul>
        </div>}
    </div>;
}
