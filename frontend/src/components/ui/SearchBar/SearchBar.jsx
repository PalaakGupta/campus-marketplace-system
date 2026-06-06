import { useState } from 'react';
import { FiSearch, FiX, FiSliders } from 'react-icons/fi';
import './SearchBar.css';

export default function SearchBar({
  value,
  onChange,
  onClear,
  onFilter,
  placeholder = '',
  showFilter = false,
  autoFocus = false,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`search-bar ${focused ? 'search-bar--focused' : ''}`}>
      <FiSearch size={17} className="search-bar__icon" />
      <input
        className="search-bar__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
      />
      {value && (
        <button
          className="search-bar__clear btn-icon"
          onClick={() => { onChange(''); onClear?.(); }}
          aria-label="Clear search"
          type="button"
        >
          <FiX size={15} />
        </button>
      )}
      {showFilter && (
        <button
          className="search-bar__filter btn-icon"
          onClick={onFilter}
          aria-label="Open filters"
          type="button"
        >
          <FiSliders size={16} />
        </button>
      )}
    </div>
  );
}