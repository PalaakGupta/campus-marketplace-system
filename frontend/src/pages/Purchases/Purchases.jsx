import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiShoppingBag, FiAlertCircle, FiCheckCircle,
  FiRefreshCw, FiClock,
} from 'react-icons/fi';
import PageHeader from '../../components/layout/PageHeader/PageHeader';
import TabBar from '../../components/ui/TabBar/TabBar';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import PaymentTimeline from '../../components/ui/PaymentTimeline/PaymentTimeLine';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import { getMyPurchases, confirmDelivery } from '../../services/purchaseService';
import './Purchases.css';

const PURCHASE_TABS = [
  { id: 'all',        label: 'All' },
  { id: 'holding',    label: 'Awaiting' },
  { id: 'released',   label: 'Completed' },
  { id: 'refunded',   label: 'Refunded' },
];

export default function Purchases() {
  const navigate = useNavigate();

  const [purchases, setPurchases]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('all');
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        const data = await getMyPurchases();
        const responseData = data?.data ?? data;
        setPurchases(
          (responseData?.purchases ?? []).map(p => ({
            ...p,
            paymentStatus: p.payment_status ?? p.paymentStatus,
            itemId: p.item_id ?? p.itemId,
            sellerName: p.seller_name ?? p.sellerName,
            imageUrl: p.image_url ?? p.imageUrl,
            purchasedAt: p.purchased_at ?? p.purchasedAt,
          }))
        );
      } catch (err) {
        console.error('Purchases fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, []);

  const filtered =
    activeTab === 'all'
      ? purchases
      : purchases.filter((p) => p.paymentStatus === activeTab);

  const handleConfirmDelivery = async (purchaseId) => {
    try {
      setConfirming(purchaseId);
      await confirmDelivery(purchaseId);
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === purchaseId ? { ...p, payment_status: 'released', paymentStatus: 'released' } : p
        )
      );
    } catch (err) {
      console.error('Confirm delivery error:', err);
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="purchases page anim-fade-in">
      <PageHeader title="My Purchases" subtitle="Track your purchase history" />

      <div className="purchases__body">
        <TabBar tabs={PURCHASE_TABS} activeTab={activeTab} onTabChange={setActiveTab} scrollable />

        <div className="purchases__list">
          {loading ? (
            <LoadingState type="list" count={3} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FiShoppingBag}
              title={activeTab === 'all' ? 'No purchases yet' : `No ${activeTab} purchases`}
              description={
                activeTab === 'all'
                  ? 'Items you purchase from the campus marketplace will appear here.'
                  : undefined
              }
              action={activeTab === 'all' ? () => navigate('/marketplace') : undefined}
              actionLabel={activeTab === 'all' ? 'Browse Marketplace' : undefined}
            />
          ) : (
            filtered.map((purchase) => (
              <div key={purchase.id} className="purchases__card card">
                {/* Main Info */}
                <div className="purchases__card-body" onClick={() => navigate(`/item/${purchase.itemId}`)}>
                  <div className="purchases__image-wrap">
                    {purchase.imageUrl
                      ? <img src={purchase.imageUrl} alt={purchase.title} className="purchases__image" />
                      : <div className="purchases__image-placeholder" />
                    }
                  </div>
                  <div className="purchases__info">
                    <p className="purchases__item-title">{purchase.title}</p>
                    <p className="purchases__item-seller">{purchase.sellerName} · {purchase.date}</p>
                    <div className="purchases__item-row">
                      <StatusBadge status={purchase.paymentStatus} size="sm" />
                      <span className="purchases__price">
                        ₹{Number(purchase.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Timeline */}
                <div className="purchases__timeline-wrap">
                  <PaymentTimeline paymentStatus={purchase.paymentStatus} />
                </div>

                {/* Confirm Action (holding only) */}
                {purchase.paymentStatus === 'holding' && (
                  <div className="purchases__confirm-bar">
                    <FiAlertCircle size={15} />
                    <span className="purchases__confirm-text">
                      Have you received this item?
                    </span>
                    <button
                      className="btn btn-sm btn-inline"
                      style={{ background: 'var(--color-green)', color: '#fff', border: 'none' }}
                      onClick={() => handleConfirmDelivery(purchase.id)}
                      disabled={confirming === purchase.id}
                      type="button"
                    >
                      {confirming === purchase.id ? 'Confirming...' : 'Confirm Receipt'}
                    </button>
                  </div>
                )}

                {/* Completed state */}
                {purchase.paymentStatus === 'released' && (
                  <div className="purchases__released-bar">
                    <FiCheckCircle size={14} />
                    <span>Payment released to seller</span>
                  </div>
                )}

                {/* Refunded state */}
                {purchase.paymentStatus === 'refunded' && (
                  <div className="purchases__refunded-bar">
                    <FiRefreshCw size={14} />
                    <span>Payment refunded to your wallet</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}