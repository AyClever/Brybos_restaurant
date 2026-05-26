import { useApp } from '../store/AppContext';
import { useEffect, useState } from 'react';

interface Toast {
  id: string;
  type: string;
  title: string;
  message: string;
}

export default function NotificationToast() {
  const { state } = useApp();
  const [visibleToasts, setVisibleToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const latest = state.notifications[0];
    if (!latest) return;

    setVisibleToasts(prev => {
      if (prev.find(t => t.id === latest.id)) return prev;
      return [{ id: latest.id, type: latest.type, title: latest.title, message: latest.message }, ...prev].slice(0, 3);
    });

    const timer = setTimeout(() => {
      setVisibleToasts(prev => prev.filter(t => t.id !== latest.id));
    }, 5000);

    return () => clearTimeout(timer);
  }, [state.notifications]);

  if (visibleToasts.length === 0) return null;

  const iconMap: Record<string, string> = {
    success: '✓',
    info: 'ℹ',
    warning: '⚠',
    error: '✗',
  };

  const colorMap: Record<string, string> = {
    success: 'var(--success)',
    info: '#17A2B8',
    warning: '#FFC107',
    error: 'var(--danger)',
  };

  return (
    <div className="notification-bubble">
      {visibleToasts.map(toast => (
        <div key={toast.id} className="notif-item">
          <div
            className="notif-icon"
            style={{ background: `${colorMap[toast.type]}22`, color: colorMap[toast.type] }}
          >
            {iconMap[toast.type]}
          </div>
          <div className="notif-content">
            <div className="notif-title">{toast.title}</div>
            <div className="notif-msg">{toast.message}</div>
          </div>
          <button
            onClick={() => setVisibleToasts(prev => prev.filter(t => t.id !== toast.id))}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      ))}
    </div>
  );
}
