import { useState, useRef, useCallback } from "react";
import {
  FiUpload, FiDownload, FiCheckCircle, FiXCircle,
  FiAlertTriangle, FiUsers, FiClock, FiEye,
} from "react-icons/fi";
import AdminLayout from "../components/AdminLayout";
import { AdminTable, AdminPagination } from "../components/AdminTable";
import AdminBadge from "../components/AdminBadge";
import { useToast, ToastContainer } from "../components/AdminToast";
import { uploadImportFile, confirmImport, fetchImportHistory } from "../services/adminApi";

const REQUIRED_COLUMNS = ["name", "login_id", "email", "department"];

const SAMPLE_CSV = `name,login_id,email,department
Ama Owusu,CS2021001,ama.owusu@campus.edu,Computer Science
Kwame Mensah,EE2020045,kwame.mensah@campus.edu,Electrical Engineering
Fatima Ibrahim,MBA2022012,fatima.ibrahim@campus.edu,Business Administration`;

export default function AdminUserImport() {
  const { toasts, toast, dismiss } = useToast();
  const fileRef = useRef(null);

  const [tab, setTab]             = useState("upload");
  const [dragOver, setDragOver]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview]     = useState(null);
  const [fileName, setFileName]   = useState("");

  const [history, setHistory]   = useState([]);
  const [histTotal, setHistTotal] = useState(0);
  const [histPage, setHistPage] = useState(1);
  const [histLoading, setHistLoading] = useState(false);

  const loadHistory = useCallback(async (pg = 1) => {
    try {
      setHistLoading(true);
      const data = await fetchImportHistory({ page: pg, pageSize: 10 });
      setHistory(data.history || []);
      setHistTotal(data.total || 0);
      setHistPage(pg);
    } catch {
      toast("Failed to load import history.", "error");
    } finally { setHistLoading(false); }
  }, [toast]);

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
      toast(err?.response?.data?.data?.message || "Failed to parse file.", "error");
    } finally { setUploading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = async () => {
    if (!preview?.valid_records?.length) {
      toast("No valid records to import.", "amber");
      return;
    }
    try {
      setConfirming(true);
      const res = await confirmImport(preview.valid_records);
      toast(`${res.imported} user(s) imported successfully.`, "success");
      setPreview(null);
      setFileName("");
      setTab("history");
      loadHistory(1);
    } catch (err) {
      toast(err?.response?.data?.data?.message || "Import failed.", "error");
    } finally { setConfirming(false); }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "campus_import_template.csv";
    a.click();
  };

  // Preview columns
  const PREVIEW_COLS = [
    { key: "row_number", label: "#" },
    { key: "name",       label: "Name" },
    { key: "login_id",   label: "Login ID" },
    { key: "email",      label: "Email" },
    { key: "department", label: "Department" },
    { key: "is_valid",   label: "Status",
      render: (v, row) => (
        <div>
          <AdminBadge value={v ? "valid" : "error"} label={v ? "Valid" : "Error"} />
          {!v && row.error && (
            <div className="ad-import-error">
              <FiAlertTriangle size={10} /> {row.error}
            </div>
          )}
        </div>
      )
    },
  ];

  // History columns
  const HIST_COLS = [
    { key: "created_at",     label: "Date",
      render: (v) => v ? new Date(v).toLocaleString() : "—" },
    { key: "file_name",      label: "File Name" },
    { key: "total_rows",     label: "Total Rows" },
    { key: "imported_count", label: "Imported" },
    { key: "failed_count",   label: "Failed" },
    { key: "status",         label: "Status",
      render: (v) => <AdminBadge value={v} /> },
    { key: "admin_name",     label: "Imported By" },
  ];

  return (
    <AdminLayout title="User Import" subtitle="Upload Excel to add campus users">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Tabs */}
      <div className="ad-tabs">
        {[
          { id: "upload", label: "Upload & Import" },
          { id: "history", label: "Import History" },
        ].map((t) => (
          <button key={t.id} className={`ad-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => { setTab(t.id); if (t.id === "history") loadHistory(1); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── UPLOAD TAB ── */}
      {tab === "upload" && (
        <>
          {/* Instructions Card */}
          <div className="ad-card ad-mb-20">
            <div className="ad-card__header">
              <div className="ad-card__title">
                <FiUsers size={15} color="var(--ad-indigo)" />
                Import Instructions
              </div>
              <button className="ad-btn ad-btn--outline ad-btn--sm" onClick={downloadSample}>
                <FiDownload size={13} /> Download Template
              </button>
            </div>
            <div className="ad-card__body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                {REQUIRED_COLUMNS.map((col, i) => {
                  const colors = ["var(--ad-indigo)", "var(--ad-green)", "var(--ad-blue)", "var(--ad-purple)"];
                  const bgs    = ["var(--ad-indigo-soft)", "var(--ad-green-soft)", "var(--ad-blue-soft)", "var(--ad-purple-soft)"];
                  return (
                    <div key={col} style={{
                      background: bgs[i], borderRadius: 10, padding: "12px 14px",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: colors[i], display: "flex", alignItems: "center",
                        justifyContent: "center", color: "#fff",
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: colors[i] }}>
                          {col.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ad-text-sec)" }}>Required</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--ad-amber-soft)",
                borderRadius: 10, fontSize: 12, color: "var(--ad-amber)", display: "flex", gap: 8 }}>
                <FiAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                Default password is set to the imported user's date of birth (DDMMYYYY format). Users must change it on first login.
              </div>
            </div>
          </div>

          {/* Drop Zone */}
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
                      ? "Please wait while we validate your data"
                      : "or click to browse · .xlsx, .xls, .csv supported · Max 5MB"
                    }
                  </div>
                  {!uploading && (
                    <button className="ad-btn ad-btn--primary ad-btn--sm"
                      style={{ marginTop: 8, pointerEvents: "none" }}>
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

          {/* Preview */}
          {preview && (
            <div className="ad-fade-up">
              {/* Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Total Rows",   value: preview.total_rows,   bg: "var(--ad-blue-soft)",    color: "var(--ad-blue)"   },
                  { label: "Valid",         value: preview.valid_count,  bg: "var(--ad-green-soft)",   color: "var(--ad-green)"  },
                  { label: "Invalid",       value: preview.invalid_count,bg: "var(--ad-red-soft)",     color: "var(--ad-red)"    },
                  { label: "Duplicates",    value: preview.duplicate_count, bg: "var(--ad-amber-soft)", color: "var(--ad-amber)" },
                ].map((s) => (
                  <div key={s.label} className="ad-card" style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
                    <div style={{ fontSize: 11, color: "var(--ad-text-sec)", marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* File Name */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ad-text-sec)" }}>
                  <FiEye size={14} />
                  Previewing: <strong style={{ color: "var(--ad-text)" }}>{fileName}</strong>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ad-btn ad-btn--outline ad-btn--sm"
                    onClick={() => { setPreview(null); setFileName(""); }}>
                    Cancel
                  </button>
                  <button
                    className="ad-btn ad-btn--primary ad-btn--sm"
                    onClick={handleConfirmImport}
                    disabled={confirming || !preview?.valid_count}
                  >
                    <FiCheckCircle size={13} />
                    {confirming ? "Importing…" : `Import ${preview?.valid_count} Users`}
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="ad-card">
                <AdminTable
                  columns={PREVIEW_COLS}
                  rows={preview.rows || []}
                  loading={false}
                  emptyMsg="No rows in file."
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
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
            emptyMsg="No import history yet."
          />
          <AdminPagination
            page={histPage} pageSize={10} total={histTotal}
            hasMore={histPage * 10 < histTotal} loading={histLoading}
            onPage={(pg) => loadHistory(pg)}
          />
        </div>
      )}
    </AdminLayout>
  );
}