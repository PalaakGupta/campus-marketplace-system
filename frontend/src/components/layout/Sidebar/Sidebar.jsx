import { NavLink } from "react-router-dom";
import {
  FiHome, FiShoppingBag, FiPackage, FiTag,
  FiDollarSign, FiMessageCircle, FiUser, FiShield,
  FiChevronRight,
} from "react-icons/fi";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/dashboard", icon: FiHome, label: "Dashboard" },
  { to: "/marketplace", icon: FiShoppingBag, label: "Marketplace" },
  { to: "/my-listings", icon: FiPackage, label: "My Listings" },
  { to: "/purchases", icon: FiTag, label: "Purchases" },
  { to: "/wallet", icon: FiDollarSign, label: "Wallet" },
  { to: "/messages", icon: FiMessageCircle, label: "Messages", badge: true },
  { to: "/profile", icon: FiUser, label: "Profile" },
];

export default function Sidebar({ user, unreadCount = 0 }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <FiShield size={18} />
        </div>
        <div className="sidebar__logo-text">
          <span className="sidebar__logo-title">Campus</span>
          <span className="sidebar__logo-sub">Secure Marketplace</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `sidebar__nav-item ${isActive ? "sidebar__nav-item--active" : ""}`
            }
          >
            <Icon size={18} />
            <span className="sidebar__nav-label">{label}</span>
            {badge && unreadCount > 0 && (
              <span className="badge-count sidebar__badge">{unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Security promo */}
      <div className="sidebar__promo">
        <FiShield size={18} style={{ marginBottom: 8 }} />
        <p className="sidebar__promo-title">Secure Payments</p>
        <p className="sidebar__promo-desc">
          All transactions are protected by the campus secure vault.
        </p>
      </div>

      {/* User */}
      {user && (
        <div className="sidebar__user">
          <div className="avatar avatar-sm">{user.name?.charAt(0)}</div>
          <div className="sidebar__user-info">
            <p className="sidebar__user-name">{user.name}</p>
            <p className="sidebar__user-balance">
              ₹{Number(user.availableBalance ?? 0).toLocaleString()}
            </p>
          </div>
          <FiChevronRight size={14} className="sidebar__user-arrow" />
        </div>
      )}
    </aside>
  );
}