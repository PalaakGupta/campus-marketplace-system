import { useState, useEffect, useCallback, useRef } from "react";
import {
    FiPackage, FiSearch, FiTrash2, FiRefreshCw,
    FiAlertTriangle, FiEye, FiX,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import { AdminTable, AdminPagination } from "../components/AdminTable";
import AdminBadge from "../components/AdminBadge";
import { useToast, ToastContainer } from "../components/AdminToast";
import { fetchListings, removeListing, restoreListing, flagListing } from "../services/adminApi";

const STATUSES = ["all", "available", "reserved", "sold", "removed", "flagged"];
const CHANNELS = ["all", "marketplace", "thrift_store"];
const PAGE_SIZE = 20;

export default function AdminListings() {
    const { toasts, toast, dismiss } = useToast();

    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [channel, setChannel] = useState("all");
    const [modal, setModal] = useState(null);   // { type: "remove"|"flag"|"restore", item }
    const [acting, setActing] = useState(false);

    const debRef = useRef(null);

    const load = useCallback(async (pg = 1, q = search, s = status, ch = channel) => {
        try {
            setLoading(true);
            const params = { page: pg, pageSize: PAGE_SIZE };
            if (q) params.search = q;
            if (s !== "all") params.status = s;
            if (ch !== "all") params.channel = ch;
            const data = await fetchListings(params);
            setRows(data.listings || []);
            setTotal(data.total || 0);
            setHasMore(data.has_more ?? false);
            setPage(pg);
        } catch { toast("Failed to load listings.", "error"); }
        finally { setLoading(false); }
    }, [search, status, channel, toast]);

    useEffect(() => {
        clearTimeout(debRef.current);
        debRef.current = setTimeout(() => load(1, search, status, channel), 300);
        return () => clearTimeout(debRef.current);
    }, [search, status, channel]);

    const handleAction = async () => {
        if (!modal) return;
        const { type, item } = modal;
        try {
            setActing(true);
            if (type === "remove") await removeListing(item.id);
            if (type === "restore") await restoreListing(item.id);
            if (type === "flag") await flagListing(item.id);

            const newStatus =
                type === "remove" ? "removed" :
                    type === "flag" ? "flagged" : "available";

            setRows((r) => r.map((x) => x.id === item.id ? { ...x, status: newStatus } : x));
            toast(`Listing ${type === "remove" ? "removed" : type === "flag" ? "flagged" : "restored"} successfully.`, "success");
            setModal(null);
        } catch (err) {
            toast(err?.response?.data?.data?.message || `Action failed.`, "error");
        } finally { setActing(false); }
    };

    const COLS = [
        {
            key: "title", label: "Item",
            render: (v) => (
                <span style={{ fontWeight: 600, color: "var(--ad-text)" }} className="ad-truncate"
                    title={v} style={{ maxWidth: 180, display: "inline-block" }}>
                    {v}
                </span>
            )
        },
        {
            key: "seller_login_id", label: "Seller ID",
            render: (v) => (
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--ad-text-sec)" }}>{v}</span>
            )
        },
        {
            key: "price", label: "Price",
            render: (v) => `₹${Number(v ?? 0).toLocaleString()}`
        },
        { key: "status", label: "Status", render: (v) => <AdminBadge value={v} /> },
        { key: "listing_channel", label: "Channel", render: (v) => <AdminBadge value={v} /> },
        {
            key: "created_at", label: "Listed",
            render: (v) => v ? new Date(v).toLocaleDateString() : "—"
        },
        {
            key: "id", label: "Actions",
            render: (id, row) => (
                <div className="ad-flex ad-gap-8">
                    {row.status === "removed" ? (
                        <button className="ad-btn ad-btn--success ad-btn--sm"
                            onClick={() => setModal({ type: "restore", item: row })}>
                            <FiRefreshCw size={12} /> Restore
                        </button>
                    ) : (
                        <>
                            {row.status !== "flagged" && (
                                <button className="ad-btn ad-btn--outline ad-btn--sm"
                                    style={{ borderColor: "var(--ad-amber)", color: "var(--ad-amber)" }}
                                    onClick={() => setModal({ type: "flag", item: row })}>
                                    <FiAlertTriangle size={12} /> Flag
                                </button>
                            )}
                            <button className="ad-btn ad-btn--danger ad-btn--sm"
                                onClick={() => setModal({ type: "remove", item: row })}>
                                <FiTrash2 size={12} /> Remove
                            </button>
                        </>
                    )}
                </div>
            )
        },
    ];

    const modalConfig = modal && {
        remove: { title: "Remove Listing", desc: "This will hide the listing from the marketplace.", btnLabel: "Remove", btnCls: "ad-btn--danger" },
        flag: { title: "Flag as Suspicious", desc: "This will flag the listing for review.", btnLabel: "Flag", btnCls: "ad-btn--outline" },
        restore: { title: "Restore Listing", desc: "This will make the listing visible in the marketplace again.", btnLabel: "Restore", btnCls: "ad-btn--success" },
    }[modal?.type];

    return (
        <AdminLayout title="Listings" subtitle="All marketplace listings">
            <ToastContainer toasts={toasts} dismiss={dismiss} />

            {/* Confirm Modal */}
            {modal && modalConfig && (
                <div className="ad-modal-overlay" onClick={() => setModal(null)}>
                    <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ad-modal__header">
                            <span className="ad-modal__title">{modalConfig.title}</span>
                            <button className="ad-btn--ghost" onClick={() => setModal(null)}>
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="ad-modal__body">
                            <div style={{ background: "var(--ad-bg)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                                <div style={{ fontWeight: 700, marginBottom: 3 }}>{modal.item.title}</div>
                                <div style={{ fontSize: 13, color: "var(--ad-text-sec)" }}>
                                    Seller: {modal.item.seller_login_id} · ₹{Number(modal.item.price ?? 0).toLocaleString()}
                                </div>
                            </div>
                            <p style={{ fontSize: 13, color: "var(--ad-text-sec)" }}>{modalConfig.desc}</p>
                        </div>
                        <div className="ad-modal__footer">
                            <button className="ad-btn ad-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className={`ad-btn ${modalConfig.btnCls}`}
                                onClick={handleAction} disabled={acting}>
                                {acting ? "Processing…" : modalConfig.btnLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="ad-page-header">
                <div>
                    <div className="ad-page-title">Listings</div>
                    <div className="ad-page-subtitle">{total} total listings on platform</div>
                </div>
            </div>

            <div className="ad-card">
                {/* Filter Bar */}
                <div className="ad-card__header">
                    <div className="ad-filter-bar">
                        <div className="ad-searchbar" style={{ flex: 1, minWidth: 200 }}>
                            <FiSearch size={15} color="var(--ad-text-hint)" />
                            <input
                                placeholder="Search listing title…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button className="ad-btn--ghost" style={{ padding: 2 }} onClick={() => setSearch("")}>
                                    <FiX size={13} />
                                </button>
                            )}
                        </div>
                        <select className="ad-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                            {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                            ))}
                        </select>
                        <select className="ad-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
                            {CHANNELS.map((c) => (
                                <option key={c} value={c}>
                                    {c === "all" ? "All Channels" : c.replace("_", " ").replace(/\b\w/g, (x) => x.toUpperCase())}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <AdminTable columns={COLS} rows={rows} loading={loading}
                    emptyMsg="No listings match your filters." />

                <AdminPagination page={page} pageSize={PAGE_SIZE} total={total}
                    hasMore={hasMore} loading={loading} onPage={(pg) => load(pg)} />
            </div>
        </AdminLayout>
    );
}