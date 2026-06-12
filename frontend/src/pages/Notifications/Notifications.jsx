import { useState, useEffect } from "react";
import { FiBell, FiCheckCircle, FiShoppingBag, FiMessageCircle, FiTag } from "react-icons/fi";
import PageHeader from "../../components/layout/PageHeader/PageHeader";
import LoadingState from "../../components/ui/LoadingState/LoadingState";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import  {markNotificationsRead, getNotifications } from "../../services/userService";
import "./Notifications.css";

const NOTIF_ICONS = {
  purchase_received:  FiShoppingBag,
  delivery_confirmed: FiCheckCircle,
  payment_released:   FiCheckCircle,
  payment_refunded:   FiTag,
  item_reserved:      FiTag,
  new_message:        FiMessageCircle,
  listing_sold:       FiTag,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [error, setError]                 = useState(null);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        setLoading(true);
        const data = await getNotifications();
        const list = data.notifications || data.data || [];
        setNotifications(list);
        setUnreadCount(data.unread_count || 0);
      } catch (err) {
        setNotifications([]);
        setUnreadCount(0);
        setError(null); 
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  return (
    <div className="notifications page anim-fade-in">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        action={
          unreadCount > 0 ? (
            <button
              className="btn-ghost"
              onClick={handleMarkAllRead}
              style={{ fontSize: 13, color: "var(--color-blue)", fontWeight: 600 }}
              type="button"
            >
              Mark all read
            </button>
          ) : null
        }
      />

      <div className="notifications__body">
        {loading ? (
          <LoadingState type="list" count={4} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={FiBell}
            title="No notifications yet"
            description="Purchase updates, payment releases, and messages will appear here."
          />
        ) : (
          <div className="notifications__list">
            {notifications.map((notif) => {
              const Icon = NOTIF_ICONS[notif.notification_type] ?? FiBell;
              return (
                <div
                  key={notif.id}
                  className={`notifications__item card ${!notif.is_read ? "notifications__item--unread" : ""}`}
                >
                  <div className={`notifications__icon ${!notif.is_read ? "notifications__icon--unread" : ""}`}>
                    <Icon size={18} />
                  </div>
                  <div className="notifications__content">
                    <p className="notifications__title">{notif.title}</p>
                    <p className="notifications__message">{notif.message}</p>
                    <p className="notifications__time">
                      {notif.created_at
                        ? new Date(notif.created_at).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  {!notif.is_read && <div className="notifications__unread-dot" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}