import { useState, useEffect, useCallback } from "react";
import {
    FiDollarSign, FiShoppingBag, FiLock,
    FiCheckCircle, FiRefreshCw,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import { AdminTable, AdminPagination } from "../components/AdminTable";
import AdminBadge from "../components/AdminBadge";
import { useToast, ToastContainer } from "../components/AdminToast";
import { fetchPurchases, fetchHoldings, fetchWalletTx } from "../services/adminApi";

const TABS = [
    { id: "purchases", label: "Purchases", icon: FiShoppingBag, color: "#818cf8" },
    { id: "holdings", label: "Vault Holdings", icon: FiLock, color: "#fbbf24" },
    { id: "wallet_tx", label: "Wallet Ledger", icon: FiDollarSign, color: "#34d399" },
];
const PAGE_SIZE = 20;

const HOLD_STATUSES = ["all", "holding", "released", "refunded"];
const TX_TYPES = ["all", "purchase", "release", "refund"];
const PURCH_STATUSES = ["all", "holding", "released", "refunded"];

export default function AdminTransactions() {
    const { toasts, toast, dismiss } = useToast();

    const [tab, setTab] = useState("purchases");
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    const load = useCallback(async (pg = 1, f = filter) => {
        try {
            setLoading(true);
            const params = { page: pg, pageSize: PAGE_SIZE };
            if (f !== "all") params.status = f;

            let data;
            if (tab === "purchases") data = await fetchPurchases(params);
            if (tab === "holdings") data = await fetchHoldings({ ...params, status: f });
            if (tab === "wallet_tx") {
                if (f !== "all") { delete params.status; params.type = f; }
                data = await fetchWalletTx(params);
            }

            const key = tab === "purchases" ? "purchases"
                : tab === "holdings" ? "holdings"
                    : "transactions";
            setRows(data?.[key] || []);
            setTotal(data?.total || 0);
            setHasMore(data?.has_more ?? false);
            setPage(pg);
        } catch { toast("Failed to load transactions.", "error"); }
        finally { setLoading(false); }
    }, [tab, filter, toast]);

    useEffect(() => {
        setFilter("all");
        load(1, "all");
    }, [tab]);

    useEffect(() => { load(1, filter); }, [filter]);

    // ── Column definitions ──────────────────────────
    const PURCH_COLS = [
        {
            key: "item_title", label: "Item",
            render: (v) => <span style={{ fontWeight: 600 }}>{v || "—"}</span>
        },
        {
            key: "buyer_login_id", label: "Buyer ID",
            render: (v) => <code style={{ fontSize: 12 }}>{v}</code>
        },
        {
            key: "seller_login_id", label: "Seller ID",
            render: (v) => <code style={{ fontSize: 12 }}>{v}</code>
        },
        {
            key: "amount", label: "Amount",
            render: (v) => `₹${Number(v ?? 0).toLocaleString()}`
        },
        { key: "status", label: "Status", render: (v) => <AdminBadge value={v} /> },
        {
            key: "created_at", label: "Date",
            render: (v) => v ? new Date(v).toLocaleDateString() : "—"
        },
    ];

    const HOLD_COLS = [
        {
            key: "item_title", label: "Item",
            render: (v) => <span style={{ fontWeight: 600 }}>{v || "—"}</span>
        },
        {
            key: "buyer_login_id", label: "Buyer",
            render: (v) => <code style={{ fontSize: 12 }}>{v}</code>
        },
        {
            key: "seller_login_id", label: "Seller",
            render: (v) => <code style={{ fontSize: 12 }}>{v}</code>
        },
        {
            key: "amount", label: "Held Amount",
            render: (v) => `₹${Number(v ?? 0).toLocaleString()}`
        },
        { key: "status", label: "Status", render: (v) => <AdminBadge value={v} /> },
        { key: "created_at", label: "Created", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
        { key: "released_at", label: "Released", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
    ];

    const TX_COLS = [
        { key: "item_title", label: "Item" },
        { key: "from_login_id", label: "From", render: (v) => <code style={{ fontSize: 12 }}>{v}</code> },
        { key: "to_login_id", label: "To", render: (v) => <code style={{ fontSize: 12 }}>{v}</code> },
        { key: "amount", label: "Amount", render: (v) => `₹${Number(v ?? 0).toLocaleString()}` },
        { key: "transaction_type", label: "Type", render: (v) => <AdminBadge value={v} /> },
        { key: "created_at", label: "Date", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
    ];

    const cols = tab === "purchases" ? PURCH_COLS
        : tab === "holdings" ? HOLD_COLS
            : TX_COLS;

    const filterOpts = tab === "purchases" ? PURCH_STATUSES
        : tab === "holdings" ? HOLD_STATUSES
            : TX_TYPES;

    return (
        <AdminLayout title="Transactions" subtitle="Financial records and vault holdings">
            <ToastContainer toasts={toasts} dismiss={dismiss} />

            {/* Tab Bar */}
            <div className="ad-tabs">
                {TABS.map(({ id, label, icon: Icon, color }) => (
                    <button
                        key={id}
                        className={`ad-tab ${tab === id ? "active" : ""}`}
                        onClick={() => setTab(id)}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                        <Icon size={14} color={tab === id ? color : "var(--ad-text-hint)"} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Summary Strip */}
            <div style={{
                display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap",
            }}>
                {[
                    { label: "Total Records", value: total, color: "var(--ad-indigo)", bg: "var(--ad-indigo-soft)" },
                ].map((s) => (
                    <div key={s.label} style={{
                        background: s.bg, borderRadius: 10, padding: "10px 16px",
                        display: "flex", alignItems: "center", gap: 10,
                    }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
                        <span style={{ fontSize: 12, color: "var(--ad-text-sec)" }}>{s.label}</span>
                    </div>
                ))}
            </div>

            <div className="ad-card">
                <div className="ad-card__header">
                    <div className="ad-filter-bar">
                        <select className="ad-select" value={filter}
                            onChange={(e) => setFilter(e.target.value)}>
                            {filterOpts.map((o) => (
                                <option key={o} value={o}>
                                    {o === "all" ? (tab === "wallet_tx" ? "All Types" : "All Statuses")
                                        : o.charAt(0).toUpperCase() + o.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <AdminTable columns={cols} rows={rows} loading={loading}
                    emptyMsg="No records found." />

                <AdminPagination page={page} pageSize={PAGE_SIZE} total={total}
                    hasMore={hasMore} loading={loading} onPage={(pg) => load(pg)} />
            </div>
        </AdminLayout>
    );
}