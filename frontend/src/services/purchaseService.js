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
 * POST /transactions/confirm-delivery
 * Buyer confirms delivery — releases funds to seller.
 */
export async function confirmDelivery(holdingRecordId) {
    const buyerId = localStorage.getItem("user_id");
    const response = await API.post("/transactions/confirm-delivery", {
        holding_record_id: holdingRecordId,
        buyer_id: buyerId,
    });
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