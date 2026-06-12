import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus, FiPackage, FiEdit2, FiMoreVertical,
  FiEye, FiHeart, FiMessageCircle, FiTrendingUp,
} from 'react-icons/fi';
import TabBar from '../../components/ui/TabBar/TabBar';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import PageHeader from "../../components/layout/PageHeader/PageHeader";
import { getMyListings, updateItemStatus, deleteItem } from '../../services/itemService';
import './MyListings.css';

const LISTING_TABS = [
  { id: 'all',       label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'reserved',  label: 'Reserved' },
  { id: 'sold',      label: 'Sold' },
];

export default function MyListings() {
  const navigate = useNavigate();

  const [listings, setListings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('all');
  const [stats, setStats]           = useState({ available: 0, reserved: 0, sold: 0, totalEarned: 0 });
  const [actionMenu, setActionMenu] = useState(null); 

  useEffect(() => {
  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await getMyListings();
      const responseData = data?.data ?? data;
      setListings(responseData?.listings ?? []);
      const s = responseData?.stats ?? {};
      setStats({
        available:    s.available    ?? 0,
        reserved:     s.reserved     ?? 0,
        sold:         s.sold         ?? 0,
        totalEarned:  s.total_earned ?? 0,
      });
    } catch (err) {
      console.error('My listings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  fetchListings();
}, []);

  const filtered =
    activeTab === 'all'
      ? listings
      : listings.filter((l) => l.status === activeTab);

  const handleEdit = (e, id) => {
    e.stopPropagation();
    navigate(`/list-item?edit=${id}`);
  };

  const handleToggleAction = (e, id) => {
    e.stopPropagation();
    setActionMenu((prev) => (prev === id ? null : id));
  };

  const handleMarkSold = async (id) => {
    setActionMenu(null);
    try {
      await updateItemStatus(id, 'sold');
      setListings((prev) =>
        prev.map((l) => l.id === id ? { ...l, status: 'sold' } : l)
      );
      setStats((prev) => ({
        ...prev,
        available: Math.max(0, prev.available - 1),
        sold: prev.sold + 1,
      }));
    } catch (err) {
      console.error('Mark sold error:', err);
    }
  };
  const handleDeleteListing = async (id) => {
    setActionMenu(null);
    try {
      await deleteItem(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error('Delete listing error:', err);
    }
  };

  return (
    <div className="my-listings page anim-fade-in">
      <PageHeader
        title="My Listings"
        subtitle="Manage your campus listings"
        action={
          <button
            className="btn btn-primary btn-inline btn-sm"
            onClick={() => navigate('/list-item')}
            type="button"
          >
            <FiPlus size={15} /> New
          </button>
        }
      />

      <div className="my-listings__body">
        {/* Stats */}
        <div className="my-listings__stats">
          {[
            { label: 'Available', value: stats.available, color: 'var(--color-green)' },
            { label: 'Reserved',  value: stats.reserved,  color: 'var(--color-orange)' },
            { label: 'Sold',      value: stats.sold,      color: 'var(--color-text-sec)' },
            { label: 'Earned',    value: `₹${Number(stats.totalEarned).toLocaleString()}`, color: 'var(--color-blue)' },
          ].map((s) => (
            <div key={s.label} className="my-listings__stat-card card">
              <p className="my-listings__stat-value" style={{ color: s.color }}>{s.value}</p>
              <p className="my-listings__stat-label">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <TabBar tabs={LISTING_TABS} activeTab={activeTab} onTabChange={setActiveTab} scrollable />

        {/* List */}
        <div className="my-listings__list">
          {loading ? (
            <LoadingState type="list" count={4} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FiPackage}
              title={activeTab === 'all' ? 'No listings yet' : `No ${activeTab.toLowerCase()} listings`}
              description={activeTab === 'all' ? 'List your first item on the campus marketplace.' : undefined}
              action={activeTab === 'all' ? () => navigate('/list-item') : undefined}
              actionLabel={activeTab === 'all' ? 'List an Item' : undefined}
            />
          ) : (
            filtered.map((listing) => (
              <div
                key={listing.id}
                className="my-listings__card card"
                onClick={() => navigate(`/item/${listing.id}`)}
              >
                <div className="my-listings__card-body">
                  <div className="my-listings__image-wrap">
                    {(listing.image_url || listing.imageUrl)
                      ? <img src={listing.image_url || listing.imageUrl} alt={listing.title} className="my-listings__image" />
                      : <div className="my-listings__image-placeholder" />
                    }
                  </div>
                  <div className="my-listings__info">
                    <div className="my-listings__info-top">
                      <p className="my-listings__title">{listing.title}</p>
                      <StatusBadge status={listing.status} size="sm" />
                    </div>
                    <p className="my-listings__price">₹{Number(listing.price).toLocaleString()}</p>
                    <div className="my-listings__meta">
                      <span className="my-listings__meta-item">
                        <FiEye size={11} /> {listing.view_Count ?? 0}
                      </span>
                      <span className="my-listings__meta-item">
                        <FiHeart size={11} /> {listing.saved_Count ?? 0}
                      </span>
                      <span className="my-listings__meta-item">
                        <FiMessageCircle size={11} /> {listing.message_Count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="my-listings__card-actions">
                  <button
                    className="my-listings__action-btn"
                    onClick={(e) => handleEdit(e, listing.id)}
                    type="button"
                  >
                    <FiEdit2 size={13} /> Edit
                  </button>
                  <div className="my-listings__action-divider" />
                  <div className="my-listings__more-wrap">
                    <button
                      className="my-listings__action-btn"
                      onClick={(e) => handleToggleAction(e, listing.id)}
                      type="button"
                    >
                      <FiMoreVertical size={13} /> More
                    </button>
                    {actionMenu === listing.id && (
                      <div className="my-listings__dropdown card">
                       {listing.status === 'available' && (
                          <button
                            className="my-listings__dropdown-item"
                            onClick={(e) => { e.stopPropagation(); handleMarkSold(listing.id); }}
                            type="button"
                          >
                            <FiTrendingUp size={14} /> Mark as Sold
                          </button>
                        )}
                        <button
                          className="my-listings__dropdown-item my-listings__dropdown-item--danger"
                          onClick={(e) => { e.stopPropagation(); handleDeleteListing(listing.id); }}
                          type="button"
                        >
                          Delete Listing
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}