import { useState, useEffect } from "react";
import {
    FiUsers, FiPackage, FiTag, FiDollarSign, FiLock,
    FiFlag, FiUserPlus, FiTrendingUp, FiAlertTriangle,
    FiShoppingBag, FiCheckCircle, FiClock, FiMessageSquare,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import AdminStatCard from "../components/AdminStatCard";
import AdminBadge from "../components/AdminBadge";
import { fetchDashboard } from "../services/adminApi";

const fmtNum = (n) => Number(n ?? 0).toLocaleString();
const fmtCur = (n) => `₹${Number(n ?? 0).toLocaleString()}`;

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
            <div className="ad-activity-time">
                <FiClock size={11} style={{ marginRight: 3 }} />
                {event.time_ago}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await fetchDashboard();
                setStats(data.stats);
                setActivity(data.recent_activity || []);
            } catch {
                setError("Unable to load dashboard. Please refresh.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const StatSkel = () => (
        <div className="ad-stats-grid">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="ad-stat" style={{ gap: 8 }}>
                    <div className="ad-skeleton" style={{ width: 42, height: 42, borderRadius: 11 }} />
                    <div className="ad-skeleton" style={{ width: "55%", height: 30 }} />
                    <div className="ad-skeleton" style={{ width: "75%", height: 12 }} />
                </div>
            ))}
        </div>
    );

    return (
        <AdminLayout
            title="Dashboard"
            subtitle="Campus Secure Marketplace — Operations Overview"
            unreadReports={stats?.open_reports ?? 0}
        >
            {/* Hero banner */}
            <div style={{
                background: "linear-gradient(135deg, #0f1729, #1e1b4b)",
                borderRadius: 20, padding: "22px 26px", marginBottom: 24,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 16,
            }}>
                <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
                        Total Platform Wallet Balance
                    </div>
                    <div style={{ fontSize: 38, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>
                        {loading ? "₹—" : fmtCur(stats?.total_wallet_balance)}
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                        Active Vault Holdings
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#fbbf24" }}>
                        {loading ? "₹—" : fmtCur(stats?.total_held_amount)}
                    </div>
                </div>
            </div>

            {error && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 12, padding: "14px 18px", marginBottom: 20,
                    color: "#991b1b", fontSize: 13,
                }}>
                    <FiAlertTriangle size={17} />
                    {error}
                </div>
            )}

            {loading ? <StatSkel /> : (
                <div className="ad-stats-grid">
                    <AdminStatCard icon={FiUsers} label="Total Users" value={fmtNum(stats?.total_users)} theme="indigo" sub={`${fmtNum(stats?.active_users)} active`} />
                    <AdminStatCard icon={FiPackage} label="Total Listings" value={fmtNum(stats?.total_listings)} theme="blue" sub={`${fmtNum(stats?.active_listings)} active`} />
                    <AdminStatCard icon={FiTag} label="Sold Items" value={fmtNum(stats?.sold_listings)} theme="green" />
                    <AdminStatCard icon={FiShoppingBag} label="Total Purchases" value={fmtNum(stats?.total_purchases)} theme="purple" />
                    <AdminStatCard icon={FiLock} label="Vault Holdings" value={fmtNum(stats?.active_vault_holdings)} theme="amber" sub={fmtCur(stats?.total_held_amount)} />
                    <AdminStatCard icon={FiDollarSign} label="Wallet Balance" value={fmtCur(stats?.total_wallet_balance)} theme="teal" />
                    <AdminStatCard icon={FiFlag} label="Open Reports" value={fmtNum(stats?.open_reports)} theme="red" trendDir={stats?.open_reports > 0 ? "up" : null} />
                    <AdminStatCard icon={FiMessageSquare} label="Open Support" value={fmtNum(stats?.open_support_requests)} theme="pink" />
                </div>
            )}

            {/* Recent Activity */}
            <div className="ad-card">
                <div className="ad-card__header">
                    <div className="ad-card__title">
                        <FiClock size={15} color="var(--ad-indigo)" />
                        Recent Activity
                    </div>
                </div>
                {loading ? (
                    <div style={{ padding: 20 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="ad-skeleton"
                                style={{ height: 50, marginBottom: 10, borderRadius: 10 }} />
                        ))}
                    </div>
                ) : activity.length === 0 ? (
                    <div className="ad-empty">
                        <p className="ad-empty__title">No recent activity</p>
                    </div>
                ) : (
                    <div style={{ padding: "0 20px" }}>
                        {activity.map((ev, i) => (
                            <ActivityItem key={i} event={ev} />
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}