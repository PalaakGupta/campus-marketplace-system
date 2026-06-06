import { FiArrowLeft } from "react-icons/fi";
import "./PageHeader.css";

export default function PageHeader({
  title,
  subtitle,
  onBack,
  action,
  transparent = false,
  sticky = true,
}) {
  return (
    <header className={`page-header ${transparent ? "page-header--transparent" : ''} ${sticky ? "page-header--sticky" : ''}`}>
      <div className="page-header__inner">
        <div className="page-header__left">
          {onBack && (
            <button
              className="page-header__back btn-icon"
              onClick={onBack}
              aria-label="Go back"
              type="button"
            >
              <FiArrowLeft size={20} />
            </button>
          )}
          <div className="page-header__titles">
            <h1 className="page-header__title">{title}</h1>
            {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <div className="page-header__action">{action}</div>
        )}
      </div>
    </header>
  );
}