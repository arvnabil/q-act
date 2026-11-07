import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
    DownloadCloud, 
    FileArchive, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Trash2, 
    ExternalLink, 
    X,
    RefreshCw
} from 'lucide-react';

export default function DownloadCenterDropdown() {
    const [open, setOpen] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [activeCount, setActiveCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    const fetchJobs = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await axios.get('/downloads');
            setJobs(res.data.jobs || []);
            setActiveCount(res.data.active_count || 0);
        } catch (err) {
            console.error('Failed to load download jobs', err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchJobs(true);

        // Listen for export-triggered events from other components
        const handleExportTriggered = () => {
            fetchJobs(true);
            setOpen(true);
        };
        window.addEventListener('export-job-started', handleExportTriggered);

        return () => {
            window.removeEventListener('export-job-started', handleExportTriggered);
        };
    }, []);

    // Polling when dropdown is open OR when there are active jobs in background
    useEffect(() => {
        let interval = null;
        if (open || activeCount > 0) {
            interval = setInterval(() => {
                fetchJobs(true);
            }, 3000); // Poll every 3s
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [open, activeCount]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await axios.delete(`/downloads/${id}`);
            setJobs(prev => prev.filter(j => j.id !== id));
            toast.success('Riwayat unduhan dihapus');
        } catch {
            toast.error('Gagal menghapus riwayat unduhan');
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => {
                    setOpen(!open);
                    if (!open) fetchJobs();
                }}
                className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
                    open ? 'bg-surface-100 text-brand-700' : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'
                }`}
                title="Download Center (Antrian Ekspor)"
            >
                <DownloadCloud className="w-5 h-5" />
                {activeCount > 0 ? (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white animate-pulse">
                        {activeCount}
                    </span>
                ) : jobs.some(j => j.status === 'completed') ? (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                ) : null}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-surface-200 z-[9999] overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="p-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/60">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                                <DownloadCloud className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-surface-900">Download Center</h3>
                                <p className="text-[10px] text-surface-500">Antrian ekspor data & berkas zip</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => fetchJobs()}
                                className="p-1 hover:bg-surface-200/60 rounded-md text-surface-400 hover:text-surface-700 transition-colors"
                                title="Segarkan"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="p-1 hover:bg-surface-200/60 rounded-md text-surface-400 hover:text-surface-700 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Jobs List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-surface-100">
                        {jobs.length === 0 ? (
                            <div className="p-8 text-center text-surface-400">
                                <FileArchive className="w-8 h-8 opacity-30 mx-auto mb-2" />
                                <p className="text-xs font-medium text-surface-600">Belum ada berkas unduhan</p>
                                <p className="text-[10px] text-surface-400 mt-0.5">
                                    Pilih data di tabel Sales Orders lalu klik tombol "Export to ZIP".
                                </p>
                            </div>
                        ) : (
                            jobs.map((job) => {
                                const isProcessing = ['pending', 'processing'].includes(job.status);
                                const isCompleted = job.status === 'completed';
                                const isFailed = job.status === 'failed';

                                return (
                                    <div key={job.id} className="p-3.5 hover:bg-surface-50/60 transition-colors">
                                        <div className="flex items-start justify-between gap-2.5 mb-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                                    isCompleted 
                                                        ? 'bg-emerald-50 text-emerald-600' 
                                                        : isProcessing 
                                                          ? 'bg-amber-50 text-amber-600' 
                                                          : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {isProcessing ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : isCompleted ? (
                                                        <FileArchive className="w-4 h-4" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-surface-800 truncate block">
                                                        {job.title}
                                                    </span>
                                                    <span className="text-[10px] text-surface-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {job.created_at}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {isCompleted && job.download_url && (
                                                    <a
                                                        href={job.download_url}
                                                        download
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                                                        title="Unduh File ZIP"
                                                    >
                                                        <DownloadCloud className="w-3 h-3" />
                                                        <span>Unduh</span>
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDelete(e, job.id)}
                                                    className="p-1 text-surface-400 hover:text-red-500 rounded hover:bg-surface-100 transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status Detail & Progress Bar */}
                                        {isProcessing && (
                                            <div className="mt-2 space-y-1">
                                                <div className="flex justify-between text-[10px] font-medium text-surface-500">
                                                    <span>Memproses {job.processed_items} dari {job.total_items} SO...</span>
                                                    <span>{job.progress}%</span>
                                                </div>
                                                <div className="w-full bg-surface-200 h-1.5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="bg-brand-500 h-full rounded-full transition-all duration-300"
                                                        style={{ width: `${job.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {isCompleted && (
                                            <div className="flex items-center justify-between text-[10px] text-surface-500 mt-1 pt-1 border-t border-surface-100/60">
                                                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Siap diunduh
                                                </span>
                                                <span className="font-mono text-surface-400">{job.file_size_formatted}</span>
                                            </div>
                                        )}

                                        {isFailed && (
                                            <p className="text-[10px] text-red-600 mt-1 line-clamp-1">
                                                Gagal: {job.error_message || 'Terjadi kesalahan sistem.'}
                                            </p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 bg-surface-50 border-t border-surface-100 text-center">
                        <span className="text-[10px] text-surface-400">
                            Berkas zip tersimpan selama 7 hari di Download Center.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
