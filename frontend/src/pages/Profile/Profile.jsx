import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPackage, FiShoppingBag, FiTrendingUp, FiCreditCard,
  FiSettings, FiShield, FiLogOut, FiChevronRight,
  FiUser, FiStar,
} from 'react-icons/fi';
import PageHeader from '../../components/layout/PageHeader/PageHeader';

import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
      } catch (err) {
        console.error('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
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
        { icon: FiSettings, label: 'Account Settings', to: '/settings' },
        { icon: FiShield, label: 'Privacy & Security', to: '/security' },
      ],
    },
    {
      danger: true,
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
              {user?.name?.charAt(0) ?? <FiUser size={28} />}
            </div>
            <h1 className="profile__name">{user?.name ?? '—'}</h1>
            <p className="profile__role">{user?.role ?? 'Campus Community'}</p>
            <div className="profile__stats">
              {[
                { label: 'Listings', value: stats?.listings ?? '—' },
                { label: 'Sold', value: stats?.sold ?? '—' },
                { label: 'Rating', value: stats?.rating ? `${stats.rating}` : '—', icon: <FiStar size={12} /> },
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
      {user && (
        <div className="profile__balance-bar" onClick={() => navigate('/wallet')}>
          <div className="profile__balance-item">
            <span className="profile__balance-label">Available</span>
            <span className="profile__balance-value">
              ₹{Number(user.availableBalance ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="profile__balance-divider" />
          <div className="profile__balance-item">
            <span className="profile__balance-label">In Vault</span>
            <span className="profile__balance-value profile__balance-value--held">
              ₹{Number(user.heldBalance ?? 0).toLocaleString()}
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