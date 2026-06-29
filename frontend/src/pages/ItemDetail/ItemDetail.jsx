import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiHeart, FiShield, FiMessageCircle,
  FiTag, FiEye, FiAlertCircle, FiAlertTriangle,
   FiLock,
} from 'react-icons/fi';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import SecurityCard from '../../components/ui/SecurityCard/SecurityCard';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import { getItemById, saveItem, unsaveItem, incrementView } from "../../services/itemService";
import { purchaseItem } from "../../services/purchaseService";
import { getWalletSummary } from "../../services/walletService";
import './ItemDetail.css';

function PurchaseSheet({ item, onClose, onConfirm, userBalance, purchasing }) {
  const price = Number(item?.price ?? 0);
  const balance = Number(userBalance ?? 0);
  const remaining = balance - price;
  const canAfford = remaining >= 0;

  return (
    <div className="purchase-sheet__overlay" onClick={onClose}>
      <div className="purchase-sheet anim-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="purchase-sheet__handle" />
        <h2 className="purchase-sheet__title">Confirm Purchase</h2>
        <p className="purchase-sheet__subtitle">Review before completing</p>

        {/* Item Summary */}
        <div className="purchase-sheet__item-row">
          <div className="purchase-sheet__item-image-wrap">
            {item?.imageUrl
              ? <img src={item.imageUrl} alt={item.title} className="purchase-sheet__item-image" />
              : <div className="purchase-sheet__item-image-placeholder" />
            }
          </div>
          <div className="purchase-sheet__item-info">
            <p className="purchase-sheet__item-title">{item?.title}</p>
            <p className="purchase-sheet__item-meta">{item?.condition} · {item?.sellerName}</p>
            <p className="purchase-sheet__item-price">₹{price.toLocaleString()}</p>
          </div>
        </div>

        {/* Balance Breakdown */}
        <div className="purchase-sheet__breakdown card">
          {[
            { label: 'Your Balance', value: `₹${balance.toLocaleString()}`, color: 'var(--color-text)' },
            { label: 'Item Price', value: `-₹${price.toLocaleString()}`, color: 'var(--color-red-text)' },
            { label: 'Remaining Balance', value: `₹${Math.max(0, remaining).toLocaleString()}`, color: canAfford ? 'var(--color-green-text)' : 'var(--color-red-text)', bold: true },
          ].map((row, i) => (
            <div key={i} className={`purchase-sheet__row ${i === 2 ? 'purchase-sheet__row--total' : ''}`}>
              <span className={`purchase-sheet__row-label ${row.bold ? 'purchase-sheet__row-label--bold' : ''}`}>
                {row.label}
              </span>
              <span className="purchase-sheet__row-value" style={{ color: row.color, fontWeight: row.bold ? 800 : 600 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Insufficient balance error */}
        {!canAfford && (
          <div className="purchase-sheet__error">
            <FiAlertTriangle size={16} />
            <div>
              <p className="purchase-sheet__error-title">Insufficient Balance</p>
              <p className="purchase-sheet__error-desc">
                You need ₹{Math.abs(remaining).toLocaleString()} more. Please top up your wallet.
              </p>
            </div>
          </div>
        )}

        <SecurityCard
          message="Payment is securely held in the campus vault until you confirm item receipt."
          variant="info"
        />

        <div className="purchase-sheet__actions">
          <button className="btn btn-secondary btn-inline" style={{ flex: '0 0 40%' }} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="btn btn-primary btn-inline"
            style={{ flex: '0 0 58%' }}
            onClick={canAfford ? onConfirm : undefined}
            disabled={!canAfford}
            type="button"
          >
            <FiLock size={15} /> {purchasing ? "Processing..." : "Confirm & Pay"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [userBalance, setUserBalance] = useState(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);
  const [error, setError] = useState(null);

  const currentUserId = localStorage.getItem("user_id");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [itemData, walletData] = await Promise.all([
          getItemById(id),
          getWalletSummary().catch(() => null),
        ]);
        // Normalize field names
        const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const normalized = {
  ...itemData,
  imageUrl: itemData.image_url 
    ? `${BASE}${itemData.image_url}` 
    : itemData.imageUrl || null,
          sellerName: itemData.seller?.name || itemData.seller_name,
          sellerRole: itemData.seller?.role || itemData.seller_role,
          sellerVerified: itemData.seller?.is_verified ?? itemData.seller_verified ?? false,
          savedCount: itemData.saved_count ?? itemData.savedCount ?? 0,
          viewCount: itemData.view_count ?? itemData.viewCount ?? 0,
          isOwnListing: (itemData.seller?.id || itemData.seller_id) === currentUserId,
        };
        setItem(normalized);
        setIsSaved(itemData.is_saved ?? false);
        setUserBalance(walletData?.available_balance ?? null);

        incrementView(id).catch(() => { });
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Failed to load item");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, currentUserId]);

  const handleSave = async () => {
    setIsSaved((s) => !s);
    try {
      if (isSaved) {
        await unsaveItem(id);
      } else {
        await saveItem(id);
      }
    } catch {
      setIsSaved((s) => !s);
    }
  };

  const handleConfirmPurchase = async () => {
    try {
      setPurchasing(true);
      setPurchaseError(null);
      await purchaseItem(id);
      setShowPurchase(false);
      navigate("/purchases");
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message || "Purchase failed";
      setPurchaseError({ code, message: msg });

      // Refresh item status if reserved/sold by someone else
      if (code === "ITEM_RESERVED" || code === "ITEM_SOLD" || code === "CONCURRENT_PURCHASE") {
        setShowPurchase(false);
        const fresh = await getItemById(id).catch(() => null);
        if (fresh) setItem((prev) => ({ ...prev, status: fresh.status }));
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="item-detail page">
        <div className="item-detail__loading-header">
          <button className="btn-ghost btn-icon" onClick={() => navigate(-1)} type="button">
            <FiArrowLeft size={20} />
          </button>
        </div>
        <div style={{ padding: '16px' }}>
          <LoadingState type="list" count={3} />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="item-detail page">
        <div className="item-detail__loading-header">
          <button className="btn-ghost btn-icon" onClick={() => navigate(-1)} type="button">
            <FiArrowLeft size={20} />
          </button>
        </div>
        <div className="item-detail__error">
          <FiAlertCircle size={36} />
          <p>{error ?? 'Item not found.'}</p>
          <button className="btn btn-secondary btn-inline" onClick={() => navigate('/marketplace')} type="button">
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const canBuy = item.status === 'available';
  const isOwn = item.isOwnListing;

  return (
    <div className="item-detail page anim-fade-in">
      {/* ── Hero Image ── */}
      <div className="item-detail__hero">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.title} className="item-detail__hero-image" />
          : <div className="item-detail__hero-placeholder" />
        }
        <div className="item-detail__hero-overlay">
          <button
            className="item-detail__back-btn"
            onClick={() => navigate(-1)}
            type="button"
            aria-label="Go back"
          >
            <FiArrowLeft size={19} />
          </button>
          <button
            className={`item-detail__save-btn ${isSaved ? 'item-detail__save-btn--active' : ''}`}
            onClick={handleSave}
            type="button"
            aria-label={isSaved ? 'Remove from saved' : 'Save item'}
          >
            <FiHeart size={19} />
          </button>
        </div>
        <div className="item-detail__hero-badges">
          <StatusBadge status={item.status} size="md" />
          {(item.channel === 'thrift Store' || item.listing_channel === 'thrift_store') && (
            <span className="item-detail__thrift-badge">THRIFT STORE</span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className={`item-detail__body ${canBuy && !isOwn ? 'item-detail__body--with-action' : ''}`}>

        {/* Purchase error */}
        {purchaseError && (
          <div className="item-detail__alert item-detail__alert--warning">
            <FiAlertCircle size={17} />
            <div>
              <p className="item-detail__alert-title">Purchase Failed</p>
              <p className="item-detail__alert-desc">{purchaseError.message}</p>
            </div>
          </div>
        )}
        {/* Title + Price */}
        <div className="item-detail__title-row">
          <div className="item-detail__title-wrap">
            <h1 className="item-detail__title">{item.title}</h1>
            <div className="item-detail__chips">
              <span className="chip chip-sm"><FiTag size={11} /> {item.category}</span>
              <span className="chip chip-sm"><FiEye size={11} /> {item.viewCount ?? 0} views</span>
              <span className="chip chip-sm"><FiHeart size={11} /> {item.savedCount ?? 0}</span>
            </div>
          </div>
          <div className="item-detail__price-wrap">
            <p className="item-detail__price">₹{Number(item.price).toLocaleString()}</p>
            <p className="item-detail__condition">{item.condition}</p>
          </div>
        </div>

        {/* Seller */}
        <div className="item-detail__seller card">
          <div className="avatar avatar-md">{item.sellerName?.charAt(0) ?? '?'}</div>
          <div className="item-detail__seller-info">
            <div className="item-detail__seller-name-row">
              <p className="item-detail__seller-name">{item.sellerName}</p>
              {item.sellerVerified && <FiShield size={13} className="item-detail__seller-verified" />}
            </div>
            <p className="item-detail__seller-role">{item.sellerRole} · Campus Community</p>
          </div>
          <button
            className="btn btn-secondary btn-inline btn-sm"
            onClick={() => navigate(`/messages/${item.id}`)}
            type="button"
          >
            <FiMessageCircle size={13} /> Chat
          </button>
        </div>

        {/* Description */}
        <div className="item-detail__section">
          <h2 className="item-detail__section-title">Description</h2>
          <p className="item-detail__description">{item.description}</p>
        </div>

        {/* Status-specific alerts */}
        {(item.status === 'Reserved' || item.status === "reserved") && (
          <div className="item-detail__alert item-detail__alert--warning">
            <FiAlertCircle size={17} />
            <div>
              <p className="item-detail__alert-title">Item Reserved</p>
              <p className="item-detail__alert-desc">
                This item is currently reserved for another buyer. Check back soon.
              </p>
            </div>
          </div>
        )}

        {(item.status === 'Sold' || item.status === "sold") && (
          <div className="item-detail__alert item-detail__alert--neutral">
            <FiTag size={17} />
            <div>
              <p className="item-detail__alert-title">Item Sold</p>
              <p className="item-detail__alert-desc">
                This item has already been sold. Browse similar listings.
              </p>
            </div>
          </div>
        )}

        {isOwn && (
          <div className="item-detail__alert item-detail__alert--info">
            <FiAlertCircle size={17} />
            <div>
              <p className="item-detail__alert-title">This is your listing</p>
              <p className="item-detail__alert-desc">You cannot purchase your own listed item.</p>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <SecurityCard
          title="Secure Payment Hold"
          message="Your payment is held securely in the campus vault. Funds are only released to the seller after you confirm receipt."
          variant="info"
        />
      </div>

      {/* ── Sticky Buy Button ── */}
      {canBuy && !isOwn && (
        <div className="item-detail__sticky-action">
          <button
            className="btn btn-primary"
            onClick={() => setShowPurchase(true)}
            disabled={purchasing}
            type="button"
          >
            <FiShield size={17} />
            {purchasing ? 'Processing...' : `Buy Securely · ₹${Number(item.price).toLocaleString()}`}
          </button>
        </div>
      )}

      {/* ── Purchase Sheet ── */}
      {showPurchase && (
        <PurchaseSheet
          item={item}
          userBalance={userBalance}
          onClose={() => setShowPurchase(false)}
          onConfirm={handleConfirmPurchase}
          purchasing={purchasing}
        />
      )}
    </div>
  );
}