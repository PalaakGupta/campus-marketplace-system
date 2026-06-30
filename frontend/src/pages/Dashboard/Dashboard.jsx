import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BalanceCard from '../../components/ui/BalanceCard/BalanceCard';
import ItemCard from '../../components/ui/ItemCard/ItemCard';
import SecurityCard from '../../components/ui/SecurityCard/SecurityCard';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import { FiBell, FiPackage, FiHeart, FiMessageCircle, FiShield, FiChevronRight, FiClock, FiAlertCircle, FiPlus, FiCheckCircle, FiTrendingUp, FiShoppingBag } from 'react-icons/fi';

import API from '../../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [savedItems, setSavedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await API.get("/dashboard");
      setDashboardData(response.data.data);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message || "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSaveItem = (itemId) => {
    setSavedItems((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  if (error) {
    return (
      <div className="dashboard page">
        <div className="dashboard__body">
          <EmptyState
            icon={FiShield}
            title="Could not load dashboard"
            description={error}
            action={fetchDashboard}
            actionLabel="Try Again"
          />
        </div>
      </div>
    );
  }

  const { user, wallet, stats, activePurchase: rawActivePurchase, recent_listings } = dashboardData || {};
  const activePurchase = rawActivePurchase
    ? {
        ...rawActivePurchase,
        imageUrl: rawActivePurchase.image_url,
        sellerName: rawActivePurchase.seller_name,
        sellerRole: rawActivePurchase.seller_role,
        paymentStatus: rawActivePurchase.payment_status,
        id: rawActivePurchase.purchase_id,
      }
    : null;

  return (
    <div className="dashboard page anim-fade-in">
      {/* ── Header Banner ── */}
      <div className="dashboard__banner">
        <div className="dashboard__banner-inner">
          <div className="dashboard__greeting">
            <div className="dashboard__avatar avatar avatar-md">
              {user?.avatar_initials || "?"}
            </div>
            <div>
              <p className="dashboard__greeting-label">Hello,</p>
              <p className="dashboard__greeting-name">{user?.name ?? "—"}</p>
              {user?.role && (
                <p className="dashboard__greeting-role">{user.role}</p>
              )}
              {user?.login_id && (
                <p className="dashboard__greeting-id">ID: {user.login_id}</p>
              )}
            </div>
          </div>
          <div className="dashboard__header-actions">
            <button
              className="dashboard__notif-btn btn-icon"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <FiBell size={22} />
              {stats?.unread_messages > 0 && (
                <span className="notif-dot" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard__body">
        {/* ── Quick Stats ── */}
        <div className="dashboard__stats">
          {[
            { icon: FiPackage, label: 'My Listings', value: stats?.active_listings ?? 0, to: '/my-listings', color: 'var(--color-blue)' },
            { icon: FiHeart, label: 'Saved Items', value: stats?.saved_items ?? 0, to: '/marketplace', color: '#8b5cf6' },
            { icon: FiMessageCircle, label: 'Messages', value: stats?.unread_messages ?? 0, to: '/messages', color: 'var(--color-green)' },
          ].map((s) => (
            <button
              key={s.label}
              className="dashboard__stat-card card"
              onClick={() => navigate(s.to)}
              type="button"
            >
              <s.icon size={20} color={s.color} />
              <span className="dashboard__stat-value">{s.value}</span>
              <span className="dashboard__stat-label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* ── Active Purchase ── */}
        <div className="dashboard__section">
          <div className="section-header">
            <span className="section-title">Active Purchase</span>
            <button className="section-link" onClick={() => navigate('/purchases')}>
              View all <FiChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <LoadingState type="list" count={1} />
          ) : activePurchase ? (
            <div
              className="dashboard__purchase-card card"
              onClick={() => navigate('/purchases')}
              style={{ cursor: 'pointer' }}
            >
              <div className="dashboard__purchase-body">
                <div className="dashboard__purchase-image-wrap">
                  {activePurchase.imageUrl
                    ? <img src={activePurchase.imageUrl} alt={activePurchase.title} className="dashboard__purchase-image" />
                    : <div className="dashboard__purchase-image-placeholder" />
                  }
                </div>
                <div className="dashboard__purchase-info">
                  <p className="dashboard__purchase-title">{activePurchase.title}</p>
                  <p className="dashboard__purchase-seller">
                    {activePurchase.sellerName} · {activePurchase.sellerRole}
                  </p>
                  <div className="dashboard__purchase-meta">
                    <StatusBadge status={activePurchase.paymentStatus} />
                    <span className="dashboard__purchase-price">
                      ₹{Number(activePurchase.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info-only notice — confirmation happens on the Purchases page */}
              <div className="dashboard__purchase-waiting-bar">
                <FiClock size={14} />
                <span>Awaiting your confirmation — go to My Purchases to confirm receipt</span>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FiPackage}
              title="No active purchases"
              description="Items you purchase will appear here."
            />
          )}
        </div>

        {/* ── Recent Listings ── */}
        <div className="dashboard__section">
          <div className="section-header">
            <span className="section-title">Recent Listings</span>
            <button className="section-link" onClick={() => navigate('/marketplace')}>
              Browse <FiChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <LoadingState type="grid" count={4} />
          ) : !recent_listings || recent_listings.length === 0 ? (
            <EmptyState
              icon={FiShoppingBag}
              title="No listings yet"
              description="Be the first to list something on the campus marketplace."
              action={() => navigate('/list-item')}
              actionLabel="List an Item"
            />
          ) : (
            <div className="dashboard__items-grid">
              {recent_listings.slice(0, 4).map((item) => (
                <ItemCard
                  key={item.id}
                  item={{
                    ...item,
                    imageUrl: item.image_url,
                    sellerName: item.seller_name,
                    sellerVerified: item.seller_verified,
                    savedCount: item.saved_count,
                    viewCount: item.view_count,
                  }}
                  onView={(item) => navigate(`/item/${item.id}`)}
                  onSave={handleSaveItem}
                  isSaved={savedItems.has(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}