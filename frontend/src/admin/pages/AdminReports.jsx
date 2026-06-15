import { useState, useEffect, useCallback } from "react";
import {
  FiFlag, FiMessageSquare, FiCheckCircle,
  FiX, FiAlertTriangle, FiHelpCircle,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import { AdminTable, AdminPagination } from "../components/AdminTable";
import AdminBadge from "../components/AdminBadge";
import { useToast, ToastContainer } from "../components/AdminToast";
import {
  fetchReports, resolveReport,
  fetchSupportRequests, respondSupport,
} from "../services/adminApi";

const TABS = [
  { id: "reports",  label: "Reports",         icon: FiFlag,         color: "#f87171" },
  { id: "support",  label: "Support Requests", icon: FiMessageSquare,color: "#60a5fa" },
];
const PAGE_SIZE = 20;

export default function AdminReports() {
  const { toasts, toast, dismiss } = useToast();

  const [tab,        setTab]       = useState("reports");
  const [rows,       setRows]      = useState([]);
  const [total,      setTotal]     = useState(0);
  const [page,       setPage]      = useState(1);
  const [hasMore,    setHasMore]   = useState(false);
  const [loading,    setLoading]   = useState(true);
  const [statusF,    setStatusF]   = useState("pending");
  const [modal,      setModal]     = useState(null);
  const [note,       setNote]      = useState("");
  const [acting,     setActing]    = useState(false);

  const load = useCallback(async (pg = 1, sf = statusF) => {
    try {
      setLoading(true);
      const params = { page: pg, pageSize: PAGE_SIZE };
      if (sf !== "all") params.status = sf;
      const data = tab === "reports"
        ? await fetchReports(params)
        : await fetchSupportRequests(params);
      const key = tab === "reports" ? "reports" : "requests";
      setRows(data?.[key] || []);
      setTotal(data?.total || 0);
      setHasMore(data?.has_more ?? false);
      setPage(pg);
    } catch { toast("Failed to load records.", "error"); }
    finally { setLoading(false); }
  }, [tab, statusF, toast]);

  useEffect(() => {
    setStatusF("pending");
    load(1, "pending");
  }, [tab]);

  useEffect(() => { load(1, statusF); }, [statusF]);

  const openModal = (row) => {
    setModal(row);
    setNote("");
  };

  const handleResolve = async (action) => {
    if (!modal) return;
    try {
      setActing(true);
      if (tab === "reports") {
        await resolveReport(modal.id, action, note);
      } else {
        await respondSupport(modal.id, note);
      }
      setRows((r) => r.map((x) =>
        x.id === modal.id
          ? { ...x, status: action === "respond" ? "closed" : action }
          : x
      ));
      toast(`${tab === "reports" ? "Report" : "Support request"} ${action === "respond" ? "responded to" : action}.`, "success");
      setModal(null);
    } catch (err) {
      toast(err?.response?.data?.data?.message || "Action failed.", "error");
    } finally { setActing(false); }
  };

  // Report columns — no personal details
  const REPORT_COLS = [
    { key: "id",       label: "Report ID",
      render: (v) => <code style={{ fontSize: 11, color: "var(--ad-text-sec)" }}>{v?.slice(0,8)}…</code> },
    { key: "category", label: "Category",  render: (v) => <AdminBadge value={v} /> },
    { key: "target_type", label: "About",
      render: (v) => (
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
          {v === "listing" ? <FiFlag size={12} color="var(--ad-amber)" /> : <FiHelpCircle size={12} color="var(--ad-sky)" />}
          {v}
        </span>
      )
    },
    { key: "description", label: "Description",
      render: (v) => (
        <span style={{ fontSize: 12, color: "var(--ad-text-sec)" }} title={v}>
          {v?.length > 55 ? v.slice(0,55) + "…" : v}
        </span>
      )
    },
    { key: "status",    label: "Status",   render: (v) => <AdminBadge value={v} /> },
    { key: "created_at",label: "Submitted",
      render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
    { key: "id", label: "Action",
      render: (id, row) => row.status === "pending" ? (
        <button className="ad-btn ad-btn--outline ad-btn--sm" onClick={() => openModal(row)}>
          <FiCheckCircle size={12} /> Review
        </button>
      ) : (
        <span style={{ fontSize: 11, color: "var(--ad-text-hint)" }}>{row.status}</span>
      )
    },
  ];

  // Support columns — no personal details
  const SUPPORT_COLS = [
    { key: "id",        label: "Ticket ID",
      render: (v) => <code style={{ fontSize: 11, color: "var(--ad-text-sec)" }}>{v?.slice(0,8)}…</code> },
    { key: "category",  label: "Type",     render: (v) => <AdminBadge value={v} /> },
    { key: "subject",   label: "Subject",
      render: (v) => <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span> },
    { key: "message",   label: "Message",
      render: (v) => (
        <span style={{ fontSize: 12, color: "var(--ad-text-sec)" }} title={v}>
          {v?.length > 55 ? v.slice(0,55) + "…" : v}
        </span>
      )
    },
    { key: "status",    label: "Status",   render: (v) => <AdminBadge value={v} /> },
    { key: "created_at",label: "Date",
      render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
    { key: "id",        label: "Action",
      render: (id, row) => row.status === "open" ? (
        <button className="ad-btn ad-btn--primary ad-btn--sm" onClick={() => openModal(row)}>
          <FiMessageSquare size={12} /> Respond
        </button>
      ) : (
        <span style={{ fontSize: 11, color: "var(--ad-text-hint)" }}>{row.status}</span>
      )
    },
  ];

  const FILTER_OPTS_REPORTS = ["all","pending","resolved","dismissed"];
  const FILTER_OPTS_SUPPORT = ["all","open","closed"];

  const filterOpts = tab === "reports" ? FILTER_OPTS_REPORTS : FILTER_OPTS_SUPPORT;
  const unreadCount = rows.filter((r) => r.status === "pending" || r.status === "open").length;

  return (
    <AdminLayout title="Reports & Support" unreadReports={unreadCount}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Review Modal */}
      {modal && (
        <div className="ad-modal-overlay" onClick={() => setModal(null)}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal__header">
              <span className="ad-modal__title">
                {tab === "reports" ? "Review Report" : "Respond to Support"}
              </span>
              <button className="ad-btn--ghost" onClick={() => setModal(null)}>
                <FiX size={18} />
              </button>
            </div>
            <div className="ad-modal__body">
              {/* Detail */}
              <div style={{ background: "var(--ad-bg)", borderRadius: 12,
                padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <AdminBadge value={modal.category} />
                  <AdminBadge value={modal.status} />
                </div>
                {tab === "reports" ? (
                  <>
                    <div className="ad-detail-item__label">Report Description</div>
                    <div style={{ fontSize: 14, color: "var(--ad-text)", marginTop: 3 }}>
                      {modal.description}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{modal.subject}</div>
                    <div style={{ fontSize: 13, color: "var(--ad-text-sec)" }}>{modal.message}</div>
                  </>
                )}
              </div>

              {/* Response field */}
              <div className="ad-form-group">
                <label className="ad-label">
                  {tab === "reports" ? "Resolution Note" : "Your Response"} (optional)
                </label>
                <textarea
                  className="ad-input ad-textarea"
                  placeholder={tab === "reports"
                    ? "Note the reason for your decision…"
                    : "Write your response to the user…"
                  }
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <div className="ad-modal__footer">
              <button className="ad-btn ad-btn--ghost" onClick={() => setModal(null)}>
                Cancel
              </button>
              {tab === "reports" ? (
                <>
                  <button className="ad-btn ad-btn--outline" onClick={() => handleResolve("dismissed")}
                    disabled={acting}>
                    {acting ? "…" : "Dismiss"}
                  </button>
                  <button className="ad-btn ad-btn--primary" onClick={() => handleResolve("resolved")}
                    disabled={acting}>
                    <FiCheckCircle size={13} />
                    {acting ? "Processing…" : "Mark Resolved"}
                  </button>
                </>
              ) : (
                <button className="ad-btn ad-btn--primary" onClick={() => handleResolve("respond")}
                  disabled={acting}>
                  <FiMessageSquare size={13} />
                  {acting ? "Sending…" : "Send Response & Close"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
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

      <div className="ad-card">
        <div className="ad-card__header">
          <div className="ad-filter-bar">
            <select className="ad-select" value={statusF}
              onChange={(e) => setStatusF(e.target.value)}>
              {filterOpts.map((o) => (
                <option key={o} value={o}>
                  {o === "all" ? "All Statuses" : o.charAt(0).toUpperCase() + o.slice(1)}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "var(--ad-text-sec)" }}>
              {total} record{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <AdminTable
          columns={tab === "reports" ? REPORT_COLS : SUPPORT_COLS}
          rows={rows} loading={loading}
          emptyMsg={tab === "reports"
            ? "No reports found. Great news!"
            : "No support requests found."
          }
        />

        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total}
          hasMore={hasMore} loading={loading} onPage={(pg) => load(pg)} />
      </div>
    </AdminLayout>
  );
}