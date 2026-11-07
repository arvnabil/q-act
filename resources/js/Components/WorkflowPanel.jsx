import React, { useState, useEffect, useCallback } from "react";
import { Link, router } from "@inertiajs/react";
import { DialogTitle } from "@headlessui/react";
import axios from "axios";
import toast from "react-hot-toast";
import Modal from "@/Components/Modal";
import { Calendar, Link2, Plus, X, Check, ArrowRight, Users } from "lucide-react";

const formatVisitPeriod = (v) => {
    if (!v?.scheduled_at) return "";
    const start = new Date(v.scheduled_at);
    if (v.is_all_day) {
        const startStr = start.toLocaleDateString("id-ID", {
            dateStyle: "medium",
        });
        if (v.end_at) {
            const end = new Date(v.end_at);
            const endStr = end.toLocaleDateString("id-ID", {
                dateStyle: "medium",
            });
            return startStr === endStr
                ? `${startStr} (Seharian)`
                : `${startStr} – ${endStr} (Seharian)`;
        }
        return `${startStr} (Seharian)`;
    }
    const startStr = start.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    });
    if (v.end_at) {
        const end = new Date(v.end_at);
        const isSameDay = start.toDateString() === end.toDateString();
        if (isSameDay) {
            const endTimeStr = end.toLocaleTimeString("id-ID", {
                timeStyle: "short",
            });
            return `${startStr} – ${endTimeStr}`;
        }
        const endStr = end.toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
        });
        return `${startStr} – ${endStr}`;
    }
    return startStr;
};
const dateLabel = (value) =>
    typeof value === "object" && value !== null
        ? formatVisitPeriod(value)
        : value
          ? new Date(value).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
            })
          : "";
