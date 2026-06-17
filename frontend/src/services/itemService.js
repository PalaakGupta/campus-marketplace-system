import API from "./api";

/**
 * GET /items
 * Optional query params for filtering.
 */
export async function getItems(params = {}) {
  const response = await API.get("/items", { params });
  return response.data.data ?? response.data;
}

/**
 * GET /items/{item_id}
 */
export async function getItemById(itemId) {
  const response = await API.get(`/items/${itemId}`);
  return response.data.data ?? response.data;
}

/**
 * POST /items
 * Create a new listing. seller_id injected from localStorage.
 */
export async function createItem(itemData) {
  const sellerId = localStorage.getItem("user_id"); 

  try {
    const response = await API.post(`/items/`, itemData, {
      params: { seller_id: sellerId }  
    });
    return response.data;
  } catch (err) {
    console.log("FASTAPI ERROR =", err.response?.data);
    throw err;
  }
}
/**
 * PATCH /items/{item_id}
 * Edit an existing listing.
 */
export async function updateItem(itemId, itemData) {
  const response = await API.patch(`/items/${itemId}`, itemData);
  return response.data.data ?? response.data;
}

/**
 * DELETE /items/{item_id}
 */
export async function deleteItem(itemId) {
  const response = await API.delete(`/items/${itemId}`);
  return response.data.data ?? response.data;
}

/**
 * PATCH /items/{item_id}/status
 * Seller manually changes status (e.g. available → sold).
 */
export async function updateItemStatus(itemId, newStatus) {
  const response = await API.patch(`/items/${itemId}/status`, {
    status: newStatus,
  });
  return response.data.data ?? response.data;
}

/**
 * POST /items/{item_id}/save
 * Save item to wishlist.
 */
export async function saveItem(itemId) {
  const response = await API.post(`/items/${itemId}/save`);
  return response.data.data ?? response.data;
}

/**
 * DELETE /items/{item_id}/save
 * Remove item from wishlist.
 */
export async function unsaveItem(itemId) {
  const response = await API.delete(`/items/${itemId}/save`);
  return response.data.data ?? response.data;
}

/**
 * GET /items/saved
 * Get all saved items for current user.
 */
export async function getSavedItems() {
  const response = await API.get("/items/saved");
  return response.data.data ?? response.data;
}

/**
 * POST /items/{item_id}/view
 * Increment view count. Call on item detail mount.
 */
export async function incrementView(itemId) {
  const response = await API.post(`/items/${itemId}/view`);
  return response.data.data ?? response.data;
}

/**
 * GET /items/me
 * Get current user's listings with stats.
 */
export async function getMyListings(statusFilter = null) {
  const params = statusFilter ? { status: statusFilter } : {};
  const response = await API.get("/items/me", { params });
  return response.data.data ?? response.data;
}