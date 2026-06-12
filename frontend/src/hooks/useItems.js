import { useState, useEffect, useCallback } from "react";
import { getItems } from "../services/itemService";

export function useItems(params = {}) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [meta, setMeta]       = useState({ total: 0, hasMore: false });

  const fetchItems = useCallback(async (overrideParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getItems({ ...params, ...overrideParams });
      // Handle both array response and paginated envelope
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems(data.data || data.items || []);
        if (data.meta) setMeta(data.meta);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, meta, refetch: fetchItems, setItems };
}