const localInput = (value) => {
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const field =
    "w-full rounded-lg border-surface-200 text-sm focus:ring-brand-500";
const button =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-700 hover:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50";

export default function WorkflowPanel({
    quotationId,
    leadId,
    embedded = false,
    refreshPage = true,
    onLinked,
    onCloseModal,
}) {
    const [data, setData] = useState(null),
        [mode, setMode] = useState(null),
        [busy, setBusy] = useState(false);
    const [error, setError] = useState(""),
        [warnings, setWarnings] = useState([]),
        [all, setAll] = useState(false),
        [filterTab, setFilterTab] = useState("active");
    const [otherIds, setOtherIds] = useState([]);
    const [selected, setSelected] = useState(""),
        [title, setTitle] = useState(""),
        [form, setForm] = useState({}),
        [customEmail, setCustomEmail] = useState("");
    // State for the embedded quick-link UI (matches Quotations list modal style)
    const [connectMode, setConnectMode] = useState("new");
    const [connectTitle, setConnectTitle] = useState("");
    const [connectSelectedId, setConnectSelectedId] = useState("");

    const addAttendeeEmail = (emailToAdd) => {
        const trimmed = (emailToAdd || customEmail).trim().toLowerCase();
        if (!trimmed || !trimmed.includes("@")) return;
        if (!(form.attendee_emails || []).includes(trimmed)) {
            setForm((f) => ({
                ...f,
                attendee_emails: [...(f.attendee_emails || []), trimmed],
            }));
        }
        setCustomEmail("");
    };

    const removeAttendeeEmail = (emailToRemove) => {
        setForm((f) => ({
            ...f,
            attendee_emails: (f.attendee_emails || []).filter((e) => e !== emailToRemove),
        }));
    };
    const endpoint = quotationId
        ? `/workflow/quotations/${encodeURIComponent(quotationId)}`
        : `/workflow/leads/${leadId}`;
    const load = useCallback(async () => {
        try {
            const res = await axios.get(endpoint);
            const rawData = res.data;
            if (rawData && rawData.suggestedTitle) {
                rawData.suggestedTitle = rawData.suggestedTitle.replace(/^Lead\s+/i, "");
            }
            setData(rawData);
            // Pre-fill connectTitle for quick-link UI
            if (rawData?.suggestedTitle && !rawData?.lead) {
                setConnectTitle(rawData.suggestedTitle.replace(/^Lead\s+/i, ""));
            }
            onLinked?.(!!res.data.lead);
        } catch {
            setError("Tidak dapat memuat hubungan proyek dan agenda.");
        }
    }, [endpoint, onLinked]);
    useEffect(() => {
        load();
        window.addEventListener("workflow-updated", load);
        return () => window.removeEventListener("workflow-updated", load);
    }, [load]);
    const notify = () => {
        window.dispatchEvent(new Event("workflow-updated"));
        if (refreshPage) router.reload({ only: ["lead", "quotation"] });
    };
    const perform = async (fn, successMessage) => {
        if (busy) return;
        setBusy(true);
        setError("");
        setWarnings([]);
        try {
            const res = await fn();
            setWarnings(res.data.warnings || []);
            setMode(null);
            await load();
            notify();
            if (successMessage) toast.success(successMessage);
        } catch (e) {
            setError(
                Object.values(e.response?.data?.errors || {}).flat()[0] ||
                    e.response?.data?.message ||
                    "Gagal menyimpan. Silakan coba lagi.",
            );
        } finally {
            setBusy(false);
        }
    };
    const schedule = (visit = null) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        setError("");
        setForm(
            visit
                ? {
                      ...visit,
                      scheduled_at:
                          visit.is_all_day && visit.scheduled_at
                              ? visit.scheduled_at.slice(0, 10)
                              : localInput(visit.scheduled_at),
                      end_at: visit.end_at
                          ? visit.is_all_day
                              ? visit.end_at.slice(0, 10)
                              : localInput(visit.end_at)
                          : "",
                      is_all_day: Boolean(visit.is_all_day),
                      notes: visit.notes || "",
                      location: visit.location || "",
                      attendee_emails: [],
                      sync_calendar: Boolean(
                          visit?.google_calendar_event_id ||
                          data?.calendarConfigured,
                      ),
                      create_zoom: Boolean(
                          visit?.zoom_meeting_id || data?.zoomConfigured,
                      ),
                      include_lead_info: true,
                  }
                : {
                      subject: quotationId
                          ? ((data?.customerName || data?.lead?.title)
                              ? `Follow-up ${quotationId} - ${data?.customerName || data?.lead?.title}`
                              : `Follow-up ${quotationId}`)
                          : `Follow-up ${data?.lead?.title || "peluang"}`,
                      scheduled_at: localInput(tomorrow),
                      end_at: "",
                      is_all_day: false,
                      visit_type: "follow_up",
                      location: "",
                      notes: "",
                      attendee_emails: [],
                      sync_calendar: Boolean(data?.calendarConfigured),
                      create_zoom: Boolean(data?.zoomConfigured),
                      include_lead_info: true,
                  },
        );
        setMode(visit ? "reschedule" : "schedule");
    };
    useEffect(() => {
        const openSchedule = (e) => {
            if (!data?.canSchedule || e.detail?.leadId !== leadId || !leadId)
                return;
            schedule();
            setForm((f) => ({
                ...f,
                visit_type: e.detail.visit_type || "follow_up",
                subject: `Meeting ${data.lead?.title || "customer"}`,
            }));
        };
        window.addEventListener("workflow-schedule", openSchedule);
        return () =>
            window.removeEventListener("workflow-schedule", openSchedule);
    }, [data, leadId]);
    const visits = data?.visits || [];
    const pending = visits.filter((v) => !v.checked_in_at && !v.cancelled_at);
    const history = visits.filter((v) => v.checked_in_at || v.cancelled_at);
    const list = [
        ...pending,
        ...history,
    ];
    const displayList = filterTab === "active" ? pending : filterTab === "history" ? history : list;
    const close = () => {
        if (!busy) {
            setMode(null);
            setError("");
        }
    };
    return (
        <section
            id="workflow"
            className={
                embedded
                    ? ""
                    : "mb-5 rounded-2xl border border-brand-100 bg-white p-4 sm:p-5"
            }
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                {!embedded && (
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-bold text-surface-900">
                            <Calendar className="h-4 w-4 text-brand-600" />
                            Proyek & Tindak Lanjut
                        </h3>
                        <p className="mt-1 text-xs text-surface-500">
                            Satu agenda tersambung ke dokumen, Visit &
                            Follow-up, dan kalender internal.
                        </p>
                    </div>
                )}
                {data?.canSchedule && (!quotationId || data?.lead) && (
                    <button
                        type="button"
                        onClick={() => schedule()}
                        className={button}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Jadwalkan tindak lanjut
                    </button>
                )}
            </div>
            {!data && !error && (
                <p role="status" className="py-5 text-sm text-surface-500">
                    Memuat lead dan agenda…
                </p>
            )}
            {/* Quotation context: info card + link/connect section */}
            {quotationId && data && (
                <div className="mt-4 space-y-3 text-sm">
                    {/* Info card: Customer + Grand Total */}
                    {(data.customerName || data.grandTotal != null) && (
                        <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs space-y-1">
                            {data.customerName && (
                                <div className="flex justify-between">
                                    <span className="text-surface-500">Customer:</span>
                                    <span className="font-semibold text-surface-800">{data.customerName}</span>
                                </div>
                            )}
                            {data.grandTotal != null && (
                                <div className="flex justify-between">
                                    <span className="text-surface-500">Nilai Penawaran:</span>
                                    <span className="font-bold text-brand-700">
                                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(data.grandTotal)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {data.lead ? (
                        /* Already linked */
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                            <p className="flex items-center gap-2 font-semibold text-emerald-700 text-xs">
                                <Check className="h-4 w-4 shrink-0" />
                                Quotation sudah terhubung ke lead
                            </p>
                            <Link
                                href={"/leads/" + data.lead.id}
                                className="mt-2 block font-bold text-surface-900 hover:underline text-sm"
                            >
                                {data.lead.lead_code && (
                                    <span className="text-xs font-normal text-surface-500 mr-1">{data.lead.lead_code}</span>
                                )}
                                {data.lead.title} →
                            </Link>
                            {/* Jadwalkan button always visible when linked */}
                            {data.canSchedule && (
                                <button
                                    type="button"
                                    onClick={() => schedule()}
                                    className={button + " mt-3"}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Jadwalkan tindak lanjut
                                </button>
                            )}
                            {data.canManage && data.otherQuotations?.length > 0 && (
                                <button
                                    type="button"
                                    className={button + " mt-2"}
                                    onClick={() => {
                                        setSelected(data.lead.id);
                                        setOtherIds([]);
                                        setError("");
                                        setMode("link");
                                    }}
                                >
                                    Hubungkan quotation lain
                                </button>
                            )}
                        </div>
                    ) : data.canManage ? (
                        /* Not linked — 2-tab quick connect UI */
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">
                                    Metode Hubungkan
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConnectMode("new")}
                                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${connectMode === "new" ? "border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20" : "border-surface-200 hover:bg-surface-50 text-surface-600"}`}
                                    >
                                        <div className="font-bold">✨ Buat Lead Baru</div>
                                        <div className="text-[10px] text-surface-400 mt-0.5">Otomatis dari quotation</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConnectMode("existing")}
                                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${connectMode === "existing" ? "border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20" : "border-surface-200 hover:bg-surface-50 text-surface-600"}`}
                                    >
                                        <div className="font-bold">🔗 Pilih Lead Ada</div>
                                        <div className="text-[10px] text-surface-400 mt-0.5">Dari daftar lead aktif</div>
                                    </button>
                                </div>
                            </div>

                            {connectMode === "new" ? (
                                <div>
                                    <label className="block text-xs font-bold text-surface-600 uppercase tracking-wider mb-1.5">
                                        Nama Proyek / Judul Lead
                                    </label>
                                    <input
                                        type="text"
                                        value={connectTitle}
                                        onChange={e => setConnectTitle(e.target.value)}
                                        placeholder="Contoh: Pengadaan Headset Yealink"
                                        className="w-full text-sm bg-white border border-surface-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none"
                                    />
                                    <p className="text-[10px] text-surface-400 mt-1">Lead baru akan dibuat dan langsung terhubung dengan quotation ini.</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-surface-600 uppercase tracking-wider mb-1.5">
                                        Pilih Lead Tujuan
                                    </label>
                                    {/* Candidates from same customer first, then allLeads fallback */}
                                    {(data.candidates?.length || data.allLeads?.length) ? (
                                        <select
                                            value={connectSelectedId}
                                            onChange={e => setConnectSelectedId(e.target.value)}
                                            className="w-full text-sm bg-white border border-surface-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 outline-none font-medium"
                                        >
                                            <option value="">-- Pilih Lead Aktif --</option>
                                            {/* Same-customer candidates shown first */}
                                            {data.candidates?.length > 0 && (
                                                <optgroup label="Lead customer ini">
                                                    {data.candidates.map(l => (
                                                        <option key={l.id} value={l.id}>
                                                            {l.lead_code ? `[${l.lead_code}] ` : ""}{l.title}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {data.allLeads?.filter(l => !data.candidates?.some(c => c.id === l.id)).length > 0 && (
                                                <optgroup label="Semua lead aktif">
                                                    {data.allLeads.filter(l => !data.candidates?.some(c => c.id === l.id)).map(l => (
                                                        <option key={l.id} value={l.id}>
                                                            {l.lead_code ? `[${l.lead_code}] ` : ""}{l.title}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    ) : (
                                        <p className="text-xs text-surface-500 italic">Tidak ada lead aktif yang dapat dipilih.</p>
                                    )}
                                </div>
                            )}

                            {error && <p className="text-xs text-red-600">{error}</p>}

                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-100">
                                <button
                                    type="button"
                                    onClick={() => onCloseModal?.()}
                                    className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-800 transition-colors cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={busy || (connectMode === "existing" && !connectSelectedId)}
                                    className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                    onClick={() => {
                                        if (connectMode === "new") {
                                            const cleanTitle = (connectTitle || data.suggestedTitle || "").replace(/^Lead\s+/i, "");
                                            perform(
                                                () => axios.post(endpoint + "/lead", { title: cleanTitle }),
                                                "Lead baru berhasil dibuat dan dihubungkan.",
                                            );
                                        } else {
                                            if (!connectSelectedId) return;
                                            perform(
                                                () => axios.post(endpoint + "/lead", { lead_id: connectSelectedId }),
                                                "Quotation berhasil dihubungkan ke lead.",
                                            );
                                        }
                                    }}
                                >
                                    <span>{busy ? "Menyimpan…" : "Hubungkan Sekarang"}</span>
                                </button>
                            </div>

                            {/* Schedule without lead option */}
                            {data.canSchedule && (
                                <div className="pt-1 border-t border-surface-100">
                                    <button
                                        type="button"
                                        onClick={() => schedule()}
                                        className={button + " w-full justify-center"}
                                    >
                                        <Calendar className="h-4 w-4" />
                                        Jadwalkan tindak lanjut tanpa lead
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-surface-500">
                            Anda belum memiliki izin untuk menghubungkan lead.
                        </p>
                    )}
                </div>
            )}
            {/* Sub-tabs: Aktif / Riwayat / Semua */}
            {data && visits.length > 0 && (
                <div className="flex items-center justify-between gap-2 border-b border-surface-100 pb-2.5 mt-3">
                    <div className="flex items-center gap-1 bg-surface-100 p-0.5 rounded-lg text-xs">
                        <button
                            type="button"
                            onClick={() => setFilterTab("active")}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                filterTab === "active"
                                    ? "bg-white text-surface-900 shadow-2xs"
                                    : "text-surface-500 hover:text-surface-800"
                            }`}
                        >
                            Aktif
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    filterTab === "active"
                                        ? "bg-brand-50 text-brand-700"
                                        : "bg-surface-200 text-surface-600"
                                }`}
                            >
                                {pending.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFilterTab("history")}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                filterTab === "history"
                                    ? "bg-white text-surface-900 shadow-2xs"
                                    : "text-surface-500 hover:text-surface-800"
                            }`}
                        >
                            Riwayat
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    filterTab === "history"
                                        ? "bg-surface-200 text-surface-700"
                                        : "bg-surface-200 text-surface-600"
                                }`}
                            >
                                {history.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFilterTab("all")}
                            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                filterTab === "all"
                                    ? "bg-white text-surface-900 shadow-2xs"
                                    : "text-surface-500 hover:text-surface-800"
                            }`}
                        >
                            Semua
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    filterTab === "all"
                                        ? "bg-surface-200 text-surface-700"
                                        : "bg-surface-200 text-surface-600"
                                }`}
                            >
                                {list.length}
                            </span>
                        </button>
                    </div>

                    {pending.length > 0 && filterTab === "active" && (
                        <span className="text-[11px] font-medium text-brand-600 hidden sm:inline">
                            {pending.length} agenda perlu tindak lanjut
                        </span>
                    )}
                </div>
            )}

            <div className="max-h-56 overflow-y-auto divide-y divide-surface-100 pr-1 mt-1">
                {displayList.length === 0 ? (
                    <div className="py-4 text-center bg-surface-50/50 rounded-xl border border-dashed border-surface-200 my-2">
                        <p className="text-xs text-surface-500">
                            {filterTab === "active"
                                ? "Tidak ada agenda aktif saat ini."
                                : filterTab === "history"
                                  ? "Belum ada riwayat agenda selesai atau dibatalkan."
                                  : "Belum ada agenda tercatat."}
                        </p>
                        {filterTab === "active" && data?.canSchedule && (!quotationId || data?.lead) && (
                            <button
                                type="button"
                                onClick={() => schedule()}
                                className="mt-2 text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                            >
                                + Buat Jadwal Tindak Lanjut
                            </button>
                        )}
                    </div>
                ) : (
                    displayList.map((v) => {
                        const isCancelled = Boolean(v.cancelled_at);
                        const isDone = Boolean(v.checked_in_at);
                        const isLate = !isDone && !isCancelled && new Date(v.scheduled_at) < new Date();
                        const statusLabel = isCancelled
                            ? "Dibatalkan"
                            : isDone
                              ? "Selesai"
                              : isLate
                                ? "Terlambat"
                                : "Terjadwal";
                        const statusClass = isCancelled
                            ? "bg-surface-100 text-surface-500 border-surface-200"
                            : isDone
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isLate
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200";

                        return (
                            <div
                                key={v.id}
                                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-semibold text-surface-900 truncate">
                                            {v.subject}
                                        </span>
                                        <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${statusClass}`}
                                        >
                                            {statusLabel}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-surface-500 flex items-center gap-2 flex-wrap">
                                        <span>{formatVisitPeriod(v)}</span>
                                        {v.quotation_id && (
                                            <Link
                                                href={`/quotations/${encodeURIComponent(v.quotation_id)}`}
                                                className="text-brand-600 hover:underline font-medium"
                                            >
                                                {v.quotation_id}
                                            </Link>
                                        )}
                                        {v.zoom_join_url && !v.cancelled_at && (
                                            <a
                                                href={v.zoom_join_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-semibold text-sky-600 hover:underline inline-flex items-center gap-0.5"
                                            >
                                                Zoom ↗
                                            </a>
                                        )}
                                    </p>
                                </div>

                                {data?.canSchedule && !isDone && !isCancelled && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                                            onClick={() =>
                                                perform(() =>
                                                    axios.post(
                                                        `/leads/visits/${v.id}/check-in`,
                                                    ),
                                                )
                                            }
                                        >
                                            <Check className="h-3 w-3" />
                                            Selesai
                                        </button>
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-xs font-semibold rounded-lg bg-surface-50 text-surface-700 hover:bg-surface-100 border border-surface-200 transition-colors cursor-pointer"
                                            onClick={() => schedule(v)}
                                        >
                                            Jadwal ulang
                                        </button>
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                            onClick={() => {
                                                setForm(v);
                                                setMode("cancel");
                                            }}
                                        >
                                            Batalkan
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {data && !visits.length && (
                <p className="mt-3 text-xs text-surface-400">
                    Belum ada agenda. Pilih waktu untuk follow-up atau pertemuan berikutnya.
                </p>
            )}

            <div className="mt-2.5 flex items-center justify-between text-xs text-brand-600 pt-2 border-t border-surface-100">
                <div className="flex gap-4">
                    <Link href="/leads/visits" className="hover:underline">Visit & Follow-up →</Link>
                    <Link href="/team-calendar" className="hover:underline">Kalender →</Link>
                </div>
            </div>
            {!mode && error && (
                <p role="alert" className="mt-3 text-xs text-red-600">
                    {error}{" "}
                    <button onClick={load} className="underline">
                        Coba lagi
                    </button>
                </p>
            )}
            {warnings.map((w) => (
                <p
                    key={w}
                    role="status"
                    className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
                >
                    {w}
                </p>
            ))}
            <Modal show={!!mode} onClose={close} maxWidth="xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (mode === "create" || mode === "link")
                            perform(() =>
                                axios.post(
                                    `${endpoint}/lead`,
                                    mode === "create"
                                        ? { title, quotation_ids: otherIds }
                                        : {
                                              lead_id: selected,
                                              quotation_ids: otherIds,
                                          },
                                ),
                            );
                        else if (mode === "cancel")
                            perform(() =>
                                axios.post(
                                    `/workflow/visits/${form.id}/cancel`,
                                ),
                            );
                        else {
                            const payload = {
                                ...form,
                                scheduled_at: form.is_all_day
                                    ? form.scheduled_at?.includes("T")
                                        ? form.scheduled_at
                                        : `${form.scheduled_at}T00:00:00`
                                    : new Date(form.scheduled_at).toISOString(),
                                end_at: form.end_at
                                    ? form.is_all_day
                                        ? form.end_at?.includes("T")
                                            ? form.end_at
                                            : `${form.end_at}T23:59:59`
                                        : new Date(form.end_at).toISOString()
                                    : null,
                                quotation_id: quotationId || null,
                                lead_id: data?.lead?.id || leadId || null,
                            };
                            perform(() =>
                                mode === "reschedule"
                                    ? axios.put(
                                          `/leads/visits/${form.id}`,
                                          payload,
                                      )
                                    : axios.post("/leads/visits", payload),
                            );
                        }
                    }}
                    className="flex max-h-[85vh] flex-col"
                >
                    <div className="flex items-center justify-between border-b border-surface-100 p-5">
                        <DialogTitle className="font-bold text-surface-900">
                            {mode === "create"
                                ? "Buat Lead dari Quotation"
                                : mode === "link"
                                  ? "Hubungkan ke Lead"
                                  : mode === "cancel"
                                    ? "Batalkan Agenda?"
                                    : mode === "reschedule"
                                      ? "Jadwal Ulang"
                                      : "Jadwalkan Tindak Lanjut"}
                        </DialogTitle>
                        <button
                            type="button"
                            onClick={close}
                            aria-label="Tutup"
                            disabled={busy}
                        >
                            <X className="h-5 w-5 text-surface-400" />
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-5">
                        <fieldset
                            disabled={busy}
                            className="space-y-4"
                        >
                        {mode === "create" && (
                            <>
                                <p className="text-sm text-surface-500">
                                    Customer, PIC, sales, dan nilai awal diambil
                                    dari quotation. Revisi/sub mengikuti lead
                                    yang sama.
                                </p>
                                <label className="block text-xs font-semibold">
                                    Nama proyek
                                    <input
                                        value={title}
                                        onChange={(e) =>
                                            setTitle(e.target.value)
                                        }
                                        required
                                        maxLength={255}
                                        className={`${field} mt-2`}
                                    />
                                </label>
                            </>
                        )}
                        {mode === "link" && (
                            <>
                                <p className="text-sm text-surface-500">
                                    Pilih proyek customer yang sama. PIC yang
                                    sama tidak otomatis berarti proyek yang
                                    sama.
                                </p>
                                {data?.lead ? (
                                    <p className="text-sm font-semibold text-brand-700">
                                        {data.lead.title}
                                    </p>
                                ) : (
                                    <select
                                        aria-label="Lead tujuan"
                                        required
                                        value={selected}
                                        onChange={(e) =>
                                            setSelected(e.target.value)
                                        }
                                        className={field}
                                    >
                                        <option value="">
                                            Pilih lead yang sudah ada
                                        </option>
                                        {data?.candidates?.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.title}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {!data?.lead && !data?.candidates?.length && (
                                    <p className="text-xs text-surface-500">
                                        Belum ada lead yang sesuai dalam cakupan
                                        akses Anda. Gunakan Buat lead dari
                                        quotation.
                                    </p>
                                )}
                            </>
                        )}
                        {["create", "link"].includes(mode) &&
                            data?.otherQuotations?.length > 0 && (
                                <div className="rounded-xl border border-surface-200 p-3">
                                    <p className="text-xs font-semibold">
                                        Sertakan quotation lain untuk proyek ini
                                        (opsional)
                                    </p>
                                    <p className="mt-1 text-xs text-surface-500">
                                        Customer yang sama belum tentu proyek
                                        yang sama. Pilih hanya yang berkaitan;
                                        nilai penawaran tidak dijumlahkan
                                        otomatis.
                                    </p>
                                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                                        {data.otherQuotations.map((q) => (
                                            <label
                                                key={q.id}
                                                className="flex items-center gap-2 text-xs"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={otherIds.includes(
                                                        q.id,
                                                    )}
                                                    onChange={(e) =>
                                                        setOtherIds(
                                                            e.target.checked
                                                                ? [
                                                                      ...otherIds,
                                                                      q.id,
                                                                  ]
                                                                : otherIds.filter(
                                                                      (id) =>
                                                                          id !==
                                                                          q.id,
                                                                  ),
                                                        )
                                                    }
                                                />
                                                <span>
                                                    {q.id} · {q.status}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        {mode === "cancel" && (
                            <p className="text-sm text-surface-600">
                                Agenda “{form.subject}” akan dibatalkan. Riwayat
                                tetap disimpan.
                            </p>
                        )}
                        {["schedule", "reschedule"].includes(mode) && (
                            <>
                                <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
                                    Konteks: {quotationId || data?.lead?.title}.
                                    Customer dan penanggung jawab diisi
                                    otomatis.
                                </p>
                                {pending.length > 0 && mode === "schedule" && (
                                    <p className="text-xs text-amber-700">
                                        Sudah ada {pending.length} agenda aktif.
                                        Simpan akan menambah agenda lain.
                                    </p>
                                )}
                                <label className="block text-xs font-semibold">
                                    Jenis agenda
                                    <select
                                        value={form.visit_type}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                visit_type: e.target.value,
                                            })
                                        }
                                        className={`${field} mt-1`}
                                    >
                                        <option value="follow_up">
                                            Follow-up
                                        </option>
                                        <option value="visit">Kunjungan</option>
                                        <option value="internal_meeting">Meeting Internal</option>
                                        <option value="demo">Demo</option>
                                        <option value="other">
                                            Meeting online / lainnya
                                        </option>
                                        <option value="presentation">
                                            Presentasi
                                        </option>
                                        <option value="installation">
                                            Instalasi
                                        </option>
                                        <option value="maintenance">
                                            Maintenance
                                        </option>
                                        <option value="leave">Cuti</option>
                                    </select>
                                </label>
                                <label className="block text-xs font-semibold">
                                    Tindakan
                                    <input
                                        required
                                        maxLength={255}
                                        value={form.subject || ""}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                subject: e.target.value,
                                            })
                                        }
                                        className={`${field} mt-1`}
                                    />
                                </label>
                                <div className="space-y-2 rounded-xl bg-surface-50 p-3 border border-surface-200">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-surface-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(form.is_all_day)}
                                            onChange={(e) => {
                                                const checked =
                                                    e.target.checked;
                                                setForm({
                                                    ...form,
                                                    is_all_day: checked,
                                                    scheduled_at: checked
                                                        ? form.scheduled_at
                                                            ? form.scheduled_at.slice(
                                                                  0,
                                                                  10,
                                                              )
                                                            : ""
                                                        : form.scheduled_at
                                                          ? `${form.scheduled_at.slice(0, 10)}T09:00`
                                                          : "",
                                                    end_at: "",
                                                });
                                            }}
                                            className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>
                                            Kegiatan Seharian / Multi-hari
                                        </span>
                                    </label>
                                    {form.is_all_day ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="block text-xs font-semibold">
                                                Tgl mulai{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                                <input
                                                    type="date"
                                                    required
                                                    value={
                                                        form.scheduled_at?.slice(
                                                            0,
                                                            10,
                                                        ) || ""
                                                    }
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            scheduled_at:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className={`${field} mt-1`}
                                                />
                                            </label>
                                            <label className="block text-xs font-semibold">
                                                Tgl selesai (opsional)
                                                <input
                                                    type="date"
                                                    min={
                                                        form.scheduled_at?.slice(
                                                            0,
                                                            10,
                                                        ) || ""
                                                    }
                                                    value={
                                                        form.end_at?.slice(
                                                            0,
                                                            10,
                                                        ) || ""
                                                    }
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            end_at: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className={`${field} mt-1`}
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="block text-xs font-semibold">
                                                Waktu mulai{" "}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                                <input
                                                    type="datetime-local"
                                                    required
                                                    value={
                                                        form.scheduled_at || ""
                                                    }
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            scheduled_at:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className={`${field} mt-1`}
                                                />
                                            </label>
                                            <label className="block text-xs font-semibold">
                                                Waktu selesai (opsional)
                                                <input
                                                    type="datetime-local"
                                                    min={
                                                        form.scheduled_at || ""
                                                    }
                                                    value={form.end_at || ""}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            end_at: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className={`${field} mt-1`}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <label className="block text-xs font-semibold">
                                    Lokasi (opsional)
                                    <input
                                        value={form.location || ""}
                                        maxLength={255}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                location: e.target.value,
                                            })
                                        }
                                        className={`${field} mt-1`}
                                        placeholder="Alamat, Google Meet, dll"
                                    />
                                </label>
                                <label className="block text-xs font-semibold">
                                    Catatan / Deskripsi Agenda (opsional)
                                    <textarea
                                        rows={3}
                                        value={form.notes || ""}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                notes: e.target.value,
                                            })
                                        }
                                        className={`${field} mt-1 resize-none`}
                                        placeholder="Unit yang dibawa, tim yang bertugas, PIC..."
                                    />
                                </label>
                                {(mode === "schedule" || mode === "reschedule") && (
                                    <div className="space-y-2 text-xs">
                                        <p className="text-surface-500">
                                            Kalender internal otomatis
                                            diperbarui. Integrasi berikut
                                            opsional:
                                        </p>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                disabled={
                                                    !data?.calendarConfigured
                                                }
                                                checked={!!form.sync_calendar}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        sync_calendar:
                                                            e.target.checked,
                                                    })
                                                }
                                            />
                                            Sinkronkan Google Calendar{" "}
                                            {!data?.calendarConfigured &&
                                                "(belum terhubung)"}
                                        </label>
                                        {form.sync_calendar && (data?.lead?.id || quotationId) && (
                                            <label className="flex items-center gap-2 pl-0.5">
                                                <input
                                                    type="checkbox"
                                                    checked={!!form.include_lead_info}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            include_lead_info: e.target.checked,
                                                        })
                                                    }
                                                />
                                                <span className="text-xs text-surface-600">
                                                    Sertakan info Lead/Sales di deskripsi
                                                </span>
                                            </label>
                                        )}
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                disabled={!data?.zoomConfigured}
                                                checked={!!form.create_zoom}
                                                onChange={(e) =>
                                                    setForm({
                                                        ...form,
                                                        create_zoom:
                                                            e.target.checked,
                                                    })
                                                }
                                            />
                                            Buat tautan Zoom{" "}
                                            {!data?.zoomConfigured &&
                                                "(belum tersedia)"}
                                        </label>
                                        {form.sync_calendar && (
                                            <div className="pt-2.5 border-t border-surface-200 space-y-1.5 opacity-80">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-surface-700 flex items-center gap-1.5 text-xs">
                                                        <Users className="w-3.5 h-3.5 text-surface-400" /> Undang Peserta / Tamu (Google Calendar)
                                                    </span>
                                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                                                        Coming Soon
                                                    </span>
                                                </div>
                                                <div className="p-2.5 bg-surface-50 border border-dashed border-surface-300 rounded-lg text-xs text-surface-500">
                                                    <p className="text-[11px] text-surface-500 leading-relaxed">
                                                        Pengiriman undangan email langsung ke peserta sedang dinonaktifkan sementara dan akan hadir pada pembaruan Google OAuth.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                        {error && (
                            <p role="alert" className="text-xs text-red-600">
                                {error}
                            </p>
                        )}
                        </fieldset>
                    </div>
                    <div className="flex shrink-0 justify-end gap-2 border-t border-surface-100 bg-surface-50/50 p-4">
                        <button
                            type="button"
                            onClick={close}
                            disabled={busy}
                            className={button}
                        >
                            Kembali
                        </button>
                        <button
                            type="submit"
                            disabled={busy || (mode === "link" && !selected)}
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {busy
                                ? "Menyimpan…"
                                : mode === "cancel"
                                  ? "Batalkan agenda"
                                  : "Simpan"}
                        </button>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
