import './StatusBadge.css';
import {
  FiCheckCircle,
  FiClock,
  FiTag,
  FiLock,
  FiRefreshCw,
  FiAlertCircle,
} from 'react-icons/fi';

const STATUS_CONFIG = {
  Available: {
    className: 'badge--available',
    icon: <FiCheckCircle size={11} />,
    label: 'Available',
  },
  Reserved: {
    className: 'badge--reserved',
    icon: <FiClock size={11} />,
    label: 'Reserved',
  },
  Sold: {
    className: 'badge--sold',
    icon: <FiTag size={11} />,
    label: 'Sold',
  },
  holding: {
    className: 'badge--holding',
    icon: <FiLock size={11} />,
    label: 'In Vault',
  },
  released: {
    className: 'badge--released',
    icon: <FiCheckCircle size={11} />,
    label: 'Released',
  },
  refunded: {
    className: 'badge--refunded',
    icon: <FiRefreshCw size={11} />,
    label: 'Refunded',
  },
  pending: {
    className: 'badge--holding',
    icon: <FiAlertCircle size={11} />,
    label: 'Pending',
  },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span className={`status-badge status-badge--${size} ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}