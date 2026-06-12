import API from "./api";

/**
 * GET /chat/{itemId}/history
 * Fetch existing message history for a listing conversation.
 */
export async function getChatHistory(itemId) {
    const userId = localStorage.getItem("user_id");
    const response = await API.get(`/chat/${itemId}/history`, {
        params: { user_id: userId },
    });
    return response.data.data ?? response.data;
}

/**
 * GET /conversations
 * Get all conversations for current user.
 */
export async function getConversations() {
    const response = await API.get("/chat/conversations");
    return response.data.data ?? response.data;
}

/**
 * GET /conversations/{id}
 * Single conversation with messages.
 */
export async function getConversationById(conversationId) {
    const response = await API.get(`/chat/conversations/${conversationId}`);
    return response.data.data ?? response.data;
}

/**
 * PATCH /chat/conversations/{id}/read
 * Mark all messages in conversation as read.
 */
  export async function markConversationRead(conversationId) {
    const response = await API.patch(
        `/chat/${conversationId}/read`
    );
    return response.data.data ?? response.data;
}

/**
 * createChatWebSocket
 * Returns a configured WebSocket for real-time messaging.
 * ws://localhost:8000/chat/ws/{itemId}?sender_id={userId}
 */
export function createChatWebSocket(itemId) {
    const userId = localStorage.getItem("user_id");
    const wsBase = (import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000");
    const url = `${wsBase}/chat/ws/${itemId}?sender_id=${userId}`;
    return new WebSocket(url);
}