import { NavLink, useNavigate } from "react-router-dom";
import {
  FiShield, FiHome, FiUsers, FiPackage,
  FiDollarSign, FiFlag, FiLogOut, FiActivity,
} from "react-icons/fi";

const NAV = [
  {
    section: "Operations",
    items: [
      { to: "/admin/dashboard",    icon: FiHome,       label: "Dashboard",     iconColor: "#818cf8" },
      { to: "/admin/users",        icon: FiUsers,      label: "User Import",   iconColor: "#34d399" },
      { to: "/admin/listings",     icon: FiPackage,    label: "Listings",      iconColor: "#60a5fa" },
      { to: "/admin/transactions", icon: FiDollarSign, label: "Transactions",  iconColor: "#fbbf24" },
    ],
  },
  {
    section: "Support",
    items: [
      { to: "/admin/reports", icon: FiFlag, label: "Reports & Support", iconColor: "#f87171", badge: true },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/admin/activity", icon: FiActivity, label: "Activity Logs", iconColor: "#a78bfa" },
    ],
  },
];

export default function AdminSidebar({ open, onClose, unreadReports, admin, initials }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/admin/login");
  };

  return (
    <aside className={`ad-sidebar ${open ? "" : "ad-sidebar--hidden"}`}>
      {/* Brand */}
      <div className="ad-sidebar__brand">
        <div className="ad-sidebar__brand-icon">
          <FiShield size={20} />
        </div>
        <div className="ad-sidebar__brand-text">
          <span className="ad-sidebar__brand-title">Campus Admin</span>
          <span className="ad-sidebar__brand-sub">Control Panel</span>
        </div>
      </div>

      {/* Nav Sections */}
      {NAV.map((section) => (
        <div key={section.section} className="ad-sidebar__section">
          <div className="ad-sidebar__section-label">{section.section}</div>
          {section.items.map(({ to, icon: Icon, label, iconColor, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `ad-nav-item ${isActive ? "active" : ""}`
              }
            >
              <div className="ad-nav-item__icon">
                <Icon size={17} color={iconColor} />
              </div>
              <span style={{ flex: 1 }}>{label}</span>
              {badge && unreadReports > 0 && (
                <span className="ad-nav-badge">{unreadReports}</span>
              )}
            </NavLink>
          ))}
        </div>
      ))}

      {/* Footer / Admin */}
      <div className="ad-sidebar__footer">
        <div className="ad-sidebar__admin-card" onClick={handleLogout}>
          <div className="ad-admin-avatar">{initials}</div>
          <div className="ad-admin-info">
            <div className="ad-admin-name">{admin?.name || "Admin"}</div>
            <div className="ad-admin-role">Click to sign out</div>
          </div>
          <FiLogOut size={15} color="rgba(255,255,255,0.4)" />
        </div>
      </div>
    </aside>
  );
}