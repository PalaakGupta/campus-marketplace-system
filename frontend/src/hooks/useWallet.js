import { useState, useEffect, useCallback } from "react";
import { getWalletSummary } from "../services/walletService";

export function useWallet() {
  const [wallet, setWallet] = useState({
    available_balance: 0,
    held_balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
    const response = await getWalletSummary();
    setWallet(
      response?.data ??
      response ?? {
        available_balance: 0,
        held_balance: 0,
      }
    );
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