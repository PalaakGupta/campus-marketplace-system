import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiMoreVertical, FiSend,
  FiPaperclip, FiShield,
} from 'react-icons/fi';

import StatusBadge from '../../components/ui/StatusBadge/StatusBadge';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import { getChatHistory, createChatWebSocket } from '../../services/chatService';
import './Conversation.css';

export default function Conversation() {
  const { conversationId: id } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch chat history
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        const data = await getChatHistory(id);
        const responseData = data?.data ?? data;
        setConversation(responseData?.conversation ?? null);
        setMessages(
          (responseData?.messages ?? []).map(m => ({
            ...m,
            text:      m.content ?? m.text,
            fromMe:    m.is_from_me ?? false,
            timestamp: m.created_at ?? m.timestamp,
          }))
        );
      } catch (err) {
        console.error('Conversation fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversation();
  }, [id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    const ws = createChatWebSocket(id);

    ws.onopen  = () => console.log("WS Connected!");
    ws.onerror = (e) => console.log("WS Error:", e);
    ws.onclose = (e) => console.log("WS Closed:", e.code, e.reason);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setMessages(prev => [
        ...prev,
        {
          id:        msg.message_id,
          text:      msg.content,
          fromMe:    msg.sender_id === localStorage.getItem("user_id"),
          timestamp: msg.created_at,
        }
      ]);
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const optimistic = {
      id:        `temp-${Date.now()}`,
      text,
      fromMe:    true,
      timestamp: new Date().toISOString(),
      status:    'sending',
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    try {
      setSending(true);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(text);
        setMessages((prev) =>
          prev.map((m) => m.id === optimistic.id ? { ...m, status: 'sent' } : m)
        );
      } else {
        throw new Error("WebSocket not connected");
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m.id === optimistic.id ? { ...m, status: 'failed' } : m)
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
              {conversation?.withName?.charAt(0) ?? '?'}
            </div>
            {conversation?.online && <span className="conversation__online-dot" />}
          </div>
          <div>
            <p className="conversation__name">{conversation?.withName ?? '—'}</p>
            <p className="conversation__role">{conversation?.withRole}</p>
          </div>
        </div>

        <button className="btn-icon" type="button" aria-label="More options">
          <FiMoreVertical size={20} />
        </button>
      </div>

      {/* ── Listing Preview ── */}
      {conversation?.listing && (
        <div
          className="conversation__listing-preview"
          onClick={() => navigate(`/item/${conversation.listing.id}`)}
        >
          <div className="conversation__listing-image-wrap">
            {conversation.listing.imageUrl
              ? <img src={conversation.listing.imageUrl}
                  alt={conversation.listing.title}
                  className="conversation__listing-image" />
              : <div className="conversation__listing-image-placeholder" />
            }
          </div>
          <div className="conversation__listing-info">
            <p className="conversation__listing-title">{conversation.listing.title}</p>
            <p className="conversation__listing-price">
              ₹{Number(conversation.listing.price).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={conversation.listing.status} size="sm" />
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