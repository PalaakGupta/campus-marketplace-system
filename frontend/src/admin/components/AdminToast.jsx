import { useState, useCallback } from "react";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle, FiX } from "react-icons/fi";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3800);
  }, []);

  const dismiss = (id) => setToasts((p) => p.filter((t) => t.id !== id));

  return { toasts, toast, dismiss };
}

const ICONS = {
  success: <FiCheckCircle size={16} color="#059669" />,
  error:   <FiAlertCircle size={16} color="#dc2626" />,
  info:    <FiInfo size={16} color="#4f46e5" />,
  amber:   <FiAlertTriangle size={16} color="#d97706" />,
};

export function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="ad-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`ad-toast ad-toast--${t.type}`}>
          {ICONS[t.type] || ICONS.info}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button className="ad-btn--ghost" style={{ padding: 2 }} onClick={() => dismiss(t.id)}>
            <FiX size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}