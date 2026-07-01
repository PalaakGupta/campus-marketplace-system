import { useState, useEffect, useCallback } from "react";
import {
    FiUsers, FiPackage, FiTag, FiLock,
    FiFlag, FiUserPlus, FiAlertTriangle,
    FiShoppingBag, FiCheckCircle, FiMessageSquare,
    FiRefreshCw,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import AdminStatCard from "../components/AdminStatCard";
import { fetchDashboard } from "../services/adminApi";

/* ── Helpers ─────────────────────────────────────── */
const fmtNum = (n) => {
    const num = Number(n ?? 0);
    return isNaN(num) ? "0" : num.toLocaleString();
};

const fmtCur = (n) => {
    const num = Number(n ?? 0);
    return isNaN(num) ? "₹0" : `₹${num.toLocaleString()}`;
};

const pick = (obj, ...keys) => {
    if (!obj) return undefined;
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
};

/* ── Activity icon map ───────────────────────────── */
const ACTIVITY_ICONS = {
    user_imported: { icon: FiUserPlus, bg: "var(--ad-indigo-soft)", color: "var(--ad-indigo)" },
    item_listed: { icon: FiPackage, bg: "var(--ad-blue-soft)", color: "var(--ad-blue)" },
    item_sold: { icon: FiTag, bg: "var(--ad-green-soft)", color: "var(--ad-green)" },
    report_submitted: { icon: FiFlag, bg: "var(--ad-red-soft)", color: "var(--ad-red)" },
    support_request: { icon: FiMessageSquare, bg: "var(--ad-amber-soft)", color: "var(--ad-amber)" },
    purchase: { icon: FiShoppingBag, bg: "var(--ad-purple-soft)", color: "var(--ad-purple)" },
};

function ActivityItem({ event }) {
    const cfg = ACTIVITY_ICONS[event.type] || {
        icon: FiCheckCircle, bg: "var(--ad-teal-soft)", color: "var(--ad-teal)",
    };
    const Icon = cfg.icon;
    return (
        <div className="ad-activity-item">
            <div className="ad-activity-dot" style={{ background: cfg.bg }}>
                <Icon size={16} color={cfg.color} />
            </div>
            <div className="ad-activity-body">
                <div className="ad-activity-title">{event.title}</div>
                <div className="ad-activity-sub">{event.description}</div>
            </div>
            <div className="ad-activity-time" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <FiClock size={11} /> {event.time_ago}
            </div>
        </div>
    );
}

function StatSkeleton() {
    return (
        <div className="ad-stats-grid">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="ad-stat" style={{ gap: 8 }}>
                    <div className="ad-skeleton" style={{ width: 42, height: 42, borderRadius: 11 }} />
                    <div className="ad-skeleton" style={{ width: "55%", height: 30 }} />
                    <div className="ad-skeleton" style={{ width: "75%", height: 12 }} />
                </div>
            ))}
        </div>
    );
}

