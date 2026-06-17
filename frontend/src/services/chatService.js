import API from "./api";

export async function getChatHistory(itemId) {
    const userId = localStorage.getItem("user_id");
    const response = await API.get(`/chat/${itemId}/history`, {
        params: { user_id: userId },
    });
    return response.data.data ?? response.data;
}

export async function getConversations() {
    const userId = localStorage.getItem("user_id");
    const response = await API.get(`/chat/conversations`, {
        params: { user_id: userId }
    });
    return response.data?.data ?? response.data;
}

export async function getConversationById(conversationId) {
    const response = await API.get(`/chat/conversations/${conversationId}`);
    return response.data.data ?? response.data;
}

export async function markConversationRead(conversationId) {
    const response = await API.patch(`/chat/${conversationId}/read`);
    return response.data.data ?? response.data;
}

export function createChatWebSocket(itemId) {
    const userId = localStorage.getItem("user_id");
    const wsBase = (import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000");
    const url = `${wsBase}/chat/ws/${itemId}?sender_id=${userId}`;
    return new WebSocket(url);
}