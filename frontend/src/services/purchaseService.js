import API from "./api";

/**
 * POST /transactions/purchase
 * Initiate a purchase — moves funds to holding vault.
 */
export async function purchaseItem(itemId) {
    const buyerId = localStorage.getItem("user_id");
    const response = await API.post("/transactions/purchase", {
        buyer_id: buyerId,
        item_id: itemId,
    });
    return response.data.data ?? response.data;
}

/**
 * POST /delivery/confirm/{purchase_id}
 * Buyer confirms delivery — releases funds to seller.
 */
export async function confirmDelivery(purchaseId) {
    const response = await API.post(`/delivery/confirm/${purchaseId}`);
    return response.data.data ?? response.data;
}

/**
 * GET /purchases/me
 * All purchases for current user with optional status filter.
 */
export async function getMyPurchases(paymentStatus = null, page = 1) {
    const params = { page, pageSize: 20 };
    if (paymentStatus && paymentStatus !== "all") {
        params.paymentStatus = paymentStatus;
    }
    const response = await API.get("/purchases/me", { params });
    return response.data.data ?? response.data;
}