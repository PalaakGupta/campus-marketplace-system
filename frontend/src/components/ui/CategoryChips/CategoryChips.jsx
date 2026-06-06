import './CategoryChips.css';

export default function CategoryChips({
  categories,
  active,
  onSelect,
  scrollable = true,
}) {
  return (
    <div className={`category-chips ${scrollable ? 'hide-scrollbar' : ''}`}>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`chip ${active === cat.id ? 'active' : ''}`}
          onClick={() => onSelect(cat.id)}
          type="button"
        >
          {cat.icon && <span>{cat.icon}</span>}
          {cat.label}
        </button>
      ))}
    </div>
  );
}