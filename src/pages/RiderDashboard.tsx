import { useState } from 'react';
import { useApp } from '../store/AppContext';

type Section = 'dashboard' | 'new' | 'active' | 'history' | 'earnings';

export default function RiderDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { state, dispatch, addNotification } = useApp();
  const [section, setSection] = useState<Section>('dashboard');

  const riderId = state.user?.id;
  const rider = state.riders.find(r => r.name === state.user?.name);

  // Orders assigned to this rider
  const myAssignedOrders = state.orders.filter(o => o.riderId === riderId || o.riderName === state.user?.name);
  const availableOrders = state.orders.filter(o => o.status === 'approved' && !o.riderId);
  const activeOrders = myAssignedOrders.filter(o => ['assigned', 'onway'].includes(o.status));
  const historyOrders = myAssignedOrders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  const [riderAvailability, setRiderAvailability] = useState<'available' | 'busy' | 'offline'>(rider?.availability || 'available');

  const handleAcceptOrder = (orderId: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: 'assigned', riderId: riderId || 1, riderName: state.user?.name || 'Rider' } });
    if (riderId) dispatch({ type: 'UPDATE_RIDER_STATUS', payload: { id: riderId, availability: 'busy' } });
    setRiderAvailability('busy');
    addNotification('success', 'Order Accepted!', `You have accepted the delivery. Proceed to pickup location.`);
  };

  const handlePickedUp = (orderId: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: 'onway' } });
    addNotification('info', 'Order Picked Up', `You've picked up the order. Head to delivery address!`);
  };

  const handleDelivered = (orderId: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: 'delivered' } });
    if (riderId) dispatch({ type: 'UPDATE_RIDER_STATUS', payload: { id: riderId, availability: 'available' } });
    setRiderAvailability('available');
    addNotification('success', 'Delivery Complete!', `Order delivered successfully. Great job! 🎉`);
  };

  const toggleAvailability = () => {
    const next = riderAvailability === 'offline' ? 'available' : 'offline';
    setRiderAvailability(next);
    if (riderId) dispatch({ type: 'UPDATE_RIDER_STATUS', payload: { id: riderId, availability: next } });
    addNotification('info', 'Status Updated', `You are now ${next}`);
  };

  const sidebarItems: { key: Section; label: string; icon: string; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'new', label: 'Available Orders', icon: '🆕', badge: availableOrders.length },
    { key: 'active', label: 'Active Delivery', icon: '🏍️', badge: activeOrders.length },
    { key: 'history', label: 'Delivery History', icon: '📋' },
    { key: 'earnings', label: 'Earnings', icon: '💰' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <img src="/brybos-logo.png" alt="BRYBOS" />
          <div>
            <div className="sidebar-brand">BRYBOS</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Rider Portal</div>
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
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Rider Dashboard</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Dispatch Rider Portal</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Availability toggle */}
            <button
              onClick={toggleAvailability}
              style={{
                padding: '8px 16px', borderRadius: '20px', fontWeight: 600, fontSize: '0.85rem',
                background: riderAvailability === 'available' ? 'rgba(40,167,69,0.15)' : 'rgba(108,117,125,0.15)',
                border: `1px solid ${riderAvailability === 'available' ? 'var(--success)' : 'rgba(108,117,125,0.5)'}`,
                color: riderAvailability === 'available' ? 'var(--success)' : '#aaa',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <span className="live-dot" style={{ background: riderAvailability === 'available' ? 'var(--success)' : '#aaa' }} />
              {riderAvailability === 'available' ? 'Available' : riderAvailability === 'busy' ? 'On Delivery' : 'Offline'}
            </button>
            <div className="avatar">{state.user?.name?.charAt(0)}</div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* ===== DASHBOARD ===== */}
          {section === 'dashboard' && (
            <div className="tab-panel">
              {/* Rider Profile */}
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{
                  background: 'var(--dark-2)', border: '1px solid rgba(200,155,60,0.15)',
                  borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center',
                  gap: '1.5rem', flex: 1, minWidth: '280px',
                }}>
                  <div className="rider-avatar" style={{ width: 70, height: 70, fontSize: '2rem' }}>🏍️</div>
                  <div>
                    <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', fontWeight: 700 }}>{state.user?.name}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{state.user?.phone}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', marginTop: '2px' }}>
                      Bike: {rider?.bikeNumber || 'N/A'}
                    </p>
                    <span className={`badge badge-${riderAvailability}`} style={{ marginTop: '8px' }}>{riderAvailability}</span>
                  </div>
                </div>

                <div className="stat-cards" style={{ flex: 3, gap: '1rem' }}>
                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'rgba(200,155,60,0.1)' }}>📦</div>
                    <div className="stat-card-value">{rider?.totalDeliveries || 0}</div>
                    <div className="stat-card-label">Total Deliveries</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'rgba(40,167,69,0.1)' }}>⭐</div>
                    <div className="stat-card-value">{rider?.rating || 5.0}</div>
                    <div className="stat-card-label">Rating</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: 'rgba(23,162,184,0.1)' }}>💰</div>
                    <div className="stat-card-value">₦{((rider?.earnings || 0) / 1000).toFixed(0)}K</div>
                    <div className="stat-card-label">Total Earnings</div>
                  </div>
                </div>
              </div>

              {/* Available orders alert */}
              {availableOrders.length > 0 && (
                <div style={{ background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.2)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <i className="fas fa-bell" /> {availableOrders.length} Available Order(s) — Click to Accept!
                  </h4>
                  {availableOrders.slice(0, 2).map(o => (
                    <RiderOrderCard key={o.id} order={o} onAccept={handleAcceptOrder} onPickedUp={handlePickedUp} onDelivered={handleDelivered} />
                  ))}
                  {availableOrders.length > 2 && (
                    <button className="btn-outline-gold" onClick={() => setSection('new')} style={{ marginTop: '0.75rem', padding: '8px 20px' }}>
                      View {availableOrders.length - 2} more available orders
                    </button>
                  )}
                </div>
              )}

              {/* Active deliveries */}
              {activeOrders.length > 0 && (
                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1rem' }}>Active Deliveries</h4>
                  {activeOrders.map(o => (
                    <RiderOrderCard key={o.id} order={o} onAccept={handleAcceptOrder} onPickedUp={handlePickedUp} onDelivered={handleDelivered} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== NEW ORDERS ===== */}
          {section === 'new' && (
            <div className="tab-panel">
              <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.5rem' }}>
                Available Orders ({availableOrders.length})
              </h3>
              {availableOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>No available orders right now</p>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>New orders will appear here when assigned</p>
                </div>
              ) : (
                availableOrders.map(o => (
                  <RiderOrderCard key={o.id} order={o} onAccept={handleAcceptOrder} onPickedUp={handlePickedUp} onDelivered={handleDelivered} expanded />
                ))
              )}
            </div>
          )}

          {/* ===== ACTIVE DELIVERY ===== */}
          {section === 'active' && (
            <div className="tab-panel">
              <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.5rem' }}>Active Deliveries</h3>
              {activeOrders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🏍️</div>
                  <p>No active deliveries</p>
                </div>
              ) : (
                <>
                  {activeOrders.map(o => (
                    <RiderOrderCard key={o.id} order={o} onAccept={handleAcceptOrder} onPickedUp={handlePickedUp} onDelivered={handleDelivered} expanded />
                  ))}

                  {/* Map */}
                  <div style={{ marginTop: '2rem' }}>
                    <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1rem' }}>Navigation Map</h4>
                    <div className="map-container">
                      <div className="map-overlay-grid" />
                      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                        <div className="map-rider-pin" />
                        <p style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                          <i className="fas fa-route" style={{ color: 'var(--gold)', marginRight: '6px' }} />
                          Google Maps Navigation Active
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '4px' }}>
                          Your location is being shared in real-time
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== HISTORY ===== */}
          {section === 'history' && (
            <div className="tab-panel">
              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">Delivery History ({historyOrders.length})</span>
                </div>
                {historyOrders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <p>No delivery history yet</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>Order</th><th>Customer</th><th>Address</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {historyOrders.map(o => (
                        <tr key={o.id}>
                          <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</td>
                          <td>{o.customerName}</td>
                          <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', maxWidth: '180px' }}>{o.deliveryAddress}</td>
                          <td style={{ fontWeight: 700 }}>₦{o.total.toLocaleString()}</td>
                          <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                          <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>{new Date(o.createdAt).toLocaleDateString('en-NG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ===== EARNINGS ===== */}
          {section === 'earnings' && (
            <div className="tab-panel">
              <div className="stat-cards">
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(200,155,60,0.1)' }}>💰</div>
                  <div className="stat-card-value">₦{((rider?.earnings || 0) / 1000).toFixed(0)}K</div>
                  <div className="stat-card-label">Total Earnings</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(40,167,69,0.1)' }}>📦</div>
                  <div className="stat-card-value">{rider?.totalDeliveries || 0}</div>
                  <div className="stat-card-label">Total Deliveries</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon" style={{ background: 'rgba(23,162,184,0.1)' }}>💵</div>
                  <div className="stat-card-value">₦1,500</div>
                  <div className="stat-card-label">Per Delivery</div>
                </div>
              </div>

              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.5rem' }}>Earnings Breakdown</h4>
                {[
                  { label: 'This Week', amount: 21000, deliveries: 14 },
                  { label: 'This Month', amount: 87000, deliveries: 58 },
                  { label: 'Last Month', amount: 94500, deliveries: 63 },
                ].map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.label}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{e.deliveries} deliveries</div>
                    </div>
                    <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.1rem' }}>₦{e.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiderOrderCard({ order, onAccept, onPickedUp, onDelivered, expanded }: {
  order: any;
  onAccept: (id: string) => void;
  onPickedUp: (id: string) => void;
  onDelivered: (id: string) => void;
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded ?? false);

  return (
    <div style={{
      background: 'var(--dark-2)', border: order.status === 'assigned' ? '1px solid rgba(200,155,60,0.3)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem',
    }}>
      <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
        }}>🏍️</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{order.orderNumber}</span>
            <span className={`badge badge-${order.status}`}>{order.status}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
            {order.customerName} • ₦{order.total.toLocaleString()} • {order.paymentStatus === 'paid' ? '✅ Paid' : '💵 COD'}
          </div>
        </div>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>

      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ background: 'var(--dark-3)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📦 Pickup From</p>
              <p style={{ fontWeight: 600 }}>BRYBOS Kitchen</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>12 Restaurant Lane, Lagos</p>
            </div>
            <div style={{ background: 'var(--dark-3)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📍 Deliver To</p>
              <p style={{ fontWeight: 600 }}>{order.customerName}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>{order.deliveryAddress}</p>
              {order.landmark && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>Near: {order.landmark}</p>}
            </div>
          </div>

          <div style={{ background: 'var(--dark-3)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Items: </span>
              <strong>{order.items.length}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Total: </span>
              <strong style={{ color: 'var(--gold)' }}>₦{order.total.toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Payment: </span>
              <strong style={{ color: order.paymentStatus === 'paid' ? 'var(--success)' : '#FFC107' }}>
                {order.paymentStatus === 'paid' ? 'PAID' : 'COLLECT CASH'}
              </strong>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {order.status === 'approved' && !order.riderId && (
              <>
                <button className="btn-gold" style={{ padding: '10px 24px', flex: 1 }} onClick={() => onAccept(order.id)}>
                  <i className="fas fa-check" style={{ marginRight: '8px' }} /> Accept Order
                </button>
                <button style={{ padding: '10px 18px', background: 'rgba(220,53,69,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  Decline
                </button>
              </>
            )}
            {order.status === 'assigned' && (
              <button className="btn-success" style={{ padding: '10px 24px', flex: 1 }} onClick={() => onPickedUp(order.id)}>
                <i className="fas fa-box" style={{ marginRight: '8px' }} /> Order Picked Up — I'm On My Way!
              </button>
            )}
            {order.status === 'onway' && (
              <button className="btn-gold" style={{ padding: '10px 24px', flex: 1 }} onClick={() => onDelivered(order.id)}>
                <i className="fas fa-flag-checkered" style={{ marginRight: '8px' }} /> Mark as Delivered
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
