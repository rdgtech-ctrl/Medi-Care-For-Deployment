import React from 'react'
import {
    Image as ImageIcon,
    Edit2,
    Trash2,
    Check,
    XIcon,
    ChevronDown,
    Search,
    Loader2,
    User,
    Phone,
    BadgeIndianRupee,
    Calendar,
    Clock,
    SearchIcon
} from "lucide-react";
import ServiceAppointments, { StatusBadge, StatusSelect, RescheduleButton, Toast } from '../pages/ServiceAppointments'
import { serviceAppointmentsStyles, serviceDashboardStyles } from '../assets/dummyStyles'
import { useState, useEffect, useMemo } from 'react'

// Helper functions
function formatTimeDisplay(a) {
    return `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`;
}
function formatTwo(n) {
    return String(n).padStart(2, "0");
}

function formatDateNice(dateStr) {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function parseTimeToParts(timeStr) {
    if (!timeStr) return { hour: 12, minute: 0, ampm: "AM" };
    const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (m) {
        let hh = Number(m[1]);
        const mm = Number(m[2]);
        const ampm = m[3] ? m[3].toUpperCase() : null;
        if (!ampm) {
            const hour12 = hh % 12 === 0 ? 12 : hh % 12;
            return { hour: hour12, minute: mm, ampm: hh >= 12 ? "PM" : "AM" };
        }
        return { hour: hh, minute: mm, ampm };
    }
    return { hour: 12, minute: 0, ampm: "AM" };
}

const ServiceAppointmentsPage = () => {
    const API_BASE = "http://localhost:4000";

    const [appointments, setAppointments] = useState([]);
    const [toasts, setToasts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Search & debounce
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 220);
        return () => clearTimeout(t);
    }, [search]);

    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        fetchAppointments();
    }, []);

    function pushToast(title, message) {
        const toastId = Date.now() + Math.random();
        setToasts((t) => [...t, { id: toastId, title, message }]);
    }
    function removeToast(id) {
        setToasts((t) => t.filter((x) => x.id !== id));
    }

    async function fetchAppointments() {
        setLoading(true);
        setError(null);
        try {
            const url = `${API_BASE}/api/service-appointments?limit=500`;
            const res = await fetch(url);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    body?.message || `Failed to fetch appointments (${res.status})`
                );
            }
            const body = await res.json();
            const list = Array.isArray(body.appointments)
                ? body.appointments
                : body.appointments ??
                body.items ??
                body.data ??
                [];

            const normalized = (Array.isArray(list) ? list : [])
                .map((a) => {
                    const timeStr =
                        a.time ||
                            (a.slot && a.slot.time) ||
                            (a.hour !== undefined && a.minute !== undefined)
                            ? `${formatTwo(a.hour || 12)}:${formatTwo(a.minute ?? 0)} ${a.ampm || "AM"}`
                            : a.rescheduledTo?.time ||
                            (a.slot && a.slot.time) ||
                            a.time ||
                            "";
                    const parsed = parseTimeToParts(timeStr);
                    return {
                        id: a._id || a.id,
                        patientName:
                            a.patientName ||
                            a.name ||
                            (a.raw && a.raw.patientName) ||
                            "Unknown",
                        gender: a.gender || (a.raw && a.raw.gender) || "",
                        mobile: a.mobile || a.phone || "",
                        age: a.age || a.raw?.age || "",
                        serviceName:
                            a.serviceName ||
                            a.service ||
                            a.raw?.serviceName ||
                            (a.notes || "").slice(0, 40),
                        fees: a.fees ?? a.fee ?? a.payment?.amount ?? 0,
                        date:
                            a.date || (a.slot && a.slot.date) || a.rescheduledTo?.date || "",
                        hour: parsed.hour,
                        minute: parsed.minute,
                        ampm: parsed.ampm,
                        status: a.status || (a.payment && a.payment.status) || "Pending",
                        raw: a,
                    };
                })
                .filter(Boolean);
            setAppointments(normalized);
        } catch (err) {
            console.error("fetchAppointments:", err);
            setError(err.message || "Failed to load appointments");
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (toasts.length === 0) return;
        const timers = toasts.map((t) =>
            setTimeout(() => {
                setToasts((s) => s.filter((x) => x.id !== t.id));
            }, 3000)
        );
        return () => timers.forEach((t) => clearTimeout(t));
    }, [toasts]);

    function extractUpdated(body) {
        return body?.data || body?.appointment || body || {};
    }

    async function changeStatusRemote(id, newStatus) {
        const old = appointments.find((a) => a.id === id);
        if (!old) return;
        if (old.status === "Completed" || old.status === "Canceled") {
            pushToast(
                "Cannot change status",
                `Appointment #${id} is already ${old.status}.`
            );
            return;
        }

        setAppointments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
        );
        pushToast("Updating status", `Appointment #${id} → ${newStatus}`);

        try {
            const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    body?.message || `Status update failed (${res.status})`
                );
            }
            const body = await res.json();
            const updated = extractUpdated(body);

            setAppointments((prev) =>
                prev.map((a) =>
                    a.id === id
                        ? {
                            ...a,
                            status: updated.status || newStatus,
                            date: updated.date || updated.rescheduledTo?.date || a.date,
                            hour: parseTimeToParts(
                                updated.time ||
                                updated.rescheduledTo?.time ||
                                a.raw?.time ||
                                `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`
                            ).hour,
                            minute: parseTimeToParts(
                                updated.time ||
                                updated.rescheduledTo?.time ||
                                a.raw?.time ||
                                `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`
                            ).minute,
                            ampm: parseTimeToParts(
                                updated.time ||
                                updated.rescheduledTo?.time ||
                                a.raw?.time ||
                                `${formatTwo(a.hour)}:${formatTwo(a.minute)} ${a.ampm}`
                            ).ampm,
                            raw: updated || a.raw,
                        }
                        : a
                )
            );
            pushToast("Status updated", `Appointment #${id} is now ${newStatus}`);
        } catch (err) {
            console.error("changeStatusRemote:", err);
            setAppointments((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status: old.status } : a))
            );
            pushToast("Update failed", err.message || "Failed to update status");
        }
    }

    async function rescheduleRemote(id, dateStr, time24) {
        const appt = appointments.find((a) => a.id === id);
        if (!appt) return;
        const [hh, mm] = time24.split(":").map(Number);
        const hour12 = hh % 12 === 0 ? 12 : hh % 12;
        const ampm = hh >= 12 ? "PM" : "AM";
        const timeStr = `${formatTwo(hour12)}:${formatTwo(mm)} ${ampm}`;

        setAppointments((prev) =>
            prev.map((a) =>
                a.id === id
                    ? {
                        ...a,
                        date: dateStr,
                        hour: hour12,
                        minute: mm,
                        ampm,
                        status: "Rescheduled",
                    }
                    : a
            )
        );

        pushToast(
            "Rescheduling",
            `Appointment #${id} → ${formatDateNice(dateStr)} ${timeStr}`
        );

        try {
            const res = await fetch(`${API_BASE}/api/service-appointments/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    rescheduledTo: { date: dateStr, time: timeStr },
                    status: "Rescheduled",
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.message || `Reschedule failed (${res.status})`);
            }
            const body = await res.json();
            const updated = extractUpdated(body);

            const finalDate =
                updated.date || updated.rescheduledTo?.date || dateStr || appt.date;
            const finalTimeStr =
                updated.time ||
                updated.rescheduledTo?.time ||
                timeStr ||
                `${formatTwo(appt.hour)}:${formatTwo(appt.minute)} ${appt.ampm}`;

            const parsed = parseTimeToParts(finalTimeStr);

            setAppointments((prev) =>
                prev.map((a) =>
                    a.id === id
                        ? {
                            ...a,
                            date: finalDate,
                            hour: parsed.hour,
                            minute: parsed.minute,
                            ampm: parsed.ampm,
                            status: updated.status || "Rescheduled",
                            raw: updated || a.raw,
                        }
                        : a
                )
            );
            pushToast(
                "Rescheduled",
                `Appointment #${id} moved to ${formatDateNice(finalDate)} ${finalTimeStr}`
            );
        } catch (err) {
            console.error("rescheduleRemote:", err);
            pushToast(
                "Reschedule failed",
                err.message || "Failed to reschedule — reloading"
            );
            await fetchAppointments();
        }
    }

    async function cancelRemote(id) {
        const appt = appointments.find((a) => a.id === id);
        if (!appt) return;
        if (appt.status === "Canceled") return;
        if (
            !window.confirm(
                `Mark appointment for ${appt.patientName} on ${formatDateNice(appt.date)} as CANCELED?`
            )
        )
            return;

        setAppointments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, status: "Canceled" } : a))
        );
        pushToast("Canceling", `Appointment #${id} is being canceled`);

        try {
            const res = await fetch(
                `${API_BASE}/api/service-appointments/${id}/cancel`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.message || `Cancel failed (${res.status})`);
            }
            const body = await res.json();
            const updated = extractUpdated(body);
            setAppointments((prev) =>
                prev.map((a) =>
                    a.id === id
                        ? {
                            ...a,
                            status: updated.status || "Canceled",
                            raw: updated || a.raw,
                        }
                        : a
                )
            );
            pushToast("Canceled", `Appointment #${id} canceled`);
        } catch (err) {
            console.error("cancelRemote:", err);
            pushToast("Cancel failed", err.message || "Failed to cancel — reloading");
            await fetchAppointments();
        }
    }

    const filtered = useMemo(() => {
        const q = debouncedSearch.toLowerCase();
        return appointments
            .filter((a) =>
                q
                    ? (a.patientName || "").toLowerCase().includes(q) ||
                    (a.serviceName || "").toLowerCase().includes(q)
                    : true
            )
            .filter((a) => (statusFilter ? a.status === statusFilter : true));
    }, [appointments, debouncedSearch, statusFilter]);

    function getTimestamp(a) {
        try {
            const [y, m, d] = (a.date || "1970-01-01").split("-").map(Number);
            let hour = Number(a.hour) || 0;
            if ((a.ampm || "AM") === "PM" && hour !== 12) hour += 12;
            if ((a.ampm || "AM") === "AM" && hour === 12) hour = 0;
            const minute = Number(a.minute) || 0;
            return new Date(y, (m || 1) - 1, d || 1, hour, minute).getTime();
        } catch {
            return 0;
        }
    }

    const displayList = useMemo(() => {
        const copy = filtered.slice();
        copy.sort((x, y) => getTimestamp(y) - getTimestamp(x));
        return copy;
    }, [filtered]);

    return (
        <div className={serviceDashboardStyles.container}>
            <header className={serviceAppointmentsStyles.headerContainer}>
                <div className={serviceDashboardStyles.headerTitleContainer}>
                    <h1 className={serviceAppointmentsStyles.headerTitle}>
                        Appointments
                    </h1>
                    <p className={serviceDashboardStyles.headerSubtitle}>
                        Manage patient bookings - quick search & status controls
                    </p>
                </div>

                <div className={serviceAppointmentsStyles.searchContainer}>
                    <div className={serviceAppointmentsStyles.searchInputWrapper}>
                        <label className={serviceAppointmentsStyles.searchLabel}>
                            <span className="sr-only">
                                Search Appointments
                            </span>
                            <div className='flex items-center gap-2 relative w-full'>
                                <div className={serviceAppointmentsStyles.searchIconContainer}>
                                    <SearchIcon
                                        className={serviceAppointmentsStyles.searchIcon} />
                                </div>
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder='Search by patient or service...'
                                    className={serviceAppointmentsStyles.searchInput}
                                />
                                {search ? (
                                    <button className={serviceAppointmentsStyles.clearSearchButton} onClick={() => setSearch("")}>
                                        <XIcon className={serviceAppointmentsStyles.clearSeachIcon} />
                                    </button>
                                ) : null}
                            </div>
                        </label>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={serviceAppointmentsStyles.statusFilterSelect}
                            title="Filter by status"
                        >
                            <option value="">All</option>
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Rescheduled">Rescheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Canceled">Canceled</option>
                        </select>
                    </div>

                    <div className={serviceAppointmentsStyles.searchInfo}>
                        <div>
                            {displayList.length} result{displayList.length !== 1 ? "s" : ""}
                        </div>
                        <div>
                            <button onClick={fetchAppointments} className={serviceAppointmentsStyles.refreshButton}>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className={serviceAppointmentsStyles.loadingContainer}>
                    <Loader2 className="animate-spin" /> Loading appointments...
                </div>
            ) : error ? (
                <div className={serviceAppointmentsStyles.errorContainer}>{error}</div>
            ) : (
                <div className={serviceAppointmentsStyles.gridContainer}>
                    {displayList.length === 0 ? (
                        <div className={serviceAppointmentsStyles.noResultsContainer}>
                            <div className={serviceAppointmentsStyles.noResultsIcon}>
                                <Search />
                            </div>
                            <div className={serviceAppointmentsStyles.noResultsText}>
                                No appointments match your search
                            </div>
                            <div className={serviceAppointmentsStyles.noResultsSubtext}>
                                Try a different patient name or service
                            </div>
                        </div>
                    ) : (
                        displayList.map((a) => {
                            const isLocked = a.status === "Completed" || a.status === "Canceled";
                            return (
                                <article key={a.id} className={serviceAppointmentsStyles.article}>
                                    <div className={serviceAppointmentsStyles.cardInner}>
                                        <div>
                                            <div className={serviceAppointmentsStyles.cardHeader}>
                                                <div className={serviceAppointmentsStyles.patientInfoContainer}>
                                                    <div className={serviceAppointmentsStyles.patientAvatar}>
                                                        <User className={serviceAppointmentsStyles.patientAvatarIcon} />
                                                    </div>

                                                    <div>
                                                        <div className={serviceAppointmentsStyles.patientName}>
                                                            {a.patientName}
                                                        </div>
                                                        <div className={serviceAppointmentsStyles.patientDetails}>
                                                            {a.gender} • {a.age} yrs
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={serviceAppointmentsStyles.statusContainer}>
                                                    <StatusBadge status={a.status} />
                                                    <div className="mt-1">
                                                        <StatusSelect
                                                            appointment={a}
                                                            onChange={(s) => changeStatusRemote(a.id, s)}
                                                            disabled={false}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={serviceAppointmentsStyles.detailsContainer}>
                                                <div className={serviceAppointmentsStyles.detailItem}>
                                                    <Phone className={serviceAppointmentsStyles.detailIcon} />
                                                    <span className={serviceAppointmentsStyles.detailText}>
                                                        {a.mobile}
                                                    </span>
                                                </div>

                                                <div className={serviceAppointmentsStyles.detailItem}>
                                                    <BadgeIndianRupee className={serviceAppointmentsStyles.detailIcon} />
                                                    <span className={serviceAppointmentsStyles.feesText}>
                                                        Fees: ₹{a.fees}
                                                    </span>
                                                </div>

                                                <div className={serviceAppointmentsStyles.detailItem}>
                                                    <Calendar className={serviceAppointmentsStyles.detailIcon} />
                                                    <span className={serviceAppointmentsStyles.detailText}>
                                                        Date: {formatDateNice(a.date)}
                                                    </span>
                                                </div>

                                                <div className={serviceAppointmentsStyles.detailItem}>
                                                    <Clock className={serviceAppointmentsStyles.detailIcon} />
                                                    <span className={serviceAppointmentsStyles.detailText}>
                                                        Time: {formatTimeDisplay(a)}
                                                    </span>
                                                </div>

                                                <div className={serviceAppointmentsStyles.serviceText}>
                                                    Service:{" "}
                                                    <span className={serviceAppointmentsStyles.serviceName}>
                                                        {a.serviceName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={serviceAppointmentsStyles.actionsContainer}>
                                            <div className={serviceAppointmentsStyles.actionsInnerContainer}>
                                                <div className="flex-1">
                                                    <RescheduleButton
                                                        appointment={a}
                                                        onReschedule={(d, t) =>
                                                            rescheduleRemote(a.id, d, t)
                                                        }
                                                        disabled={false}
                                                    />
                                                </div>

                                                <div className="ml-3">
                                                    <button
                                                        onClick={() => cancelRemote(a.id)}
                                                        disabled={isLocked}
                                                        className={serviceAppointmentsStyles.cancelButton(isLocked)}
                                                        title={isLocked ? "Cannot cancel" : "Cancel appointment"}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            )}

            <Toast toasts={toasts} removeToast={removeToast} />
            <div className={serviceAppointmentsStyles.legendContainer}>
                <div className={serviceAppointmentsStyles.legendItem}>
                    <div className={`${serviceAppointmentsStyles.legendDot} bg-amber-400`} />{" "}
                    <span>Pending</span>
                </div>

                <div className={serviceAppointmentsStyles.legendItem}>
                    <div className={`${serviceAppointmentsStyles.legendDot} bg-emerald-400`} />{" "}
                    <span>Confirmed</span>
                </div>

                <div className={serviceAppointmentsStyles.legendItem}>
                    <div className={`${serviceAppointmentsStyles.legendDot} bg-red-400`} />{" "}
                    <span>Canceled</span>
                </div>

                <div className={serviceAppointmentsStyles.legendItem}>
                    <div className={`${serviceAppointmentsStyles.legendDot} bg-sky-400`} />{" "}
                    <span>Completed</span>
                </div>

                <div className={serviceAppointmentsStyles.legendItem}>
                    <div className={`${serviceAppointmentsStyles.legendDot} bg-indigo-400`} />{" "}
                    <span>Rescheduled</span>
                </div>
            </div>

            <style>{serviceAppointmentsStyles.animatedBorderStyle}</style>
        </div>
    );
};

export default ServiceAppointmentsPage;