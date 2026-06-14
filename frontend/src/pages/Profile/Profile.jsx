import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPackage, FiShoppingBag, FiTrendingUp, FiCreditCard,
  FiSettings, FiShield, FiLogOut, FiChevronRight,
  FiUser,
} from 'react-icons/fi';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import { getFullProfile } from "../../services/userService";
import { logout } from "../../services/authService";

import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getFullProfile();
        setProfile(data);
      } catch (err) {
        setProfile({
          name:              localStorage.getItem("name") || "—",
          login_id:          localStorage.getItem("login_id") || "—",
          role:              "Campus Community",
          available_balance: null,
          held_balance:      null,
          stats:             { listing_count: 0, sold_count: 0, purchase_count: 0 },
        });
        setError(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    logout();
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  };

  const MENU_GROUPS = [
    {
      items: [
        { icon: FiPackage, label: 'My Listings', to: '/my-listings' },
        { icon: FiShoppingBag, label: 'My Purchases', to: '/purchases' },
        { icon: FiTrendingUp, label: 'My Sales', to: '/my-listings?tab=Sold' },
        { icon: FiCreditCard, label: 'Wallet & Transactions', to: '/wallet' },
      ],
    },
    {
      items: [
        { icon: FiLogOut, label: 'Sign Out', action: handleLogout, danger: true },
      ],
    },
  ];

  return (
    <div className="profile page anim-fade-in">
      {/* ── Hero Banner ── */}
      <div className="profile__hero">
        {loading ? (
          <div className="profile__hero-skeleton">
            <div className="skeleton profile__skel-avatar" />
            <div className="skeleton profile__skel-name" />
            <div className="skeleton profile__skel-role" />
          </div>
        ) : (
          <>
            <div className="profile__avatar avatar avatar-xl">
              {profile?.avatar_initials || getInitials(profile?.name) || <FiUser size={28} />}
            </div>
            <h1 className="profile__name">{profile?.name ?? '—'}</h1>
            <p className="profile__role">{profile?.role ?? 'Campus Community'}</p>
            {profile?.login_id && (
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                ID: {profile.login_id}
              </p>
            )}
            <div className="profile__stats">
              {[
                { label: 'Listings', value: profile?.stats?.listing_count ?? '—' },
                { label: 'Sold',     value: profile?.stats?.sold_count    ?? '—' },
                { label: "Purchases", value: profile?.stats?.purchase_count  ?? "—" },
              ].map((s) => (
                <div key={s.label} className="profile__stat">
                  <p className="profile__stat-value">
                    {s.icon && <span className="profile__stat-icon">{s.icon}</span>}
                    {s.value}
                  </p>
                  <p className="profile__stat-label">{s.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Balance Bar ── */}
      {profile?.available_balance !== null && profile?.available_balance !== undefined && (
        <div className="profile__balance-bar" onClick={() => navigate('/wallet')}>
          <div className="profile__balance-item">
            <span className="profile__balance-label">Available</span>
            <span className="profile__balance-value">
             ₹{Number(profile.available_balance ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="profile__balance-divider" />
          <div className="profile__balance-item">
            <span className="profile__balance-label">In Vault</span>
            <span className="profile__balance-value profile__balance-value--held">
              ₹{Number(profile.heldBalance ?? 0).toLocaleString()}
            </span>
          </div>
          <FiChevronRight size={16} className="profile__balance-arrow" />
        </div>
      )}

      {/* ── Menu Groups ── */}
      <div className="profile__body">
        {MENU_GROUPS.map((group, gi) => (
          <div key={gi} className="profile__menu-group card">
            {group.items.map((item, ii) => (
              <button
                key={item.label}
                className={`profile__menu-item ${item.danger ? 'profile__menu-item--danger' : ''}`}
                style={{ borderTop: ii > 0 ? `1px solid var(--color-border)` : 'none' }}
                onClick={item.action ?? (() => navigate(item.to))}
                type="button"
              >
                <div className={`profile__menu-icon ${item.danger ? 'profile__menu-icon--danger' : ''}`}>
                  <item.icon size={17} />
                </div>
                <span className="profile__menu-label">{item.label}</span>
                {!item.danger && <FiChevronRight size={15} className="profile__menu-arrow" />}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}