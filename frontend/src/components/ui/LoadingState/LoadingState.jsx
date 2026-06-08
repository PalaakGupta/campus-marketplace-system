import "./LoadingState.css";

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-image" />
      <div className="skeleton-card__body">
        <div className="skeleton skeleton-line skeleton-line--full" />
        <div className="skeleton skeleton-line skeleton-line--half" />
        <div className="skeleton skeleton-line skeleton-line--third" />
      </div>
    </div>
  );
}

function SkeletonListItem() {
  return (
    <div className="skeleton-list-item">
      <div className="skeleton skeleton-thumb" />
      <div className="skeleton-list-item__body">
        <div className="skeleton skeleton-line skeleton-line--full" />
        <div className="skeleton skeleton-line skeleton-line--two-thirds" />
        <div className="skeleton skeleton-line skeleton-line--third" />
      </div>
    </div>
  );
}

export default function LoadingState({ type = 'grid', count = 4 }) {
  return (
    <div className={`loading-state loading-state--${type}`}>
      {Array.from({ length: count }).map((_, i) =>
        type === 'grid' ? (
          <SkeletonCard key={i} />
        ) : (
          <SkeletonListItem key={i} />
        )
      )}
    </div>
  );
}