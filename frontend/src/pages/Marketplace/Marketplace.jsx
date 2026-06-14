import { useState, useEffect, useCallback,useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiGrid, FiList, FiFilter, FiShoppingBag } from 'react-icons/fi';
import SearchBar from '../../components/ui/SearchBar/SearchBar';
import CategoryChips from '../../components/ui/CategoryChips/CategoryChips';
import ItemCard from '../../components/ui/ItemCard/ItemCard';
import TabBar from '../../components/ui/TabBar/TabBar';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import { getItems, saveItem, unsaveItem } from "../../services/itemService";
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
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'thrift Store',label: 'Thrift Store' },
];

export default function Marketplace() {
  const navigate = useNavigate();

  const [items, setItems]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeChannel, setActiveChannel]   = useState("All");
  const [viewMode, setViewMode]             = useState("grid");
  const [savedItems, setSavedItems]         = useState(new Set());
  const [page, setPage]                     = useState(1);
  const [hasMore, setHasMore]               = useState(false);
  const [total, setTotal]                   = useState(0);

  const debounceRef = useRef(null);

  const fetchItems = useCallback(async (
    searchVal, category, channel, pageNum, append = false
  ) => {
    try {
      if (append) setLoadingMore(true);
      else        setLoading(true);

      const params = {
        page:     pageNum,
        pageSize: 20,
      };
      if (searchVal)                          params.search   = searchVal;
      if (category && category !== "All")     params.category = category;
      if (channel  && channel  !== "All")     params.channel  = channel;

      const data = await getItems(params);

      // Handle both array and paginated envelope
      let newItems = [];
      if (Array.isArray(data)) {
        newItems = data;
        setTotal(data.length);
        setHasMore(false);
      } else {
        newItems = data.data || data.items || [];
        setTotal(data.meta?.total ?? newItems.length);
        setHasMore(data.meta?.has_more ?? data.meta?.hasMore ?? false);
      }

      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
    } catch (err) {
      console.error("Marketplace fetch error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchItems(search, activeCategory, activeChannel, 1, false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, activeCategory, activeChannel, fetchItems]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchItems(search, activeCategory, activeChannel, nextPage, true);
  };

  const handleSave = async (itemId) => {
    const wasSaved = savedItems.has(itemId);
    setSavedItems((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(itemId) : next.add(itemId);
      return next;
    });
    try {
      if (wasSaved) await unsaveItem(itemId);
      else          await saveItem(itemId);
    } catch {
      setSavedItems((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(itemId) : next.delete(itemId);
        return next;
      });
    }
  };

  const normalizeItem = (item) => ({
    ...item,
    imageUrl:       item.image_url       || item.imageUrl,
    sellerName:     item.seller_name     || item.sellerName     || "Unknown",
    sellerVerified: item.seller_verified ?? item.sellerVerified ?? false,
    savedCount:     item.saved_count     ?? item.savedCount     ?? 0,
    viewCount:      item.view_count      ?? item.viewCount      ?? 0,
  });

  const resultCount = items ? items.length : 0;

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
            onTabChange={(val) => { setActiveChannel(val); setPage(1); }}
            scrollable
          />
        </div>

        <div className="marketplace__categories hide-scrollbar">
          <CategoryChips
            categories={CATEGORIES}
            active={activeCategory}
            onSelect={(val) => { setActiveChannel(val); setPage(1); }}
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
                item={normalizeItem(item)}
                layout="grid"
                onView={(item) => navigate(`/item/${item.id}`)}
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
                item={normalizeItem(item)}
                layout="list"
                onView={(item) => navigate(`/item/${item.id}`)}
                onSave={handleSave}
                isSaved={savedItems.has(item.id)}
              />
            ))}
          </div>
        )}

        {hasMore && !loading && (
          <button
            className="btn btn-secondary btn-inline marketplace__load-more"
            onClick={handleLoadMore}
            disabled={loadingMore}
            type="button"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
}
