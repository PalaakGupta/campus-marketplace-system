import { Routes, Route, Navigate } from "react-router-dom";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLogin          from "./pages/AdminLogin";
import AdminDashboard      from "./pages/AdminDashboard";
import AdminUserImport     from "./pages/AdminUserImport";
import AdminListings       from "./pages/AdminListings";
import AdminTransactions   from "./pages/AdminTransactions";
import AdminReports        from "./pages/AdminReports";
import "./admin.css";

export default function AdminApp() {
  return (
    <Routes>
      {/* Public */}
      <Route path="login" element={<AdminLogin />} />

      {/* Protected */}
      <Route path="dashboard" element={
        <AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>
      } />
      <Route path="users" element={
        <AdminProtectedRoute><AdminUserImport /></AdminProtectedRoute>
      } />
      <Route path="listings" element={
        <AdminProtectedRoute><AdminListings /></AdminProtectedRoute>
      } />
      <Route path="transactions" element={
        <AdminProtectedRoute><AdminTransactions /></AdminProtectedRoute>
      } />
      <Route path="reports" element={
        <AdminProtectedRoute><AdminReports /></AdminProtectedRoute>
      } />

      {/* Default */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}