import { useState, useRef, useCallback } from "react";
import {
  FiUpload, FiDownload, FiCheckCircle,
  FiAlertTriangle, FiUsers, FiClock, FiEye, FiInfo, FiX,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import { AdminTable, AdminPagination } from "../components/AdminTable";
import AdminBadge from "../components/AdminBadge";
import { useToast, ToastContainer } from "../components/AdminToast";
import { uploadImportFile, confirmImport, fetchImportHistory } from "../services/adminApi";

/* ── Column definitions — now 6 required columns ─── */
const REQUIRED_COLUMNS = [
  {
    key: "name",
    label: "NAME",
    desc: "Full name",
    color: "var(--ad-indigo)",
    bg: "var(--ad-indigo-soft)",
  },
  {
    key: "login_id",
    label: "LOGIN_ID",
    desc: "Unique campus ID",
    color: "var(--ad-blue)",
    bg: "var(--ad-blue-soft)",
  },
  {
    key: "email",
    label: "EMAIL",
    desc: "Campus email address",
    color: "var(--ad-green)",
    bg: "var(--ad-green-soft)",
  },
  {
    key: "department",
    label: "DEPARTMENT",
    desc: "Faculty or department",
    color: "var(--ad-purple)",
    bg: "var(--ad-purple-soft)",
  },
  {
    key: "date_of_birth",
    label: "DATE_OF_BIRTH",
    desc: "Format: YYYY-MM-DD",
    color: "var(--ad-amber)",
    bg: "var(--ad-amber-soft)",
  },
  {
    key: "role",
    label: "ROLE",
    desc: "See valid roles below",
    color: "var(--ad-teal)",
    bg: "var(--ad-teal-soft)",
  },
];

/* ── Valid roles matching the user system ─────────── */
const VALID_ROLES = [
  "student",
  "professor",
  "teaching_assistant",
  "lab_staff",
  "administrative_staff",
  "admin",
];

/*
 * Sample CSV — includes all 6 required columns.
 * DOB format is YYYY-MM-DD. The backend converts this to DDMMYYYY for the default password.
 * Example: 2003-08-15  →  password: 15082003
 */
const SAMPLE_CSV = `name,login_id,email,department,date_of_birth,role
Ama Owusu,CS2021001,ama.owusu@campus.edu,Computer Science,2003-08-15,student
Kwame Mensah,EE2020045,kwame.mensah@campus.edu,Electrical Engineering,1988-03-22,professor
Fatima Ibrahim,MBA2022012,fatima.ibrahim@campus.edu,Business Administration,2001-11-05,teaching_assistant
Kofi Asante,CS2019003,kofi.asante@campus.edu,Computer Science,1995-06-10,lab_staff`;

/* ── History table columns ────────────────────────── */
const HIST_COLS = [
  {
    key: "created_at",
    label: "Date",
    render: (v) => v ? new Date(v).toLocaleString() : "—",
  },
  { key: "file_name",      label: "File Name"    },
  { key: "total_rows",     label: "Total Rows"   },
  { key: "imported_count", label: "Imported"     },
  { key: "failed_count",   label: "Failed"       },
  {
    key: "status",
    label: "Status",
    render: (v) => <AdminBadge value={v} />,
  },
  { key: "admin_name",     label: "Imported By"  },
];

/* ── Component ────────────────────────────────────── */
export default function AdminUserImport() {
  const { toasts, toast, dismiss } = useToast();
  const fileRef = useRef(null);

  const [tab,       setTab]       = useState("upload");
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview,   setPreview]   = useState(null);
  const [fileName,  setFileName]  = useState("");

  const [history,     setHistory]     = useState([]);
  const [histTotal,   setHistTotal]   = useState(0);
  const [histPage,    setHistPage]    = useState(1);
  const [histLoading, setHistLoading] = useState(false);

  /* ── Load import history ── */
  const loadHistory = useCallback(async (pg = 1) => {
    try {
      setHistLoading(true);
      const data = await fetchImportHistory({ page: pg, pageSize: 10 });
      // Cover both "history" and "records" as the array key
      setHistory(data.history ?? data.records ?? []);
      setHistTotal(data.total ?? 0);
      setHistPage(pg);
    } catch {
      toast("Failed to load import history.", "error");
    } finally {
      setHistLoading(false);
    }
  }, [toast]);

  /* ── Handle file pick/drop ── */
  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast("Only Excel (.xlsx, .xls) or CSV files are supported.", "error");
      return;
    }
    setFileName(file.name);
    try {
      setUploading(true);
      const data = await uploadImportFile(file);
      setPreview(data);
    } catch (err) {
      toast(
        err?.response?.data?.data?.message ||
        err?.response?.data?.detail ||
        "Failed to parse file. Verify all 6 required columns are present.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  /* ── Confirm and run import ── */
  const handleConfirmImport = async () => {
    if (!preview?.valid_records?.length) {
      toast("No valid records to import.", "amber");
      return;
    }
    try {
      setConfirming(true);
      const res = await confirmImport(preview.valid_records);
      const count = res.imported ?? res.count ?? preview.valid_count ?? "—";
      toast(`${count} user(s) imported successfully.`, "success");
      setPreview(null);
      setFileName("");
      setTab("history");
      loadHistory(1);
    } catch (err) {
      toast(
        err?.response?.data?.data?.message ||
        err?.response?.data?.detail ||
        "Import failed. Please try again.",
        "error"
      );
    } finally {
      setConfirming(false);
    }
  };

  /* ── Download sample CSV ── */
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "campus_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Preview table columns ── */
  const PREVIEW_COLS = [
    { key: "row_number",    label: "#"              },
    { key: "name",          label: "Name"           },
    { key: "login_id",      label: "Login ID"       },
    { key: "email",         label: "Email"          },
    { key: "department",    label: "Department"     },
    { key: "date_of_birth", label: "Date of Birth"  },
    {
      key: "role",
      label: "Role",
      render: (v) => v
        ? <AdminBadge value={v} label={v.replace(/_/g, " ")} />
        : <span style={{ color: "var(--ad-text-hint)" }}>—</span>,
    },
    {
      key: "is_valid",
      label: "Status",
      render: (v, row) => (
        <div>
          <AdminBadge
            value={v ? "success" : "error"}
            label={v ? "Valid" : "Error"}
          />
          {!v && row.error && (
            <div className="ad-import-error">
              <FiAlertTriangle size={10} /> {row.error}
            </div>
          )}
        </div>
      ),
    },
  ];

  /* ── Render ── */
  return (
    <AdminLayout title="User Import" subtitle="Upload Excel or CSV to add campus users">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Tabs */}
      <div className="ad-tabs">
        {[
          { id: "upload",  label: "Upload & Import" },
          { id: "history", label: "Import History"  },
        ].map((t) => (
          <button
            key={t.id}
            className={`ad-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => {
              setTab(t.id);
              if (t.id === "history") loadHistory(1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ UPLOAD TAB ══════════════════════════════════════════════════ */}
      {tab === "upload" && (
        <>
          {/* Instructions Card */}
          <div className="ad-card ad-mb-20">
            <div className="ad-card__header">
              <div className="ad-card__title">
                <FiUsers size={15} color="var(--ad-indigo)" />
                Required Columns
              </div>
              <button
                className="ad-btn ad-btn--outline ad-btn--sm"
                onClick={downloadSample}
              >
                <FiDownload size={13} /> Download Template
              </button>
            </div>

            <div className="ad-card__body">
              {/* Column chips */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(188px, 1fr))",
                gap: 10, marginBottom: 16,
              }}>
                {REQUIRED_COLUMNS.map((col, i) => (
                  <div key={col.key} style={{
                    background: col.bg, borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 7,
                      background: col.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: col.color }}>
                        {col.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ad-text-sec)", marginTop: 1 }}>
                        {col.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Valid roles reference */}
              <div style={{
                background: "var(--ad-teal-soft)",
                border: "1px solid var(--ad-teal-mid)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 12,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: "var(--ad-teal)", marginBottom: 8,
                  textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  Valid values for ROLE column
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {VALID_ROLES.map((role) => (
                    <code key={role} style={{
                      background: "#ffffff",
                      border: "1px solid var(--ad-teal-mid)",
                      borderRadius: 6, padding: "3px 9px",
                      fontSize: 11, color: "var(--ad-teal)", fontWeight: 600,
                    }}>
                      {role}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Drop Zone — only shown before preview */}
          {!preview && (
            <div className="ad-card ad-mb-20">
              <div className="ad-card__body">
                <div
                  className={`ad-dropzone ${dragOver ? "ad-dropzone--active" : ""}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <div className="ad-dropzone__icon">
                    {uploading
                      ? <div className="ad-skeleton" style={{ width: 30, height: 30, borderRadius: 8 }} />
                      : <FiUpload size={26} />
                    }
                  </div>
                  <div className="ad-dropzone__title">
                    {uploading ? "Parsing file…" : "Drop Excel or CSV file here"}
                  </div>
                  <div className="ad-dropzone__sub">
                    {uploading
                      ? "Validating all 6 required columns…"
                      : "or click to browse · .xlsx · .xls · .csv · Max 5 MB"
                    }
                  </div>
                  {!uploading && (
                    <button
                      className="ad-btn ad-btn--primary ad-btn--sm"
                      style={{ marginTop: 8, pointerEvents: "none" }}
                    >
                      <FiUpload size={13} /> Choose File
                    </button>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            </div>
          )}

          {/* Preview section */}
          {preview && (
            <div className="ad-fade-up">
              {/* Summary counters */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 12, marginBottom: 16,
              }}>
                {[
                  { label: "Total Rows",  value: preview.total_rows,      color: "var(--ad-blue)",   bg: "var(--ad-blue-soft)"  },
                  { label: "Valid",        value: preview.valid_count,     color: "var(--ad-green)",  bg: "var(--ad-green-soft)" },
                  { label: "Invalid",      value: preview.invalid_count,   color: "var(--ad-red)",    bg: "var(--ad-red-soft)"   },
                  { label: "Duplicates",   value: preview.duplicate_count, color: "var(--ad-amber)",  bg: "var(--ad-amber-soft)" },
                ].map((s) => (
                  <div key={s.label} className="ad-card" style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
                    <div style={{ fontSize: 11, color: "var(--ad-text-sec)", marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14, flexWrap: "wrap", gap: 10,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13, color: "var(--ad-text-sec)",
                }}>
                  <FiEye size={14} />
                  Previewing: <strong style={{ color: "var(--ad-text)" }}>{fileName}</strong>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="ad-btn ad-btn--outline ad-btn--sm"
                    onClick={() => { setPreview(null); setFileName(""); }}
                  >
                    <FiX size={12} /> Cancel
                  </button>
                  <button
                    className="ad-btn ad-btn--primary ad-btn--sm"
                    onClick={handleConfirmImport}
                    disabled={confirming || !preview?.valid_count}
                  >
                    <FiCheckCircle size={13} />
                    {confirming
                      ? "Importing…"
                      : `Import ${preview?.valid_count ?? 0} Users`
                    }
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="ad-card">
                <AdminTable
                  columns={PREVIEW_COLS}
                  rows={preview.rows ?? preview.records ?? []}
                  loading={false}
                  emptyMsg="No rows found in file."
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ HISTORY TAB ══════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="ad-card">
          <div className="ad-card__header">
            <div className="ad-card__title">
              <FiClock size={15} color="var(--ad-teal)" />
              Import History
            </div>
          </div>
          <AdminTable
            columns={HIST_COLS}
            rows={history}
            loading={histLoading}
            emptyMsg="No import history yet. Upload your first file to get started."
          />
          <AdminPagination
            page={histPage}
            pageSize={10}
            total={histTotal}
            hasMore={histPage * 10 < histTotal}
            loading={histLoading}
            onPage={(pg) => loadHistory(pg)}
          />
        </div>
      )}
    </AdminLayout>
  );
}
