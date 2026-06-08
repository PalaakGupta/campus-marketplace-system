import { FiShield } from "react-icons/fi";
import "./SecurityCard.css";

export default function SecurityCard({ title, message, variant = "info" }) {
  return (
    <div className={`security-card security-card--${variant}`}>
      <div className="security-card__icon-wrap">
        <FiShield size={20} />
      </div>
      <div className="security-card__body">
        {title && <p className="security-card__title">{title}</p>}
        <p className="security-card__message">{message}</p>
      </div>
    </div>
  );
}