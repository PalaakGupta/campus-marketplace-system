import { useState, useEffect } from 'react';
import { getConversations } from '../../services/chatService';
import { useNavigate } from 'react-router-dom';

import { FiMessageCircle } from 'react-icons/fi';
import PageHeader from '../../components/layout/PageHeader/PageHeader';
import SearchBar from '../../components/ui/SearchBar/SearchBar';
import LoadingState from '../../components/ui/LoadingState/LoadingState';
import EmptyState from '../../components/ui/EmptyState/EmptyState';
import './Messages.css';

function formatRelativeTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

export default function Messages() {
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const data = await getConversations();
        const conversationsData =
          data?.data ??
          data?.conversations ??
          data ??
          [];
        setConversations(Array.isArray(conversationsData) ? conversationsData : []);
      } catch (err) {
        console.error('Messages fetch error:', err);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.withName ?? '').toLowerCase().includes(q) ||
      (c.listingTitle ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="messages page anim-fade-in">
      <PageHeader title="Messages" subtitle="Your listing conversations" />

      <div className="messages__body">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search conversations..."
        />

        <div className="messages__list">
          {loading ? (
            <LoadingState type="list" count={4} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FiMessageCircle}
              title={search ? 'No results' : 'No messages yet'}
              description={
                search
                  ? 'No conversations match your search.'
                  : 'Messages appear when someone contacts you about a listing.'
              }
            />
          ) : (
            filtered.map((convo) => (
              <button
                key={convo.id}
                className={`messages__convo-btn ${convo.unreadCount > 0 ? 'messages__convo-btn--unread' : ''}`}
                onClick={() =>
                  navigate(`/messages/${convo.id}`, { state: { conversation: convo } })
                }
                type="button"
              >
                {/* Avatar */}
                <div className="messages__avatar-wrap">
                  <div className="avatar avatar-md">
                    {convo.withName?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  {convo.online && <span className="messages__online-dot" />}
                </div>

                {/* Info */}
                <div className="messages__convo-info">
                  <div className="messages__convo-top">
                    <div className="messages__convo-name-row">
                      <p className="messages__convo-name">{convo.withName ?? 'Unknown'}</p>
                      {convo.withRole && (
                        <span className="messages__convo-role">{convo.withRole}</span>
                      )}
                    </div>
                    <div className="messages__convo-right">
                      <span className="messages__convo-time">
                        {formatRelativeTime(convo.lastMessageTime)}
                      </span>
                      {convo.unreadCount > 0 && (
                        <span className="badge-count messages__unread-badge">{convo.unreadCount}</span>
                      )}
                    </div>
                  </div>
                  <p className="messages__convo-preview">
                    {convo.listingTitle && (
                      <span className="messages__convo-listing">{convo.listingTitle}</span>
                    )}
                    {convo.listingTitle && convo.lastMessage ? ' · ' : ''}
                    {convo.lastMessage}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}