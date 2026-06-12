import { useState, useEffect, useCallback } from "react";
import { getWalletSummary } from "../services/walletService";

export function useWallet() {
  const [wallet, setWallet]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWalletSummary();
      setWallet(data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return { wallet, loading, error, refetch: fetchWallet };
}