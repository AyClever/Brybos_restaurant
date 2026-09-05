import { useState } from 'react';
import { useApp } from '../store/AppContext';

type Section = 'dashboard' | 'new' | 'processing' | 'history' | 'notifications';

export default function SalesRepDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { state, dispatch, addNotification } = useApp();
  const [section, setSection] = useState<Section>('dashboard');

  const myOrders = state.orders;
  const newOrders = myOrders.filter(o => o.status === 'pending');
  const processingOrders = myOrders.filter(o => ['confirmed', 'preparing', 'approved'].includes(o.status));
  const readyOrders = myOrders.filter(o => o.status === 'approved' && !o.riderId);
  const historyOrders = myOrders.filter(o => ['assigned', 'onway', 'delivered', 'cancelled'].includes(o.status));

  const handleApprove = (orderId: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: 'approved' } });
    const order = myOrders.find(o => o.id === orderId);
    addNotification('success', 'Order Approved', `Order ${order?.orderNumber} approved. Notifying kitchen!`);
  };

  const handleConfirm = (orderId: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: 'confirmed' } });
    addNotification('info', 'Order Confirmed', `Order confirmed and sent to kitchen`);
  };

  const handlePreparing = (orderId: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: 'preparing' } });
    addNotification('info', 'Kitchen Notified', `Kitchen is now preparing the order`);
  };

  const handleReject = (orderId: string) => {
    dispatch({ type: 'CANCEL_ORDER', payload: orderId });
    addNotification('warning', 'Order Rejected', `Order cancelled and customer notified`);
  };

  const sidebarItems = [
    { key: 'dashboard' as Section, label: 'Dashboard', icon: '📊' },
    { key: 'new' as Section, label: 'New Orders', icon: '🔔', badge: newOrders.length },
    { key: 'processing' as Section, label: 'Processing', icon: '👨‍🍳', badge: processingOrders.length },
    { key: 'history' as Section, label: 'Order History', icon: '📋' },
    { key: 'notifications' as Section, label: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <img src="/brybos-logo.png" alt="BRYBOS" />
          <div>
            <div className="sidebar-brand">BRYBOS</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Sales Rep</div>
          </div>
        </div>
        <div className="sidebar-nav">
          {sidebarItems.map(item => (
            <div key={item.key} className={`sidebar-item ${section === item.key ? 'active' : ''}`} onClick={() => setSection(item.key)}>
              <span className="icon">{item.icon}</span>
              {item.label}
              {item.badge !== undefined && item.badge > 0 && <span className="sidebar-badge danger">{item.badge}</span>}
            </div>
          ))}
          <div className="sidebar-section">Account</div>
          <div className="sidebar-item" onClick={() => onNavigate('home')}><span className="icon">🏠</span> Back to Site</div>
          <div className="sidebar-item" onClick={() => { dispatch({ type: 'SET_USER', payload: null }); onNavigate('home'); }}><span className="icon">🚪</span> Logout</div>
        </div>
      </div>

      {/* Main */}
      <div className="dashboard-main">
        <div className="dashboard-topbar">
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize' }}>{section === 'new' ? 'New Orders' : section === 'processing' ? 'Processing Orders' : section}</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Sales Representative Dashboard</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{state.user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>Sales Rep</div>
            </div>
            <div className="avatar">{state.user?.name?.charAt(0)}</div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* ===== DASHBOARD ===== */}
          {section === 'dashboard' && (
            <div className="tab-panel">
              <div className="stat-cards">
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(255,193,7,0.1)' }}>🔔</div>
                  <div className="stat-card-value" style={{ color: '#FFC107' }}>{newOrders.length}</div>
                  <div className="stat-card-label">New Orders</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(23,162,184,0.1)' }}>👨‍🍳</div>
                  <div className="stat-card-value">{processingOrders.length}</div>
                  <div className="stat-card-label">Processing</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(200,155,60,0.1)' }}>👍</div>
                  <div className="stat-card-value">{readyOrders.length}</div>
                  <div className="stat-card-label">Ready for Pickup</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(40,167,69,0.1)' }}>📦</div>
                  <div className="stat-card-value">{historyOrders.filter(o => o.status === 'delivered').length}</div>
                  <div className="stat-card-label">Delivered</div>
                </div>
              </div>

              {newOrders.length > 0 && (
                <div style={{ background: 'rgba(255,193,7,0.06)', border: '1px solid rgba(255,193,7,0.2)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ color: '#FFC107', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-bell" /> {newOrders.length} New Paid Order(s) Awaiting Your Action!
                  </h4>
                  {newOrders.map(order => (
                    <OrderActionCard key={order.id} order={order} onConfirm={handleConfirm} onApprove={handleApprove} onReject={handleReject} onPreparing={handlePreparing} />
                  ))}
                </div>
              )}

              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">All Orders</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {myOrders.slice(0, 10).map(o => (
                        <tr key={o.id}>
                          <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</td>
                          <td>{o.customerName}</td>
                          <td>₦{o.total.toLocaleString()}</td>
                          <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                          <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>{new Date(o.createdAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== NEW ORDERS ===== */}
          {section === 'new' && (
            <div className="tab-panel">
              {newOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🎉</div>
                  <p>All caught up! No new orders pending.</p>
                </div>
              ) : (
                newOrders.map(order => (
                  <OrderActionCard key={order.id} order={order} onConfirm={handleConfirm} onApprove={handleApprove} onReject={handleReject} onPreparing={handlePreparing} expanded />
                ))
              )}
            </div>
          )}

          {/* ===== PROCESSING ===== */}
          {section === 'processing' && (
            <div className="tab-panel">
              {processingOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👨‍🍳</div>
                  <p>No orders currently processing</p>
                </div>
              ) : (
                processingOrders.map(order => (
                  <OrderActionCard key={order.id} order={order} onConfirm={handleConfirm} onApprove={handleApprove} onReject={handleReject} onPreparing={handlePreparing} expanded />
                ))
              )}
            </div>
          )}

          {/* ===== HISTORY ===== */}
          {section === 'history' && (
            <div className="tab-panel">
              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">Order History</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>Order</th><th>Customer</th><th>Total</th><th>Rider</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {historyOrders.map(o => (
                      <tr key={o.id}>
                        <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</td>
                        <td>{o.customerName}</td>
                        <td>₦{o.total.toLocaleString()}</td>
                        <td style={{ color: 'rgba(255,255,255,0.5)' }}>{o.riderName || 'N/A'}</td>
                        <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>{new Date(o.createdAt).toLocaleDateString('en-NG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== NOTIFICATIONS ===== */}
          {section === 'notifications' && (
            <div className="tab-panel">
              {state.notifications.map(n => (
                <div key={n.id} style={{
                  background: n.read ? 'var(--dark-2)' : 'rgba(200,155,60,0.06)',
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : 'rgba(200,155,60,0.2)'}`,
                  borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.75rem',
                  display: 'flex', gap: '1rem',
                }}>
                  <div style={{ fontSize: '1.3rem' }}>{n.type === 'success' ? '✅' : n.type === 'info' ? 'ℹ️' : '⚠️'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{n.message}</div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: '4px' }}>{new Date(n.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderActionCard({ order, onConfirm, onApprove, onReject, onPreparing, expanded }: {
  order: any;
  onConfirm: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPreparing: (id: string) => void;
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded ?? false);

  return (
    <div style={{
      background: 'var(--dark-2)', border: '1px solid rgba(200,155,60,0.15)',
      borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem',
    }}>
      <div style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }} onClick={() => setOpen(!open)}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
        }}>📋</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>{order.orderNumber}</span>
            <span className={`badge badge-${order.status}`}>{order.status}</span>
            <span className={`badge badge-${order.paymentStatus}`}>{order.paymentStatus}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            {order.customerName} • {order.items.length} item(s) • <strong style={{ color: 'var(--gold)' }}>₦{order.total.toLocaleString()}</strong>
          </div>
        </div>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>

      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Customer info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'var(--dark-3)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Info</p>
              <p style={{ fontWeight: 600 }}>{order.customerName}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{order.customerPhone}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>{order.customerEmail}</p>
            </div>
            <div style={{ background: 'var(--dark-3)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery Address</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{order.deliveryAddress}</p>
              {order.landmark && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>Near: {order.landmark}</p>}
            </div>
          </div>

          {/* Order items */}
          <div style={{ background: 'var(--dark-3)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order Items</p>
            {order.items.map((item: any) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '0.9rem' }}>{item.name} × {item.quantity}</span>
                <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.9rem' }}>₦{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: 'var(--gold)' }}>₦{order.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {order.status === 'pending' && (
              <>
                <button className="btn-success" style={{ padding: '9px 20px' }} onClick={() => onConfirm(order.id)}>
                  <i className="fas fa-check" style={{ marginRight: '6px' }} /> Confirm Order
                </button>
                <button className="btn-danger" style={{ padding: '9px 20px' }} onClick={() => onReject(order.id)}>
                  <i className="fas fa-times" style={{ marginRight: '6px' }} /> Reject
                </button>
              </>
            )}
            {order.status === 'confirmed' && (
              <button style={{ padding: '9px 20px', background: 'rgba(23,162,184,0.15)', border: '1px solid #17A2B8', color: '#17A2B8', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }} onClick={() => onPreparing(order.id)}>
                <i className="fas fa-utensils" style={{ marginRight: '6px' }} /> Notify Kitchen
              </button>
            )}
            {order.status === 'preparing' && (
              <button className="btn-gold" style={{ padding: '9px 20px' }} onClick={() => onApprove(order.id)}>
                <i className="fas fa-thumbs-up" style={{ marginRight: '6px' }} /> Mark Ready for Pickup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
