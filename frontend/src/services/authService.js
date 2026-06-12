import API from "./api";

/**
 * POST /users/login
 * Accepts login_id (not roll number) + password.
 * Stores access_token, user_id, name, login_id in localStorage on success.
 */
export async function login(loginId, password) {
    const response = await API.post("/users/login", {
        login_id: loginId,
        password: password,
    });

    const data = response.data.data;

    // Store auth data
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user_id", data.user_id);
    localStorage.setItem("name", data.name);
    localStorage.setItem("login_id", data.login_id);

    return data;
}

/**
 * POST /users/change-password
 */
export async function changePassword(currentPassword, newPassword) {
    const userId = localStorage.getItem("user_id");
    const response = await API.post("/users/change-password", {
        user_id: userId,
        old_password: currentPassword,
        new_password: newPassword,
    });
    return response.data.data ?? response.data;
}

/**
 * Clear all auth data and redirect to login.
 */
export function logout() {
    localStorage.clear();
    window.location.href = "/login";
}

/**
 * Returns true if a token exists in localStorage.
 */
export function isAuthenticated() {
    return Boolean(localStorage.getItem("token"));
}

/**
 * Returns stored user object from localStorage.
 */
export function getStoredUser() {
    return {
        userId: localStorage.getItem("user_id"),
        name: localStorage.getItem("name"),
        loginId: localStorage.getItem("login_id"),
        token: localStorage.getItem("token"),
    };
}