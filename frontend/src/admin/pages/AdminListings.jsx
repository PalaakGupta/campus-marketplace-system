import { useState, useEffect, useCallback, useRef } from "react";
import {
    FiPackage, FiSearch, FiTrash2, FiRefreshCw,
    FiAlertTriangle, FiEye, FiX,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import { AdminTable, AdminPagination } from "../components/AdminTable";
import AdminBadge from "../components/AdminBadge";
import { useToast, ToastContainer } from "../components/AdminToast";
import { fetchListings, removeListing, restoreListing, flagListing, fetchItemDetail } from "../services/adminApi";

const STATUSES = ["all", "available", "reserved", "sold", "removed", "flagged"];
const CHANNELS = ["all", "marketplace", "thrift_store"];
const PAGE_SIZE = 20;

function DetailField({ label, value }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: "var(--ad-text-hint)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
                {label}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ad-text)" }}>{value}</div>
        </div>
    );
}

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
    const [modal, setModal] = useState(null);   
    const [acting, setActing] = useState(false);
    const [detail, setDetail] = useState(null);      
    const [detailLoading, setDetailLoading] = useState(false);

    const debRef = useRef(null);

    const openDetail = async (row) => {
        setDetail({ id: row.id, title: row.title, _loading: true });
        setDetailLoading(true);
        try {
            const data = await fetchItemDetail(row.id);
            setDetail(data);
        } catch {
            toast("Failed to load item details.", "error");
            setDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

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
            if (type === "remove") {
                await removeListing(item.id);
                setRows((r) => r.filter((x) => x.id !== item.id));
                setTotal((t) => Math.max(0, t - 1));
                toast("Listing removed permanently.", "success");
                setModal(null);
                return;
            }
            if (type === "restore") {
                await restoreListing(item.id);
                setRows((r) => r.map((x) => x.id === item.id ? { ...x, status: "available" } : x));
                toast("Listing restored successfully.", "success");
                setModal(null);
                return;
            }
            if (type === "flag") {
                await flagListing(item.id);
                toast("Flag request sent, but flagging isn't implemented on the backend yet — this listing's status was not changed.", "error");
                setModal(null);
                return;
            }
        } catch (err) {
            const status = err?.response?.status;
            const msg = status === 404
                ? "This listing no longer exists — it may have already been permanently removed."
                : (err?.response?.data?.data?.message || "Action failed.");
            toast(msg, "error");
        } finally { setActing(false); }
    };

    const COLS = [
        {
            key: "title", label: "Item",
            render: (v) => (
                <span
                    className="ad-truncate"
                    title={v}
                    style={{ fontWeight: 600, color: "var(--ad-text)", maxWidth: 180, display: "inline-block" }}
                >
                    {v}
                </span>
            )
        },
        {
            key: "seller_name", label: "Seller",
            render: (v, row) => (
                <span style={{ fontSize: 13, color: "var(--ad-text-sec)" }}>
                    {v || row.seller_id || "—"}
                </span>
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
                    <button className="ad-btn ad-btn--outline ad-btn--sm"
                        onClick={() => openDetail(row)}>
                        <FiEye size={12} /> View
                    </button>
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
        remove: { title: "Remove Listing", desc: "This permanently deletes the listing. This cannot be undone.", btnLabel: "Delete Permanently", btnCls: "ad-btn--danger" },
        flag: { title: "Flag as Suspicious", desc: "Note: flagging isn't fully implemented on the backend yet — this won't currently change the listing's status.", btnLabel: "Send Flag", btnCls: "ad-btn--outline" },
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
                                    Seller: {modal.item.seller_name || modal.item.seller_id} · ₹{Number(modal.item.price ?? 0).toLocaleString()}
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

            {/* Item Detail Modal */}
            {detail && (
                <div className="ad-modal-overlay" onClick={() => setDetail(null)}>
                    <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="ad-modal__header">
                            <span className="ad-modal__title">{detail.title}</span>
                            <button className="ad-btn--ghost" onClick={() => setDetail(null)}>
                                <FiX size={18} />
                            </button>
                        </div>
                        <div className="ad-modal__body">
                            {detailLoading ? (
                                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ad-text-sec)" }}>
                                    Loading…
                                </div>
                            ) : (
                                <>
                                    {detail.description && (
                                        <p style={{ fontSize: 13, color: "var(--ad-text-sec)", marginBottom: 14 }}>
                                            {detail.description}
                                        </p>
                                    )}
                                    <div style={{
                                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                                        background: "var(--ad-bg)", borderRadius: 12, padding: "14px 16px",
                                    }}>
                                        <DetailField label="Price" value={`₹${Number(detail.price ?? 0).toLocaleString()}`} />
                                        <DetailField label="Status" value={<AdminBadge value={detail.status} />} />
                                        <DetailField label="Channel" value={<AdminBadge value={detail.listing_channel} />} />
                                        <DetailField label="Category" value={detail.category || "—"} />
                                        <DetailField label="Condition" value={detail.condition_grade || "—"} />
                                        <DetailField label="Views" value={detail.view_count ?? 0} />
                                        <DetailField label="Seller" value={detail.seller_name || "Unknown"} />
                                        <DetailField label="Seller Email" value={detail.seller_email || "—"} />
                                        <DetailField label="Listed" value={detail.created_at ? new Date(detail.created_at).toLocaleDateString() : "—"} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="ad-modal__footer">
                            <button className="ad-btn ad-btn--ghost" onClick={() => setDetail(null)}>Close</button>
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


