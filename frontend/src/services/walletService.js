import API from "./api";

/**
 * GET /wallet/summary
 * Returns available balance, held balance, and active holds.
 */
export async function getWalletSummary() {
    const response = await API.get("/wallet/summary");
    return response.data.data ?? response.data;
}

/**
 * GET /wallet/{user_id}
 * Legacy balance endpoint — use getWalletSummary when possible.
 */
export async function getWalletByUserId(userId) {
    const response = await API.get(`/wallet/${userId}`);
    return response.data.data ?? response.data;
}

/**
 * POST /wallet/{user_id}/topup
 * Add funds to wallet.
 */
export async function topUpWallet(amount) {
    const userId = localStorage.getItem("user_id");
    const response = await API.post(`/wallet/${userId}/topup`, { amount });
    return response.data.data ?? response.data;
}

/**
 * GET /wallet/transactions
 * Paginated transaction history. type: purchase | release | refund
 */
export async function getTransactions(type = null, page = 1, pageSize = 20) {
    const params = { page, pageSize };
    if (type && type !== "all") params.type = type;
    const response = await API.get("/wallet/transactions", { params });
    return response.data.data ?? response.data;
}

/**
 * GET /transactions/holding-records/{user_id}
 * Active holding records — used by Dashboard.
 */
export async function getHoldingRecords() {
    const userId = localStorage.getItem("user_id");
    const response = await API.get(`/transactions/holding-records/${userId}`);
    return response.data.data ?? response.data;
}