import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus, FiCheckCircle, FiLock, FiShoppingBag,
  FiRepeat, FiArrowDownLeft, FiAlertCircle,
} from 'react-icons/fi';
import PageHeader from '../../components/layout/PageHeader/PageHeader';
import TabBar from '../../components/ui/TabBar/TabBar';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import './Wallet.css';

const TX_TABS = [
  { id: 'all', label: 'All' },
  { id: 'purchase', label: 'Purchases' },
  { id: 'release', label: 'Sales' },
  { id: 'refund', label: 'Refunds' },
];

const TX_ICON = {
  purchase: FiShoppingBag,
  release: FiCheckCircle,
  refund: FiRepeat,
};

export default function Wallet() {
  const navigate = useNavigate();

  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeHolds, setActiveHolds] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        setLoading(true);

      } catch (err) {
        console.error('Wallet fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTxLoading(true);
      } catch (err) {
        console.error('Transactions fetch error:', err);
      } finally {
        setTxLoading(false);
      }
    };
    fetchTransactions();
  }, [activeTab]);

  const handleConfirmDelivery = async (purchaseId) => {
    try {

    } catch (err) {
      console.error('Confirm delivery error:', err);
    }
  };

  const handleTopUp = () => {

  };

  const formatAmount = (n) =>
    n !== undefined && n !== null ? `₹${Number(n).toLocaleString()}` : '₹—';

  return (
    <div className="wallet page anim-fade-in">
      {/* ── Hero ── */}
      <div className="wallet__hero">
        <div className="wallet__hero-header">
          <h1 className="wallet__hero-title">Campus Wallet</h1>
        </div>
        {loading ? (
          <div className="wallet__hero-skeleton">
            <div className="skeleton wallet__hero-skel-amount" />
            <div className="skeleton wallet__hero-skel-label" />
          </div>
        ) : (
          <div className="wallet__hero-balance">
            <p className="wallet__hero-label">Total Available Balance</p>
            <p className="wallet__hero-amount">
              {formatAmount(walletData?.availableBalance)}
            </p>
            <p className="wallet__hero-sub">Campus Credit Balance</p>
          </div>
        )}
      </div>

      <div className="wallet__body">
        <div className="wallet__balance-cards">
          {[
            {
              icon: FiCheckCircle,
              label: 'Available',
              value: formatAmount(walletData?.availableBalance),
              desc: 'Ready to spend',
              color: 'var(--color-green)',
              bg: 'var(--color-green-soft)',
            },
            {
              icon: FiLock,
              label: 'In Vault',
              value: formatAmount(walletData?.heldBalance),
              desc: 'Awaiting confirmation',
              color: 'var(--color-orange)',
              bg: 'var(--color-orange-soft)',
            },
          ].map((b) => (
            <div key={b.label} className="wallet__balance-card card">
              <div className="wallet__balance-icon-wrap" style={{ background: b.bg }}>
                <b.icon size={17} color={b.color} />
              </div>
              <p className="wallet__balance-label">{b.label}</p>
              <p className="wallet__balance-value">{b.value}</p>
              <p className="wallet__balance-desc">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* ── Top Up ── */}
        <button className="btn btn-primary" onClick={handleTopUp} type="button">
          <FiPlus size={17} /> Add Funds to Wallet
        </button>

        {/* ── Active Holds ── */}
        {activeHolds.length > 0 && (
          <div>
            <div className="section-header">
              <span className="section-title">Active Payment Holds</span>
              <span className="badge-count">{activeHolds.length}</span>
            </div>
            <div className="wallet__holds">
              {activeHolds.map((hold) => (
                <div key={hold.id} className="wallet__hold-card card">
                  <div className="wallet__hold-banner">
                    <FiLock size={14} />
                    <span>Payment secured in campus vault</span>
                  </div>
                  <div className="wallet__hold-body">
                    <div className="wallet__hold-image-wrap">
                      {hold.imageUrl
                        ? <img src={hold.imageUrl} alt={hold.title} className="wallet__hold-image" />
                        : <div className="wallet__hold-image-placeholder" />
                      }
                    </div>
                    <div className="wallet__hold-info">
                      <p className="wallet__hold-title">{hold.title}</p>
                      <p className="wallet__hold-seller">{hold.sellerName}</p>
                    </div>
                    <div className="wallet__hold-right">
                      <p className="wallet__hold-amount">{formatAmount(hold.amount)}</p>
                      <button
                        className="btn btn-sm btn-inline"
                        style={{ background: 'var(--color-green)', color: '#fff', border: 'none', marginTop: 6 }}
                        onClick={() => handleConfirmDelivery(hold.id)}
                        type="button"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Transaction History ── */}
        <div>
          <div className="section-header">
            <span className="section-title">Transaction History</span>
          </div>
          <TabBar tabs={TX_TABS} activeTab={activeTab} onTabChange={setActiveTab} scrollable />
          <div className="wallet__tx-list">
            {txLoading ? (
              <LoadingState type="list" count={4} />
            ) : transactions.length === 0 ? (
              <EmptyState
                icon={FiArrowDownLeft}
                title="No transactions yet"
                description="Your transaction history will appear here."
              />
            ) : (
              transactions.map((tx) => {
                const Icon = TX_ICON[tx.type] ?? FiArrowDownLeft;
                const isCredit = tx.amount > 0;
                return (
                  <div key={tx.id} className="wallet__tx-item card">
                    <div
                      className="wallet__tx-icon"
                      style={{ background: isCredit ? 'var(--color-green-soft)' : 'var(--color-blue-soft)' }}
                    >
                      <Icon size={17} color={isCredit ? 'var(--color-green-text)' : 'var(--color-blue)'} />
                    </div>
                    <div className="wallet__tx-info">
                      <p className="wallet__tx-title">{tx.title}</p>
                      <div className="wallet__tx-meta">
                        <span className="wallet__tx-date">{tx.date}</span>
                        <span className="wallet__tx-sep">·</span>
                        <StatusBadge status={tx.paymentStatus} size="sm" />
                      </div>
                    </div>
                    <p
                      className="wallet__tx-amount"
                      style={{ color: isCredit ? 'var(--color-green-text)' : 'var(--color-dark-blue)' }}
                    >
                      {isCredit ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}