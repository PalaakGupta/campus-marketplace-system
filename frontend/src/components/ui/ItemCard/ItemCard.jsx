import { FiHeart, FiShield, FiEye } from "react-icons/fi";
import StatusBadge from '../StatusBadge/StatusBadge';
import './ItemCard.css';

export default function ItemCard({
  item,
  onView,
  onSave,
  isSaved = false,
  layout = "grid",
}) {
  const handleSave = (e) => {
    e.stopPropagation();
    onSave?.(item.id);
  };

  if (layout === "list") {
    return (
      <div className="item-card item-card--list card card-hover" onClick={() => onView?.(item)}>
        <div className="item-card__list-image-wrap">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="item-card__list-image" />
          ) : (
            <div className="item-card__image-placeholder" />
          )}
        </div>
        <div className="item-card__list-body">
          <div className="item-card__list-top">
            <p className="item-card__title">{item.title}</p>
            <StatusBadge status={item.status} size="sm" />
          </div>
          <p className="item-card__price">₹{Number(item.price).toLocaleString()}</p>
          <div className="item-card__meta">
            <span className="item-card__condition">{item.condition}</span>
            <span className="item-card__dot">·</span>
            <span className="item-card__seller">{item.sellerName}</span>
            {item.sellerVerified && <FiShield size={11} className="item-card__verified" />}
          </div>
        </div>
        <button
          className={`item-card__save btn-icon ${isSaved ? 'item-card__save--active' : ''}`}
          onClick={handleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save item'}
        >
          <FiHeart size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="item-card item-card--grid card card-hover" onClick={() => onView?.(item)}>
      <div className="item-card__image-wrap">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="item-card__image" />
        ) : (
          <div className="item-card__image-placeholder" />
        )}
        <div className="item-card__badges-top">
          <StatusBadge status={item.status} size="sm" />
        </div>
        <button
          className={`item-card__save item-card__save--overlay btn-icon ${isSaved ? 'item-card__save--active' : ''}`}
          onClick={handleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save item'}
        >
          <FiHeart size={15} />
        </button>
        {item.channel === "thrift Store" && (
          <span className="item-card__thrift-badge">THRIFT</span>
        )}
      </div>
      <div className="item-card__body">
        <p className="item-card__title">{item.title}</p>
        <div className="item-card__price-row">
          <span className="item-card__price">₹{Number(item.price).toLocaleString()}</span>
          <span className="item-card__condition">{item.condition}</span>
        </div>
        <div className="item-card__footer">
          <div className="item-card__seller-row">
            <div className="avatar avatar-sm">{item.sellerName?.charAt(0) ?? "?"}</div>
            <span className="item-card__seller">{item.sellerName}</span>
            {item.sellerVerified && <FiShield size={11} className="item-card__verified" />}
          </div>
          {item.viewCount !== undefined && (
            <span className="item-card__views">
              <FiEye size={11} /> {item.viewCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}