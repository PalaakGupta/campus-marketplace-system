import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { FiMenu, FiX, FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function AdminLayout({ children, title, subtitle, unreadReports = 0 }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const adminRaw = localStorage.getItem("admin_user");
  const admin = adminRaw ? JSON.parse(adminRaw) : {};
  const initials = admin.name
    ? admin.name.trim().split(" ").map((w) => w[0]).join("").slice(0,2).toUpperCase()
    : "A";

  return (
    <div className="ad-shell">
      {/* Overlay */}
      <div
        className={`ad-sidebar-overlay ${open ? "ad-sidebar-overlay--visible" : ""}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <AdminSidebar
        open={open}
        onClose={() => setOpen(false)}
        unreadReports={unreadReports}
        admin={admin}
        initials={initials}
      />

      {/* Main */}
      <div className="ad-main ad-main--shifted">
        {/* Top Bar */}
        <header className="ad-topbar">
          <div className="ad-topbar__left">
            <button
              className="ad-btn--ghost ad-hamburger"
              onClick={() => setOpen((s) => !s)}
            >
              {open ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
            <div>
              {title && <div className="ad-topbar__title">{title}</div>}
              {subtitle && <div className="ad-topbar__sub">{subtitle}</div>}
            </div>
          </div>
          <div className="ad-topbar__right">
            <button
              className="ad-btn--ghost"
              style={{ position: "relative", padding: 8, borderRadius: 9 }}
              onClick={() => navigate("/admin/reports")}
            >
              <FiBell size={20} />
              {unreadReports > 0 && (
                <span style={{
                  position: "absolute", top: 5, right: 5,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--ad-red)",
                  border: "2px solid white"
                }} />
              )}
            </button>
            <div className="ad-admin-avatar" style={{ width: 36, height: 36, fontSize: 11 }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="ad-page ad-fade-up">{children}</main>
      </div>
    </div>
  );
}