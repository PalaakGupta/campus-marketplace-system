import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiGrid, FiList, FiFilter, FiShoppingBag } from 'react-icons/fi';
import SearchBar from '../../components/ui/SearchBar/SearchBar';
import CategoryChips from '../../components/ui/CategoryChips/CategoryChips';
import ItemCard from '../../components/ui/ItemCard/ItemCard';
import TabBar from '../../components/ui/TabBar/TabBar';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import './Marketplace.css';

const CATEGORIES = [
  { id: 'All',           label: 'All' },
  { id: 'Electronics',   label: 'Electronics' },
  { id: 'Books',         label: 'Books' },
  { id: 'Lab Equipment', label: 'Lab Equipment' },
  { id: 'Furniture',     label: 'Furniture' },
  { id: 'Clothing',      label: 'Clothing' },
  { id: 'Sports',        label: 'Sports' },
  { id: 'Other',         label: 'Other' },
];

const CHANNEL_TABS = [
  { id: 'All',         label: 'All Channels' },
  { id: 'Marketplace', label: 'Marketplace' },
  { id: 'Thrift Store',label: 'Thrift Store' },
];

export default function Marketplace() {
  const navigate = useNavigate();

  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeChannel, setActiveChannel]   = useState('All');
  const [viewMode, setViewMode]         = useState('grid');
  const [savedItems, setSavedItems]     = useState(new Set());
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(false);


  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
 
    } catch (err) {
      console.error('Marketplace fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory, activeChannel, page]);

  useEffect(() => {
    const debounce = setTimeout(fetchItems, 300);
    return () => clearTimeout(debounce);
  }, [fetchItems]);

  const handleSave = (itemId) => {
    setSavedItems((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const handleView = (item) => navigate(`/item/${item.id}`);

  const resultCount = items.length;

  return (
    <div className="marketplace page">
      {/* ── Sticky Header ── */}
      <div className="marketplace__header">
        <div className="marketplace__header-top">
          <h1 className="marketplace__title">Marketplace</h1>
          <div className="marketplace__header-actions">
            <button
              className="btn-icon"
              onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
              aria-label="Toggle view"
              type="button"
            >
              {viewMode === 'grid' ? <FiList size={19} /> : <FiGrid size={19} />}
            </button>
            <button
              className="btn-icon"
              aria-label="Filters"
              type="button"
            >
              <FiFilter size={19} />
            </button>
          </div>
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search items, sellers..."
          showFilter={false}
        />

        <div className="marketplace__channels hide-scrollbar">
          <TabBar
            tabs={CHANNEL_TABS}
            activeTab={activeChannel}
            onTabChange={setActiveChannel}
            scrollable
          />
        </div>

        <div className="marketplace__categories hide-scrollbar">
          <CategoryChips
            categories={CATEGORIES}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="marketplace__body">
        {!loading && (
          <p className="marketplace__result-count">
            <strong>{resultCount}</strong> {resultCount === 1 ? 'item' : 'items'} found
          </p>
        )}

        {loading ? (
          <LoadingState type={viewMode} count={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FiShoppingBag}
            title="No items found"
            description={
              search
                ? `No results for "${search}". Try a different keyword.`
                : 'No items in this category yet. Check back soon.'
            }
            action={search ? () => setSearch('') : undefined}
            actionLabel={search ? 'Clear Search' : undefined}
          />
        ) : viewMode === 'grid' ? (
          <div className="marketplace__grid">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                layout="grid"
                onView={handleView}
                onSave={handleSave}
                isSaved={savedItems.has(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="marketplace__list">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                layout="list"
                onView={handleView}
                onSave={handleSave}
                isSaved={savedItems.has(item.id)}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <button
            className="btn btn-secondary btn-inline marketplace__load-more"
            onClick={() => setPage(p => p + 1)}
            type="button"
          >
            Load More
          </button>
        )}
      </div>
    </div>
  );
}
