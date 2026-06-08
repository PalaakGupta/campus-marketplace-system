import { FiCheckCircle, FiLock, FiPlus, FiClock } from 'react-icons/fi';
import './BalanceCard.css';

export default function BalanceCard({
  availableBalance,
  heldBalance,
  onTopUp,
  onHistory,
  compact = false,
}) {
  const formatAmount = (n) =>
    n !== undefined && n !== null
      ? `₹${Number(n).toLocaleString()}`
      : '₹—';

  if (compact) {
    return (
      <div className="balance-card balance-card--compact card">
        <div className="balance-card__row">
          <div className="balance-card__stat">
            <div className="balance-card__stat-label">
              <FiCheckCircle size={12} />
              Available
            </div>
            <p className="balance-card__stat-value balance-card__stat-value--available">
              {formatAmount(availableBalance)}
            </p>
          </div>
          <div className="balance-card__divider-v" />
          <div className="balance-card__stat">
            <div className="balance-card__stat-label">
              <FiLock size={12} />
              In Vault
            </div>
            <p className="balance-card__stat-value balance-card__stat-value--held">
              {formatAmount(heldBalance)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="balance-card balance-card--hero">
      <div className="balance-card__hero-top">
        <div>
          <p className="balance-card__hero-label">Available Balance</p>
          <p className="balance-card__hero-amount">{formatAmount(availableBalance)}</p>
        </div>
        <div className="balance-card__hero-right">
          <p className="balance-card__hero-label-sm">Held Balance</p>
          <p className="balance-card__hero-held">{formatAmount(heldBalance)}</p>
        </div>
      </div>
      <div className="balance-card__actions">
        <button className="balance-card__btn balance-card__btn--topup" onClick={onTopUp} type="button">
          <FiPlus size={15} /> Top Up
        </button>
        <button className="balance-card__btn balance-card__btn--history" onClick={onHistory} type="button">
          <FiClock size={15} /> History
        </button>
      </div>
    </div>
  );
}