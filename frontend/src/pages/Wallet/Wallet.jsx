import { useState, useEffect, useCallback } from 'react';

import {
  FiPlus, FiCheckCircle, FiLock, FiShoppingBag,
  FiRepeat, FiArrowDownLeft,
} from 'react-icons/fi';

import TabBar from '../../components/ui/TabBar/TabBar';
import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import { getWalletSummary, topUpWallet, getTransactions } from "../../services/walletService";
import { confirmDelivery } from "../../services/purchaseService";
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
  

  const [walletData, setWalletData] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getWalletSummary();
      setWalletData(response?.data || response);
    } catch (err) {
      console.error("Wallet fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (type) => {
    try {
      setTxLoading(true);
      const data = await getTransactions(type);
      const list = Array.isArray(data) ? data : (data.transactions || data.data || []);
      setTransactions(list);
    } catch (err) {
      console.error("Transactions fetch error:", err);
    } finally {
      setTxLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchWallet(); }, []);
// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTransactions(activeTab); }, [activeTab, fetchTransactions]);

  const handleConfirmDelivery = async (purchaseId) => {
    try {
      setConfirming(purchaseId);
      await confirmDelivery(purchaseId);
      await fetchWallet();
    } catch (err) {
      console.error("Confirm error:", err);
    } finally {
      setConfirming(null);
    }
  };

const handleTopUp = async () => {
    const parsed = parseFloat(topUpAmount);
      if (!parsed || parsed <= 0) return;
      try {
          setToppingUp(true);
          await topUpWallet(parsed);          // ← pass the amount
          setTopUpAmount("");
          setShowTopUp(false);
          await fetchWallet();
      } catch (err) {
          console.error("Top up error:", err);
      } finally {
          setToppingUp(false);
      }
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
              {formatAmount(walletData?.available_balance)}
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
              value: formatAmount(walletData?.available_balance),
              desc: 'Ready to spend',
              color: 'var(--color-green)',
              bg: 'var(--color-green-soft)',
            },
            {
              icon: FiLock,
              label: 'In Vault',
              value: formatAmount(walletData?.held_balance),
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
        {showTopUp ? (
          <div className="card" style={{ padding: 16, display: "flex", gap: 10 }}>
            <input
              type="number"
              className="input-field"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              min="1"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-inline" style={{ flex: "0 0 auto", padding: "13px 20px" }} onClick={handleTopUp} disabled={toppingUp || !topUpAmount} type="button">
              {toppingUp ? "..." : "Top Up"}
            </button>
            <button className="btn btn-secondary btn-inline" style={{ flex: "0 0 auto", padding: "13px 16px" }} onClick={() => setShowTopUp(false)} type="button">
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setShowTopUp(true)} type="button">
            <FiPlus size={17} /> Add Funds to Wallet
          </button>
        )}

        {/* ── Active Holds ── */}
        {walletData?.active_holds?.length > 0 && (
          <div>
            <div className="section-header">
              <span className="section-title">Active Payment Holds</span>
              <span className="badge-count">{walletData.active_holds.length}</span>
            </div>
            <div className="wallet__holds">
              {walletData.active_holds.map((hold) => (
                <div key={hold.purchase_id} className="wallet__hold-card card">
                  <div className="wallet__hold-banner">
                    <FiLock size={14} />
                    <span>Payment secured in campus vault</span>
                  </div>
                  <div className="wallet__hold-body">
                    <div className="wallet__hold-image-wrap">
                      {hold.image_url
                        ? <img src={hold.image_url} alt={hold.title} className="wallet__hold-image" />
                        : <div className="wallet__hold-image-placeholder" />
                      }
                    </div>
                    <div className="wallet__hold-info">
                      <p className="wallet__hold-title">{hold.title}</p>
                      <p className="wallet__hold-seller">{hold.seller_name}</p>
                    </div>
                    <div className="wallet__hold-right">
                      <p className="wallet__hold-amount">{formatAmount(hold.amount)}</p>
                      <button
                        className="btn btn-sm btn-inline"
                        style={{ background: "var(--color-green)", color: "#fff", border: "none", marginTop: 6 }}
                        onClick={() => handleConfirmDelivery(hold.purchase_id)}
                        disabled={confirming === hold.purchase_id}
                        type="button"
                      >
                        {confirming === hold.purchase_id ? "..." : "Confirm"}
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
                const Icon = TX_ICON[tx.transaction_type] ?? FiArrowDownLeft;
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
                        <span className="wallet__tx-date">{tx.date ? new Date(tx.date).toLocaleDateString() : "—"}</span>
                        <span className="wallet__tx-sep">·</span>
                        <StatusBadge status={tx.paymentStatus || tx.transaction_type} size="sm" />
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