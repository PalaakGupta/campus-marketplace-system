import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const adminAPI = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach admin token
adminAPI.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("admin_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Auto logout on 401
adminAPI.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

// Unwrap success envelope  { success: true, data: {...} }
const u = (r) => r.data?.data ?? r.data;

// ── Auth ──────────────────────────────────────────
export const adminLogin = (adminId, password) =>
  adminAPI.post("/admin/login", { admin_id: adminId, password }).then(u);

// ── Dashboard ─────────────────────────────────────
export const fetchDashboard = () =>
  adminAPI.get("/admin/dashboard").then(u);

// ── Users ─────────────────────────────────────────
export const fetchUsers = (params = {}) =>
  adminAPI.get("/admin/users", { params }).then(u);

export const fetchUserDetail = (id) =>
  adminAPI.get(`/admin/users/${id}`).then(u);

export const toggleUserStatus = (id, isActive) =>
  adminAPI.patch(`/admin/users/${id}/status`, { is_active: isActive }).then(u);

// ── User Import ───────────────────────────────────
export const uploadImportFile = (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return adminAPI.post("/admin/users/import/preview", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(u);
};

export const confirmImport = (records) =>
  adminAPI.post("/admin/users/import/confirm", { records }).then(u);

export const fetchImportHistory = (params = {}) =>
  adminAPI.get("/admin/users/import/history", { params }).then(u);

// ── Listings ──────────────────────────────────────
export const fetchListings = (params = {}) =>
  adminAPI.get("/admin/items", { params }).then(u);

export const removeListing = (id) =>
  adminAPI.delete(`/admin/items/${id}`).then(u);

export const restoreListing = (id) =>
  adminAPI.patch(`/admin/items/${id}/restore`).then(u);

export const flagListing = (id) =>
  adminAPI.patch(`/admin/items/${id}/flag`).then(u);

// ── Transactions ──────────────────────────────────
export const fetchPurchases = (params = {}) =>
  adminAPI.get("/admin/purchases", { params }).then(u);

export const fetchHoldings = (params = {}) =>
  adminAPI.get("/admin/holding-transactions", { params }).then(u);

export const fetchWalletTx = (params = {}) =>
  adminAPI.get("/admin/wallet-transactions", { params }).then(u);

// ── Reports ───────────────────────────────────────
export const fetchReports = (params = {}) =>
  adminAPI.get("/admin/reports", { params }).then(u);

export const resolveReport = (id, action, note) =>
  adminAPI.patch(`/admin/reports/${id}/resolve`, {
    action, resolution_note: note,
  }).then(u);

// ── Support Requests ──────────────────────────────
export const fetchSupportRequests = (params = {}) =>
  adminAPI.get("/admin/support-requests", { params }).then(u);

export const respondSupport = (id, response) =>
  adminAPI.patch(`/admin/support-requests/${id}/respond`, {
    response,
  }).then(u);

export default adminAPI;