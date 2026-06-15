import React from 'react'
import { useRef, useState, useMemo, useEffect } from 'react';
import { serviceDashboardStyles } from '../assets/dummyStyles'
import { BadgeIndianRupee, Calendar, XCircle, ClipboardList, CheckCircle, Search } from 'lucide-react';

const API_BASE = "http://localhost:4000";

function buildFetchOptions() {
    const opts = {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    };
    const token = localStorage.getItem("authToken");
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    return opts;
}

function formatCurrency(v) {
    return `₹${Number(v || 0).toLocaleString()}`;
}

const ServiceDashboard = () => {
    const [summary, setSummary] = useState({ total: 0, pending: 0, confirmed: 0, rescheduled: 0, completed: 0, canceled: 0 });
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAll, setShowAll] = useState(false);

    const mountedRef = useRef(true);
    const fetchingRef = useRef(false);
    const pollHandleRef = useRef(null);

    async function fetchData({ showLoading = true } = {}) {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        try {
            if (showLoading) { setLoading(true); setError(null); }

            const [summaryRes, servicesRes] = await Promise.all([
                fetch(`${API_BASE}/api/service-appointments/stats/summary`, buildFetchOptions()),
                fetch(`${API_BASE}/api/service-appointments/stats/by-service`, buildFetchOptions()),
            ]);

            if (!summaryRes.ok) throw new Error(`Summary fetch failed (${summaryRes.status})`);
            if (!servicesRes.ok) throw new Error(`Services fetch failed (${servicesRes.status})`);

            const summaryBody = await summaryRes.json();
            const servicesBody = await servicesRes.json();

            if (mountedRef.current) {
                setSummary(summaryBody.data || {});
                setServices(servicesBody.data || []);
                setError(null);
            }
        } catch (err) {
            console.error("Fetch error:", err);
            if (mountedRef.current) setError(err.message || "Failed to load data");
        } finally {
            if (mountedRef.current && showLoading) setLoading(false);
            fetchingRef.current = false;
        }
    }

    useEffect(() => {
        window.refreshServices = () => fetchData({ showLoading: true });
        return () => { try { delete window.refreshServices; } catch { } };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        fetchData({ showLoading: true });

        function startPolling() {
            if (pollHandleRef.current) return;
            pollHandleRef.current = setInterval(() => {
                if (document.visibilityState === "visible") fetchData({ showLoading: false });
            }, 10000);
        }

        function stopPolling() {
            if (pollHandleRef.current) { clearInterval(pollHandleRef.current); pollHandleRef.current = null; }
        }

        startPolling();
        const onFocus = () => fetchData({ showLoading: false });
        const onVisibilityChange = () => { if (document.visibilityState === "visible") fetchData({ showLoading: false }); };
        const onStorage = (e) => { if (e?.key === "service_bookings_updated") fetchData({ showLoading: false }); };
        const onUpdated = () => fetchData({ showLoading: false });

        window.addEventListener("focus", onFocus);
        window.addEventListener("services:updated", onUpdated);
        window.addEventListener("storage", onStorage);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            mountedRef.current = false;
            stopPolling();
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("services:updated", onUpdated);
            window.removeEventListener("storage", onStorage);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    const filteredServices = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return services;
        return services.filter((s) => s.serviceName?.toLowerCase().includes(q));
    }, [services, searchQuery]);

    const INITIAL_COUNT = 8;
    const visibleServices = showAll ? filteredServices : filteredServices.slice(0, INITIAL_COUNT);

    const totalEarning = useMemo(() =>
        services.reduce((acc, s) => acc + (s.completed * (s.fees || 0)), 0),
        [services]
    );

    return (
        <div className={serviceDashboardStyles.container}>
            <div className={serviceDashboardStyles.innerContainer}>

                {/* Header */}
                <div className={serviceDashboardStyles.header.container}>
                    <div>
                        <h1 className={serviceDashboardStyles.header.title}>Service Dashboard</h1>
                        <p className={serviceDashboardStyles.header.subtitle}>Overview of services, appointments and earnings</p>
                    </div>
                    <div className={serviceDashboardStyles.refresh.container}>
                        <div className={serviceDashboardStyles.refresh.countText}>
                            {loading ? "Loading..." : `${filteredServices.length} service${filteredServices.length !== 1 ? "s" : ""}`}
                        </div>
                        <button
                            onClick={() => fetchData({ showLoading: true })}
                            className={serviceDashboardStyles.refresh.button(false)}
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Stat Cards */}
                <div className={serviceDashboardStyles.statGrid}>
                    <StatCard icon={<ClipboardList size={18} />} label="Total Appointments" value={summary.total} />
                    <StatCard icon={<Calendar size={18} />} label="Pending" value={summary.pending} />
                    <StatCard icon={<BadgeIndianRupee size={18} />} label="Total Earnings" value={formatCurrency(totalEarning)} />
                    <StatCard icon={<CheckCircle size={18} />} label="Completed" value={summary.completed} />
                    <StatCard icon={<XCircle size={18} />} label="Canceled" value={summary.canceled} />
                </div>

                {/* Search */}
                <div className={serviceDashboardStyles.search.container}>
                    <div className={serviceDashboardStyles.search.inputContainer}>
                        <Search size={16} className="text-emerald-700" />
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={serviceDashboardStyles.search.input}
                        />
                        {searchQuery.length > 0 && (
                            <XCircle size={16} className="text-red-500 cursor-pointer" onClick={() => setSearchQuery("")} />
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className={serviceDashboardStyles.table.container}>

                    {/* Tablet header */}
                    <div className={serviceDashboardStyles.table.headerMd}>
                        <div className={serviceDashboardStyles.table.headerText}>Service</div>
                        <div className={serviceDashboardStyles.table.headerText}>Appointments</div>
                        <div className={serviceDashboardStyles.table.headerText}>Completed</div>
                        <div className={serviceDashboardStyles.table.headerText}>Canceled</div>
                        <div className={serviceDashboardStyles.table.headerText}>Earning</div>
                    </div>

                    {/* Desktop header */}
                    <div className={serviceDashboardStyles.table.headerLg}>
                        <div className="col-span-5">Service</div>
                        <div className="col-span-2">Price</div>
                        <div className={serviceDashboardStyles.table.headerTextLg(1)}>Appointments</div>
                        <div className={serviceDashboardStyles.table.headerTextLg(1)}>Completed</div>
                        <div className={serviceDashboardStyles.table.headerTextLg(1)}>Canceled</div>
                        <div className="col-span-2 text-right">Earning</div>
                    </div>

                    {/* Rows */}
                    <div className={serviceDashboardStyles.table.body}>
                        {loading ? (
                            <div className={serviceDashboardStyles.states.loading}>
                                Loading services...
                            </div>
                        ) : error ? (
                            <div className={serviceDashboardStyles.states.error}>
                                Error: {error}
                            </div>
                        ) : visibleServices.length === 0 ? (
                            <div className={serviceDashboardStyles.states.empty}>
                                No services found.
                            </div>
                        ) : (
                            visibleServices.map((s) => {
                                const earnings = s.completed * (s.fees || 0);
                                return (
                                    <div key={String(s._id)} className={serviceDashboardStyles.table.row}>

                                        {/* Mobile view */}
                                        <div className={serviceDashboardStyles.table.mobileView}>
                                            <div className="flex items-center gap-3">
                                                <div className={serviceDashboardStyles.table.mobileImage}>
                                                    {s.imageUrl && (
                                                        <img src={s.imageUrl} alt={s.serviceName} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className={serviceDashboardStyles.table.mobileServiceName}>{s.serviceName}</div>
                                                    <div className="text-xs text-gray-500">{formatCurrency(s.fees)}</div>
                                                </div>
                                            </div>
                                            <div className={serviceDashboardStyles.table.mobileStatsContainer}>
                                                <span className={serviceDashboardStyles.table.mobileStatItem("emerald")}>
                                                    📋 {s.total} appts
                                                </span>
                                                <span className={serviceDashboardStyles.table.mobileStatItem("emerald")}>
                                                    ✓ {s.completed} done
                                                </span>
                                                <span className={serviceDashboardStyles.table.mobileStatItem("red")}>
                                                    ✕ {s.canceled} canceled
                                                </span>
                                                <span className={serviceDashboardStyles.table.mobileStatItem("emerald")}>
                                                    {formatCurrency(earnings)} earned
                                                </span>
                                            </div>
                                        </div>

                                        {/* Tablet view */}
                                        <div className={serviceDashboardStyles.table.tabletView}>
                                            <div className="flex items-center gap-3">
                                                <div className={serviceDashboardStyles.table.tabletImage}>
                                                    {s.imageUrl && (
                                                        <img src={s.imageUrl} alt={s.serviceName} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className={serviceDashboardStyles.table.tabletTextContainer}>
                                                    <div className={serviceDashboardStyles.table.tabletServiceName}>
                                                        {s.serviceName}
                                                    </div>
                                                    <div className={serviceDashboardStyles.table.tabletPrice}>
                                                        {formatCurrency(s.fees)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={serviceDashboardStyles.table.tabletCell}>
                                                {s.total}
                                            </div>
                                            <div className={`${serviceDashboardStyles.table.tabletCell} text-emerald-700`}>
                                                {s.completed}
                                            </div>
                                            <div className={`${serviceDashboardStyles.table.tabletCell} text-red-500`}>
                                                {s.canceled}
                                            </div>
                                            <div className={`${serviceDashboardStyles.table.tabletCell} text-right`}>
                                                {formatCurrency(earnings)}
                                            </div>
                                        </div>

                                        {/* Desktop view */}
                                        <div className={serviceDashboardStyles.table.desktopView}>
                                            <div className="col-span-5 flex items-center gap-4">
                                                <div className={serviceDashboardStyles.table.desktopImage}>
                                                    {s.imageUrl && (
                                                        <img src={s.imageUrl} alt={s.serviceName} className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium">{s.serviceName}</div>
                                                </div>
                                            </div>
                                            <div className="col-span-2 text-sm">
                                                {formatCurrency(s.fees)}
                                            </div>
                                            <div className={serviceDashboardStyles.table.headerTextLg(1)}>
                                                {s.total}
                                            </div>
                                            <div className={`${serviceDashboardStyles.table.headerTextLg(1)} text-emerald-700`}>
                                                {s.completed}
                                            </div>
                                            <div className={`${serviceDashboardStyles.table.headerTextLg(1)} text-red-500`}>
                                                {s.canceled}
                                            </div>
                                            <div className="col-span-2 text-right text-sm">
                                                {formatCurrency(earnings)}
                                            </div>
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Show more/less */}
                {filteredServices.length > INITIAL_COUNT && (
                    <div className={serviceDashboardStyles.showMore.container}>
                        <button onClick={() => setShowAll((s) => !s)} className={serviceDashboardStyles.showMore.button}>
                            {showAll
                                ? "Show less"
                                : `Show more (${filteredServices.length - INITIAL_COUNT})`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceDashboard;

function StatCard({ icon, label, value }) {
    return (
        <div className={serviceDashboardStyles.statCard.container}>
            <div className={serviceDashboardStyles.statCard.iconContainer}>{icon}</div>
            <div>
                <div className={serviceDashboardStyles.statCard.label}>{label}</div>
                <div className={serviceDashboardStyles.statCard.value}>{value}</div>
            </div>
        </div>
    );
}