import { useState, useEffect, useCallback } from "react";
import {
    FiDollarSign, FiShoppingBag,
    FiCheckCircle, FiRefreshCw, FiCornerUpLeft,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import { AdminTable, AdminPagination } from "../components/AdminTable";
import AdminBadge from "../components/AdminBadge";
import { useToast, ToastContainer } from "../components/AdminToast";
import { fetchHoldings, fetchWalletTx, issueRefund } from "../services/adminApi";

// Purchases and Vault Holdings were two tabs showing the same underlying
// rows (item / buyer / seller / amount / status) — Holdings is a strict
// superset (it adds released_at). Merged into a single "Purchases & Holdings"
// tab. Wallet Ledger stays separate since it's the only place with the full
// money-movement audit trail (separate Purchase + Release line entries).
const TABS = [
    { id: "purchases", label: "Purchases & Holdings", icon: FiShoppingBag, color: "#818cf8" },
    { id: "wallet_tx", label: "Wallet Ledger", icon: FiDollarSign, color: "#34d399" },
];
const PAGE_SIZE = 20;

const TX_TYPES = ["all", "purchase", "release", "refund"];
const PURCH_STATUSES = ["all", "holding", "released", "refunded"];

// ── Shared cell renderers (previously duplicated 3-5x across column defs) ──
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : "—");
const fmtAmount = (v) => `₹${Number(v ?? 0).toLocaleString()}`;
const IdCell = (v) => <code style={{ fontSize: 12 }}>{v}</code>;
const TitleCell = (v) => <span style={{ fontWeight: 600 }}>{v || "—"}</span>;
const StatusCell = (v) => <AdminBadge value={v} />;

const formatFilterLabel = (tab, value) => {
    if (value === "all") return tab === "wallet_tx" ? "All Types" : "All Statuses";
    return value.charAt(0).toUpperCase() + value.slice(1);
};

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

            // "purchases" tab now uses fetchHoldings — it's a superset of
            // fetchPurchases (same fields + released_at), so one call covers
            // both the order view and the vault lifecycle view.
            let data;
            if (tab === "purchases") data = await fetchHoldings(params);
            if (tab === "wallet_tx") {
                if (f !== "all") { delete params.status; params.type = f; }
                data = await fetchWalletTx(params);
            }

            // NOTE: /admin/holding-transactions calls the exact same backend
            // service (admin_list_purchases) as /admin/purchases, so it
            // returns the same response shape — key is "purchases", not
            // "holdings". Reading data.holdings here was always undefined,
            // which is why Total Records showed 0 regardless of filter.
            const key = tab === "purchases" ? "purchases" : "transactions";
            setRows(data?.[key] || []);
            setTotal(data?.total || 0);
            setHasMore(data?.has_more ?? false);
            setPage(pg);
        } catch { toast("Failed to load transactions.", "error"); }
        finally { setLoading(false); }
    }, [tab, filter, toast]);

    // Tab switch only resets the filter. The filter effect below is the
    // single place that actually triggers a fetch, so switching tabs no
    // longer fires two back-to-back requests.
    useEffect(() => {
        setFilter("all");
    }, [tab]);

    useEffect(() => {
        load(1, filter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, tab]);

    const handleRefund = async (row) => {
        const reason = window.prompt(`Refund reason for "${row.item_title || "this item"}"?`);
        if (!reason) return;
        try {
            await issueRefund(row.id, reason);
            toast("Refund issued.", "success");
            load(page, filter);
        } catch {
            toast("Failed to issue refund.", "error");
        }
    };

    // ── Column definitions (Purchases + Holdings merged) ────────────
    const PURCH_COLS = [
        { key: "item_title", label: "Item", render: TitleCell },
        { key: "buyer_login_id", label: "Buyer", render: IdCell },
        { key: "seller_login_id", label: "Seller", render: IdCell },
        { key: "amount", label: "Amount", render: fmtAmount },
        { key: "status", label: "Status", render: StatusCell },
        { key: "created_at", label: "Purchased", render: fmtDate },
        { key: "released_at", label: "Released", render: fmtDate },
        {
            key: "_actions", label: "",
            render: (_v, row) => row.status === "holding" ? (
                <button
                    className="ad-page-btn"
                    title="Issue refund"
                    onClick={() => handleRefund(row)}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                    <FiCornerUpLeft size={13} /> Refund
                </button>
            ) : null,
        },
    ];

    const TX_COLS = [
        { key: "item_title", label: "Item", render: TitleCell },
        { key: "from_login_id", label: "From", render: IdCell },
        { key: "to_login_id", label: "To", render: IdCell },
        { key: "amount", label: "Amount", render: fmtAmount },
        { key: "transaction_type", label: "Type", render: StatusCell },
        { key: "created_at", label: "Date", render: fmtDate },
    ];

    const cols = tab === "purchases" ? PURCH_COLS : TX_COLS;
    const filterOpts = tab === "purchases" ? PURCH_STATUSES : TX_TYPES;

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
                                    {formatFilterLabel(tab, o)}
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

