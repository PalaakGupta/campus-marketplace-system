import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiMoreVertical, FiSend,
  FiPaperclip, FiShield,
} from 'react-icons/fi';

import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import {
  getChatHistory,
  getConversations,
  markConversationRead,
  createChatWebSocket,
} from '../../services/chatService';
import './Conversation.css';

export default function Conversation() {
  const { conversationId: id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const pendingSentRef = useRef([]); 

  const userId = localStorage.getItem('user_id');

  // Conversation header info: prefer state passed from Messages list,
  // since the history endpoint only returns raw messages (no metadata).
  const [conversation, setConversation] = useState(location.state?.conversation ?? null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch message history
  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const raw = await getChatHistory(id);
        const list = Array.isArray(raw) ? raw : (raw?.data ?? []);

        if (cancelled) return;
        setMessages(
          list.map((m) => ({
            id: m.id,
            text: m.content,
            fromMe: String(m.sender_id) === String(userId),
            timestamp: m.created_at,
            status: 'sent',
          }))
        );
      } catch (err) {
        console.error('Conversation fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => { cancelled = true; };
  }, [id, userId]);

  useEffect(() => {
    if (conversation) return;
    let cancelled = false;

    const recoverConversation = async () => {
      try {
        const data = await getConversations();
        const list = data?.data ?? data?.conversations ?? data ?? [];
        const found = (Array.isArray(list) ? list : []).find(
          (c) => String(c.id) === String(id)
        );
        if (!cancelled && found) setConversation(found);
      } catch (err) {
        console.error('Conversation recovery error:', err);
      }
    };

    recoverConversation();
    return () => { cancelled = true; };
  }, [conversation, id]);

  // Mark as read on open
  useEffect(() => {
    markConversationRead(id).catch((err) =>
      console.error('Mark read error:', err)
    );
  }, [id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    const ws = createChatWebSocket(id);

    ws.onopen  = () => console.log('WS Connected!');
    ws.onerror = (e) => console.log('WS Error:', e);
    ws.onclose = (e) => console.log('WS Closed:', e.code, e.reason);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const isMine = String(msg.sender_id) === String(userId);

      setMessages((prev) => {
        if (isMine) {
          const pendingIdx = pendingSentRef.current.findIndex(
            (p) => p.text === msg.content
          );
          if (pendingIdx !== -1) {
            const { tempId } = pendingSentRef.current[pendingIdx];
            pendingSentRef.current.splice(pendingIdx, 1);
            return prev.map((m) =>
              m.id === tempId
                ? { ...m, id: msg.message_id, timestamp: msg.created_at, status: 'sent' }
                : m
            );
          }
        }
        return [
          ...prev,
          {
            id: msg.message_id,
            text: msg.content,
            fromMe: isMine,
            timestamp: msg.created_at,
            status: 'sent',
          },
        ];
      });
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [id, userId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      text,
      fromMe: true,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    try {
      setSending(true);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        pendingSentRef.current.push({ tempId, text });
        wsRef.current.send(text);
      } else {
        throw new Error('WebSocket not connected');
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="conversation page">
        <div className="conversation__header">
          <button className="btn-ghost btn-icon"
            onClick={() => navigate('/messages')} type="button">
            <FiArrowLeft size={20} />
          </button>
        </div>
        <div style={{ padding: '16px' }}>
          <LoadingState type="list" count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="conversation page">

      {/* ── Header ── */}
      <div className="conversation__header">
        <button
          className="btn-ghost btn-icon"
          onClick={() => navigate('/messages')}
          type="button"
          aria-label="Back to messages"
        >
          <FiArrowLeft size={20} />
        </button>

        <div className="conversation__user-info">
          <div className="conversation__avatar-wrap">
            <div className="avatar avatar-sm">
              {conversation?.withName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            {conversation?.online && <span className="conversation__online-dot" />}
          </div>
          <div>
            <p className="conversation__name">{conversation?.withName ?? 'Unknown'}</p>
            {conversation?.withRole && (
              <p className="conversation__role">{conversation.withRole}</p>
            )}
          </div>
        </div>

        <button className="btn-icon" type="button" aria-label="More options">
          <FiMoreVertical size={20} />
        </button>
      </div>

      {/* ── Listing Preview ── */}
      {conversation?.listingTitle && (
        <div
          className="conversation__listing-preview"
          onClick={() => navigate(`/item/${id}`)}
        >
          <div className="conversation__listing-image-wrap">
            <div className="conversation__listing-image-placeholder" />
          </div>
          <div className="conversation__listing-info">
            <p className="conversation__listing-title">{conversation.listingTitle}</p>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="conversation__messages">
        {messages.length === 0 && !loading && (
          <div className="conversation__empty">
            <FiShield size={28} />
            <p>Start a conversation about this listing.</p>
            <p className="conversation__empty-sub">
              All messages are between campus community members only.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`conversation__bubble-wrap ${msg.fromMe ? 'conversation__bubble-wrap--me' : ''}`}
          >
            <div className={`conversation__bubble
              ${msg.fromMe ? 'conversation__bubble--me' : 'conversation__bubble--them'}
              ${msg.status === 'failed' ? 'conversation__bubble--failed' : ''}`}
            >
              <p className="conversation__bubble-text">{msg.text}</p>
              <div className="conversation__bubble-meta">
                <span className="conversation__bubble-time">
                  {msg.status === 'sending' ? 'Sending...'
                    : msg.status === 'failed' ? 'Failed'
                    : formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="conversation__input-bar">
        <button className="btn-icon conversation__attach-btn"
          type="button" aria-label="Attach file">
          <FiPaperclip size={18} />
        </button>
        <div className="conversation__input-wrap">
          <textarea
            className="conversation__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>
        <button
          className={`conversation__send-btn ${input.trim() ? 'conversation__send-btn--active' : ''}`}
          onClick={handleSend}
          disabled={!input.trim() || sending}
          type="button"
          aria-label="Send message"
        >
          <FiSend size={16} />
        </button>
      </div>

    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}