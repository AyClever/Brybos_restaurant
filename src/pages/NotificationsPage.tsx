import { useApp } from '../store/AppContext';

export default function NotificationsPage() {
  const { state, dispatch } = useApp();

  const colorMap: Record<string, string> = {
    success: 'var(--success)',
    info: '#17A2B8',
    warning: '#FFC107',
    error: 'var(--danger)',
  };

  const iconMap: Record<string, string> = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div className="page-transition" style={{ paddingTop: '70px', minHeight: '100vh', padding: '90px 2rem 2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--gold)' }}>Notifications</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>
              {state.unreadNotifications > 0 ? `${state.unreadNotifications} unread notifications` : 'All caught up!'}
            </p>
          </div>
          {state.unreadNotifications > 0 && (
            <button className="btn-outline-gold" onClick={() => dispatch({ type: 'MARK_ALL_READ' })} style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
              <i className="fas fa-check-double" style={{ marginRight: '6px' }} /> Mark All Read
            </button>
          )}
        </div>

        {state.notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          state.notifications.map(n => (
            <div
              key={n.id}
              onClick={() => dispatch({ type: 'MARK_NOTIF_READ', payload: n.id })}
              style={{
                background: n.read ? 'var(--dark-2)' : 'rgba(200,155,60,0.06)',
                border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : 'rgba(200,155,60,0.2)'}`,
                borderRadius: '14px', padding: '1.25rem',
                marginBottom: '0.75rem', display: 'flex', gap: '1rem', alignItems: 'flex-start',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,155,60,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = n.read ? 'rgba(255,255,255,0.06)' : 'rgba(200,155,60,0.2)')}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `${colorMap[n.type]}22`, border: `1px solid ${colorMap[n.type]}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                flexShrink: 0,
              }}>
                {iconMap[n.type]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{n.title}</span>
                  {!n.read && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', marginTop: '6px', flexShrink: 0 }} />
                  )}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: '1.5' }}>{n.message}</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: '6px' }}>
                  <i className="fas fa-clock" style={{ marginRight: '4px' }} />
                  {new Date(n.timestamp).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