/* ── Main Component ──────────────────────────────── */
export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState(null);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await fetchDashboard();

            /*
             * Backend may return either:
             *   { stats: {...}, recent_activity: [...] }   ← expected envelope
             *   { ...flatStats, recent_activity: [...] }   ← flat response
             * We handle both so dashboard stats always render.
             */
            const statsData = data?.stats ?? data ?? {};
            const activityData = data?.recent_activity ?? data?.activity ?? [];

            setStats(statsData);
            setActivity(Array.isArray(activityData) ? activityData : []);
            setLastRefreshed(new Date());
        } catch (err) {
            const msg =
                err?.response?.data?.data?.message ||
                err?.response?.data?.detail ||
                "Unable to load dashboard. Check your connection and try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    /* Resolved stat values — covers multiple possible backend field names */
    const s = stats || {};

    const totalUsers = pick(s, "total_users", "users_count", "user_count");
    const activeUsers = pick(s, "active_users", "active_user_count");
    const totalListings = pick(s, "total_listings", "total_items", "listings_count", "items_count");
    const activeListings = pick(s, "active_listings", "active_items", "active_listings_count");
    const soldListings = pick(s, "sold_listings", "total_sold", "sold_items", "sold_count");
    const totalPurchases = pick(s, "total_purchases", "purchases_count", "purchase_count");
    const activeVaultHoldings = pick(s, "active_vault_holdings", "vault_holdings_count", "vault_count", "holding_count");
    const openReports = pick(s, "open_reports", "pending_reports", "reports_pending");
    const openSupport = pick(s, "open_support_requests", "pending_support", "support_open", "support_pending");

    const hasUnread = Number(openReports ?? 0) > 0;

    return (
        <AdminLayout
            title="Dashboard"
            subtitle="Campus Secure Marketplace — Operations Overview"
            unreadReports={Number(openReports ?? 0)}
        >
            {/* ── Error Banner ── */}
            {error && (
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, background: "var(--ad-red-soft)", border: "1px solid var(--ad-red-mid)",
                    borderRadius: 12, padding: "14px 18px", marginBottom: 20,
                    color: "#991b1b", fontSize: 13, flexWrap: "wrap",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FiAlertTriangle size={16} /> {error}
                    </div>
                    <button
                        className="ad-btn ad-btn--outline ad-btn--sm"
                        style={{ borderColor: "var(--ad-red-mid)", color: "#991b1b" }}
                        onClick={loadDashboard}
                    >
                        <FiRefreshCw size={12} /> Retry
                    </button>
                </div>
            )}

            {/* ── Refresh Button ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 10 }}>
                <button
                    className="ad-btn ad-btn--outline ad-btn--sm"
                    onClick={loadDashboard}
                    disabled={loading}
                >
                    <FiRefreshCw
                        size={12}
                        style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
                    />
                    {lastRefreshed
                        ? `Updated ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Refresh"
                    }
                </button>
            </div>

            {/* ── Stats Grid ── */}
            {loading ? (
                <StatSkeleton />
            ) : (
                <div className="ad-stats-grid">
                    <AdminStatCard
                        icon={FiUsers}
                        label="Total Users"
                        value={fmtNum(totalUsers)}
                        theme="indigo"
                        sub={activeUsers !== undefined ? `${fmtNum(activeUsers)} active` : undefined}
                    />
                    <AdminStatCard
                        icon={FiPackage}
                        label="Total Listings"
                        value={fmtNum(totalListings)}
                        theme="blue"
                        sub={activeListings !== undefined ? `${fmtNum(activeListings)} active` : undefined}
                    />
                    <AdminStatCard
                        icon={FiTag}
                        label="Sold Items"
                        value={fmtNum(soldListings)}
                        theme="green"
                    />
                    <AdminStatCard
                        icon={FiShoppingBag}
                        label="Total Purchases"
                        value={fmtNum(totalPurchases)}
                        theme="purple"
                    />
                    <AdminStatCard
                        icon={FiLock}
                        label="Vault Holdings"
                        value={fmtNum(activeVaultHoldings)}
                        theme="amber"
                    />
                    <AdminStatCard
                        icon={FiFlag}
                        label="Open Reports"
                        value={fmtNum(openReports)}
                        theme="red"
                        trendDir={hasUnread ? "up" : undefined}
                        trend={hasUnread ? "Needs review" : undefined}
                    />
                    <AdminStatCard
                        icon={FiMessageSquare}
                        label="Open Support"
                        value={fmtNum(openSupport)}
                        theme="pink"
                    />
                </div>
            )}

            {/* ── Recent Activity ── */}
            {/*}
            <div className="ad-card">
                <div className="ad-card__header">
                    <div className="ad-card__title">
                        <FiClock size={15} color="var(--ad-indigo)" />
                        Recent Activity
                    </div>
                    {!loading && activity.length > 0 && (
                        <span style={{ fontSize: 11, color: "var(--ad-text-hint)" }}>
                            {activity.length} event{activity.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: 20 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="ad-skeleton" style={{ height: 50, marginBottom: 10, borderRadius: 10 }} />
                        ))}
                    </div>
                ) : activity.length === 0 ? (
                    <div className="ad-empty">
                        <div className="ad-empty__icon">
                            <FiTrendingUp size={26} />
                        </div>
                        <p className="ad-empty__title">No recent activity</p>
                        <p className="ad-empty__desc">
                            Activity will appear here as users interact with the platform.
                        </p>
                    </div>
                ) : (
                    <div style={{ padding: "0 20px" }}>
                        {activity.map((ev, i) => (
                            <ActivityItem key={i} event={ev} />
                        ))}
                    </div>
                )}
            </div>       */}

            {/* Spin keyframe for inline refresh icon */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </AdminLayout>
    );
}