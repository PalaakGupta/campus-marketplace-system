import API from "./api";

/**
 * GET /users/me
 * Returns full profile of authenticated user.
 */
export async function getMyProfile() {
    const response = await API.get("/users/me");
    return response.data.data ?? response.data;
}

/**
 * GET /users/{user_id}
 * Get any user's public profile.
 */
export async function getUserById(userId) {
    const response = await API.get(`/users/${userId}`);
    return response.data.data ?? response.data;
}

/**
 * GET /notifications
 * Get notifications list with unread count.
 */
export async function getNotifications(page = 1, unreadOnly = false) {
    const response = await API.get("/notifications", {
       params: { page, page_size: 20, unread_only: unreadOnly }
    });
    return response.data.data ?? response.data;
}

/**
 * PATCH /notifications/read
 * Mark all notifications as read.
 */
export async function markNotificationsRead() {
    const response = await API.patch("/notifications/read");
    return response.data.data ?? response.data;
}

/**
 * GET /profile/me
 * Full profile with wallet balance and stats in one call.
 */
export async function getFullProfile() {
    const response = await API.get("/profile/me");
    return response.data.data ?? response.data;
}