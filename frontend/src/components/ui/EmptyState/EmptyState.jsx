import "./EmptyState.css";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}) {
  return (
    <div className="empty-state anim-fade-in">
      <div className="empty-state__icon-wrap">
        {Icon && <Icon size={36} />}
      </div>
      <p className="empty-state__title">{title}</p>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && actionLabel && (
        <button className="btn btn-primary btn-inline btn-sm" onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}