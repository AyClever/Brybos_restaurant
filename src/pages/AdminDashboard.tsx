import { useState } from 'react';
import { useApp, OrderStatus, Rider, SalesRep, MenuItem } from '../store/AppContext';

type AdminSection = 'dashboard' | 'orders' | 'customers' | 'salesreps' | 'riders' | 'menu' | 'tracking' | 'payments' | 'notifications';

interface SidebarItem {
  key: AdminSection;
  label: string;
  icon: string;
  badge?: string | number;
  badgeType?: 'gold' | 'danger';
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace('onway', 'On Way')}</span>;
}

function StatCard({ icon, value, label, color, change }: { icon: string; value: string; label: string; color: string; change?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: `${color}22` }}>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {change && <div className="stat-card-change" style={{ color: 'var(--success)' }}>↑ {change}</div>}
    </div>
  );
}

export default function AdminDashboard({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { state, dispatch, addNotification } = useApp();
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Menu form  
  const [menuForm, setMenuForm] = useState<{ name: string; description: string; price: string; category: string; badge: string; available: boolean }>({ name: '', description: '', price: '', category: 'breakfast', badge: '', available: true });
  const [editMenuId, setEditMenuId] = useState<number | null>(null);

  // Rider form
  const [riderForm, setRiderForm] = useState({ name: '', phone: '', bikeNumber: '', licenseNumber: '' });
  const [editRiderId, setEditRiderId] = useState<number | null>(null);
  const [showRiderForm, setShowRiderForm] = useState(false);

  // Sales Rep form
  const [repForm, setRepForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [editRepId, setEditRepId] = useState<number | null>(null);
  const [showRepForm, setShowRepForm] = useState(false);

  const pendingOrders = state.orders.filter(o => o.status === 'pending').length;
  const totalRevenue = state.orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
  const activeRiders = state.riders.filter(r => r.availability === 'busy').length;
  const deliveredOrders = state.orders.filter(o => o.status === 'delivered').length;

  const sidebarItems: SidebarItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'orders', label: 'Orders', icon: '📋', badge: pendingOrders > 0 ? pendingOrders : undefined, badgeType: 'danger' },
    { key: 'customers', label: 'Customers', icon: '👥' },
    { key: 'salesreps', label: 'Sales Reps', icon: '🧑‍💼' },
    { key: 'riders', label: 'Dispatch Riders', icon: '🏍️' },
    { key: 'menu', label: 'Menu Management', icon: '🍽️' },
    { key: 'tracking', label: 'Live Tracking', icon: '📍' },
    { key: 'payments', label: 'Payments', icon: '💳' },
    { key: 'notifications', label: 'Notifications', icon: '🔔', badge: state.unreadNotifications > 0 ? state.unreadNotifications : undefined },
  ];

  const handleOrderStatusChange = (orderId: string, status: OrderStatus, riderId?: number, riderName?: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status, riderId, riderName } });
    const order = state.orders.find(o => o.id === orderId);
    addNotification('success', 'Order Updated', `Order ${order?.orderNumber} status changed to ${status}`);
  };

  const handleAssignRider = (orderId: string, riderId: number) => {
    const rider = state.riders.find(r => r.id === riderId);
    if (!rider) return;
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: 'assigned', riderId, riderName: rider.name } });
    dispatch({ type: 'UPDATE_RIDER_STATUS', payload: { id: riderId, availability: 'busy' } });
    addNotification('info', 'Rider Assigned', `${rider.name} has been assigned to deliver the order`);
  };

  const handleAddRider = () => {
    if (!riderForm.name || !riderForm.phone) return;
    if (editRiderId) {
      const existing = state.riders.find(r => r.id === editRiderId)!;
      dispatch({ type: 'UPDATE_RIDER', payload: { ...existing, ...riderForm } });
      addNotification('success', 'Rider Updated', `${riderForm.name}'s profile updated`);
      setEditRiderId(null);
    } else {
      const newRider: Rider = {
        id: Date.now(), ...riderForm, availability: 'available',
        totalDeliveries: 0, rating: 5, earnings: 0,
      };
      dispatch({ type: 'ADD_RIDER', payload: newRider });
      addNotification('success', 'Rider Added', `${riderForm.name} added as dispatch rider`);
    }
    setRiderForm({ name: '', phone: '', bikeNumber: '', licenseNumber: '' });
    setShowRiderForm(false);
  };

  const handleAddRep = () => {
    if (!repForm.name || !repForm.email) return;
    if (editRepId) {
      const existing = state.salesReps.find(r => r.id === editRepId)!;
      dispatch({ type: 'UPDATE_SALES_REP', payload: { ...existing, ...repForm } });
      addNotification('success', 'Sales Rep Updated', `${repForm.name}'s profile updated`);
      setEditRepId(null);
    } else {
      const newRep: SalesRep = { id: Date.now(), ...repForm, ordersHandled: 0, status: 'active' };
      dispatch({ type: 'ADD_SALES_REP', payload: newRep });
      addNotification('success', 'Sales Rep Added', `${repForm.name} added as sales representative`);
    }
    setRepForm({ name: '', email: '', phone: '', address: '' });
    setShowRepForm(false);
  };

  const handleAddMenu = () => {
    if (!menuForm.name || !menuForm.price) return;
    const imageMap: Record<string, string> = { breakfast: '/food-breakfast.jpg', lunch: '/food-rice.jpg', dinner: '/food-dinner.jpg', drinks: '/food-drinks.jpg' };
    if (editMenuId) {
      const existing = state.menuItems.find(m => m.id === editMenuId)!;
      dispatch({ type: 'UPDATE_MENU_ITEM', payload: { ...existing, name: menuForm.name, description: menuForm.description, price: Number(menuForm.price), category: menuForm.category as MenuItem['category'], badge: menuForm.badge, available: menuForm.available } });
      addNotification('success', 'Menu Updated', `${menuForm.name} updated`);
      setEditMenuId(null);
    } else {
      const newItem: MenuItem = {
        id: Date.now(),
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        category: menuForm.category as MenuItem['category'],
        badge: menuForm.badge,
        available: menuForm.available,
        image: imageMap[menuForm.category],
      };
      dispatch({ type: 'ADD_MENU_ITEM', payload: newItem });
      addNotification('success', 'Meal Added', `${menuForm.name} added to menu`);
    }
    setMenuForm({ name: '', description: '', price: '', category: 'breakfast', badge: '', available: true });
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/brybos-logo.png" alt="BRYBOS" />
          <div>
            <div className="sidebar-brand">BRYBOS</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Admin Panel</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-section">Main Menu</div>
          {sidebarItems.map(item => (
            <div
              key={item.key}
              className={`sidebar-item ${section === item.key ? 'active' : ''}`}
              onClick={() => { setSection(item.key); setSidebarOpen(false); }}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
              {item.badge && (
                <span className={`sidebar-badge ${item.badgeType === 'danger' ? 'danger' : ''}`}>{item.badge}</span>
              )}
            </div>
          ))}

          <div className="sidebar-section">Account</div>
          <div className="sidebar-item" onClick={() => onNavigate('home')}>
            <span className="icon">🏠</span> Back to Site
          </div>
          <div className="sidebar-item" onClick={() => { dispatch({ type: 'SET_USER', payload: null }); onNavigate('home'); }}>
            <span className="icon">🚪</span> Logout
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="dashboard-main">
        {/* Topbar */}
        <div className="dashboard-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'flex' }}>
              <i className="fas fa-bars" />
            </button>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize' }}>{section}</h2>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Admin Dashboard</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{state.user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>Administrator</div>
            </div>
            <div className="avatar">{state.user?.name?.charAt(0)}</div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* ===== DASHBOARD ===== */}
          {section === 'dashboard' && (
            <div className="tab-panel">
              <div className="stat-cards">
                <StatCard icon="📋" value={state.orders.length.toString()} label="Total Orders" color="var(--gold)" change="+12 today" />
                <StatCard icon="💰" value={`₦${(totalRevenue / 1000).toFixed(0)}K`} label="Total Revenue" color="var(--success)" change="+₦45K today" />
                <StatCard icon="🏍️" value={activeRiders.toString()} label="Active Riders" color="#17A2B8" />
                <StatCard icon="📦" value={deliveredOrders.toString()} label="Delivered Today" color="#9B59B6" change="+8 today" />
              </div>

              {/* Recent Orders */}
              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">Recent Orders</span>
                  <button className="btn-outline-gold" onClick={() => setSection('orders')} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>View All</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.orders.slice(0, 6).map(o => (
                        <tr key={o.id}>
                          <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</td>
                          <td>{o.customerName}</td>
                          <td>₦{o.total.toLocaleString()}</td>
                          <td><StatusBadge status={o.paymentStatus} /></td>
                          <td><StatusBadge status={o.status} /></td>
                          <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                            {new Date(o.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div className="data-table-wrapper">
                  <div className="data-table-header">
                    <span className="data-table-title">Top Riders</span>
                  </div>
                  {state.riders.map(r => (
                    <div key={r.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="rider-avatar" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>🏍️</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{r.totalDeliveries} deliveries • {r.rating}★</div>
                      </div>
                      <span className={`badge badge-${r.availability}`}>{r.availability}</span>
                    </div>
                  ))}
                </div>

                <div className="data-table-wrapper">
                  <div className="data-table-header">
                    <span className="data-table-title">Sales Reps</span>
                  </div>
                  {state.salesReps.map(r => (
                    <div key={r.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar">{r.name.charAt(0)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{r.ordersHandled} orders handled</div>
                      </div>
                      <span className={`badge badge-${r.status === 'active' ? 'available' : 'offline'}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== ORDERS ===== */}
          {section === 'orders' && (
            <div className="tab-panel">
              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">All Orders ({state.orders.length})</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.orders.map(o => (
                        <tr key={o.id}>
                          <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{o.customerPhone}</div>
                          </td>
                          <td>{o.items.length} item(s)</td>
                          <td style={{ fontWeight: 700 }}>₦{o.total.toLocaleString()}</td>
                          <td><StatusBadge status={o.paymentStatus} /></td>
                          <td><StatusBadge status={o.status} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {o.status === 'pending' && (
                                <button className="btn-success" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                  onClick={() => handleOrderStatusChange(o.id, 'confirmed')}>Confirm</button>
                              )}
                              {o.status === 'confirmed' && (
                                <button style={{ padding: '4px 10px', fontSize: '0.78rem', background: 'rgba(23,162,184,0.2)', border: '1px solid #17A2B8', color: '#17A2B8', borderRadius: '6px', cursor: 'pointer' }}
                                  onClick={() => handleOrderStatusChange(o.id, 'preparing')}>Prepare</button>
                              )}
                              {o.status === 'approved' && !o.riderId && (
                                <select
                                  onChange={e => { if (e.target.value) handleAssignRider(o.id, Number(e.target.value)); }}
                                  style={{ padding: '4px 8px', background: 'var(--dark-3)', border: '1px solid rgba(200,155,60,0.3)', color: 'var(--white)', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer' }}
                                >
                                  <option value="">Assign Rider</option>
                                  {state.riders.filter(r => r.availability === 'available').map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              )}
                              {o.status === 'assigned' && (
                                <button style={{ padding: '4px 10px', fontSize: '0.78rem', background: 'rgba(200,155,60,0.2)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: '6px', cursor: 'pointer' }}
                                  onClick={() => handleOrderStatusChange(o.id, 'onway')}>Mark On Way</button>
                              )}
                              {o.status === 'onway' && (
                                <button className="btn-success" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                  onClick={() => handleOrderStatusChange(o.id, 'delivered')}>Delivered</button>
                              )}
                              {!['delivered', 'cancelled'].includes(o.status) && (
                                <button className="btn-danger" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                  onClick={() => dispatch({ type: 'CANCEL_ORDER', payload: o.id })}>Cancel</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===== RIDERS ===== */}
          {section === 'riders' && (
            <div className="tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem' }}>Dispatch Riders ({state.riders.length})</h3>
                <button className="btn-gold" onClick={() => { setShowRiderForm(!showRiderForm); setEditRiderId(null); setRiderForm({ name: '', phone: '', bikeNumber: '', licenseNumber: '' }); }}>
                  <i className="fas fa-plus" style={{ marginRight: '6px' }} /> Add Rider
                </button>
              </div>

              {showRiderForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.25rem' }}>{editRiderId ? 'Edit Rider' : 'Add New Rider'}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input type="text" className="form-control" value={riderForm.name} onChange={e => setRiderForm({ ...riderForm, name: e.target.value })} placeholder="Rider's full name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input type="tel" className="form-control" value={riderForm.phone} onChange={e => setRiderForm({ ...riderForm, phone: e.target.value })} placeholder="08012345678" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bike Number</label>
                      <input type="text" className="form-control" value={riderForm.bikeNumber} onChange={e => setRiderForm({ ...riderForm, bikeNumber: e.target.value })} placeholder="ABJ-123-DP" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">License Number</label>
                      <input type="text" className="form-control" value={riderForm.licenseNumber} onChange={e => setRiderForm({ ...riderForm, licenseNumber: e.target.value })} placeholder="LIC-001" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-gold" onClick={handleAddRider}>
                      <i className="fas fa-save" style={{ marginRight: '6px' }} /> {editRiderId ? 'Update Rider' : 'Add Rider'}
                    </button>
                    <button className="btn-outline-gold" onClick={() => { setShowRiderForm(false); setEditRiderId(null); }}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="grid-3">
                {state.riders.map(rider => (
                  <div key={rider.id} className="rider-card">
                    <div className="rider-avatar">🏍️</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{rider.name}</div>
                    <span className={`badge badge-${rider.availability}`}>{rider.availability}</span>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{rider.phone}</div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{rider.bikeNumber}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                      <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '6px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{rider.totalDeliveries}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Deliveries</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '6px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{rider.rating}★</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Rating</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <select
                        value={rider.availability}
                        onChange={e => dispatch({ type: 'UPDATE_RIDER_STATUS', payload: { id: rider.id, availability: e.target.value as Rider['availability'] } })}
                        style={{ flex: 1, padding: '6px 8px', background: 'var(--dark-3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--white)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        <option value="available">Available</option>
                        <option value="busy">Busy</option>
                        <option value="offline">Offline</option>
                      </select>
                      <button className="btn-outline-gold" style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        onClick={() => { setShowRiderForm(true); setEditRiderId(rider.id); setRiderForm({ name: rider.name, phone: rider.phone, bikeNumber: rider.bikeNumber, licenseNumber: rider.licenseNumber }); }}>
                        Edit
                      </button>
                      <button className="btn-danger" style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        onClick={() => { dispatch({ type: 'DELETE_RIDER', payload: rider.id }); addNotification('warning', 'Rider Removed', `${rider.name} removed`); }}>
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== SALES REPS ===== */}
          {section === 'salesreps' && (
            <div className="tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem' }}>Sales Representatives ({state.salesReps.length})</h3>
                <button className="btn-gold" onClick={() => { setShowRepForm(!showRepForm); setEditRepId(null); setRepForm({ name: '', email: '', phone: '', address: '' }); }}>
                  <i className="fas fa-plus" style={{ marginRight: '6px' }} /> Add Rep
                </button>
              </div>

              {showRepForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.25rem' }}>{editRepId ? 'Edit Sales Rep' : 'Add New Sales Rep'}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input type="text" className="form-control" value={repForm.name} onChange={e => setRepForm({ ...repForm, name: e.target.value })} placeholder="Full name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input type="email" className="form-control" value={repForm.email} onChange={e => setRepForm({ ...repForm, email: e.target.value })} placeholder="email@brybos.com" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input type="tel" className="form-control" value={repForm.phone} onChange={e => setRepForm({ ...repForm, phone: e.target.value })} placeholder="08012345678" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Address</label>
                      <input type="text" className="form-control" value={repForm.address} onChange={e => setRepForm({ ...repForm, address: e.target.value })} placeholder="City, Nigeria" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-gold" onClick={handleAddRep}>
                      <i className="fas fa-save" style={{ marginRight: '6px' }} /> {editRepId ? 'Update Rep' : 'Add Rep'}
                    </button>
                    <button className="btn-outline-gold" onClick={() => { setShowRepForm(false); setEditRepId(null); }}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {state.salesReps.map(rep => (
                      <tr key={rep.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>{rep.name.charAt(0)}</div>
                            {rep.name}
                          </div>
                        </td>
                        <td style={{ color: 'rgba(255,255,255,0.5)' }}>{rep.email}</td>
                        <td style={{ color: 'rgba(255,255,255,0.5)' }}>{rep.phone}</td>
                        <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{rep.ordersHandled}</td>
                        <td><span className={`badge badge-${rep.status === 'active' ? 'available' : 'offline'}`}>{rep.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              onClick={() => { setShowRepForm(true); setEditRepId(rep.id); setRepForm({ name: rep.name, email: rep.email, phone: rep.phone, address: rep.address }); }}>
                              Edit
                            </button>
                            <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                              onClick={() => { dispatch({ type: 'DELETE_SALES_REP', payload: rep.id }); addNotification('warning', 'Rep Removed', `${rep.name} removed`); }}>
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== MENU MANAGEMENT ===== */}
          {section === 'menu' && (
            <div className="tab-panel">
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.25rem', fontSize: '1.2rem' }}>
                  <i className="fas fa-utensils" style={{ color: 'var(--gold)', marginRight: '10px' }} />
                  {editMenuId ? 'Edit Meal' : 'Add New Meal'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Meal Name *</label>
                    <input type="text" className="form-control" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="e.g. Jollof Rice Special" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}>
                      <option value="breakfast">🌅 Breakfast</option>
                      <option value="lunch">☀️ Lunch</option>
                      <option value="dinner">🌙 Dinner</option>
                      <option value="drinks">🥤 Drinks</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Description</label>
                    <input type="text" className="form-control" value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })} placeholder="Brief description of the meal" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price (₦) *</label>
                    <input type="number" className="form-control" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="e.g. 5000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Badge (optional)</label>
                    <input type="text" className="form-control" value={menuForm.badge} onChange={e => setMenuForm({ ...menuForm, badge: e.target.value })} placeholder="e.g. Popular, New, Spicy" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button className="btn-gold" onClick={handleAddMenu}>
                    <i className={`fas fa-${editMenuId ? 'save' : 'plus'}`} style={{ marginRight: '6px' }} />
                    {editMenuId ? 'Update Meal' : 'Add Meal'}
                  </button>
                  {editMenuId && (
                    <button className="btn-outline-gold" onClick={() => { setEditMenuId(null); setMenuForm({ name: '', description: '', price: '', category: 'breakfast', badge: '', available: true }); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">Menu Items ({state.menuItems.length})</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>Meal</th><th>Category</th><th>Price</th><th>Badge</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {state.menuItems.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={item.image} alt={item.name} style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover' }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{item.description.slice(0, 40)}...</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>
                          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{item.category}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>₦{item.price.toLocaleString()}</td>
                        <td>{item.badge && <span className="badge badge-approved">{item.badge}</span>}</td>
                        <td>
                          <span className={`badge badge-${item.available ? 'available' : 'offline'}`}>
                            {item.available ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                              onClick={() => { setEditMenuId(item.id); setMenuForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, badge: item.badge || '', available: item.available }); }}>
                              Edit
                            </button>
                            <button
                              style={{ padding: '4px 10px', fontSize: '0.78rem', background: item.available ? 'rgba(255,193,7,0.1)' : 'rgba(40,167,69,0.1)', border: `1px solid ${item.available ? '#FFC107' : 'var(--success)'}`, color: item.available ? '#FFC107' : 'var(--success)', borderRadius: '6px', cursor: 'pointer' }}
                              onClick={() => dispatch({ type: 'UPDATE_MENU_ITEM', payload: { ...item, available: !item.available } })}
                            >
                              {item.available ? 'Disable' : 'Enable'}
                            </button>
                            <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                              onClick={() => { dispatch({ type: 'DELETE_MENU_ITEM', payload: item.id }); addNotification('warning', 'Meal Deleted', `${item.name} removed from menu`); }}>
                              <i className="fas fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== LIVE TRACKING ===== */}
          {section === 'tracking' && (
            <div className="tab-panel">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
                <div>
                  <div className="map-container">
                    <div className="map-overlay-grid" />
                    <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                      <div className="map-rider-pin" />
                      <p style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                        <i className="fas fa-map-marker-alt" style={{ color: 'var(--gold)', marginRight: '6px' }} />
                        Google Maps API Integration
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '4px' }}>
                        Rider locations update in real-time
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1rem' }}>Active Deliveries</h4>
                  {state.orders.filter(o => o.status === 'onway').length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <div style={{ fontSize: '2rem' }}>🏍️</div>
                      <p>No active deliveries</p>
                    </div>
                  ) : (
                    state.orders.filter(o => o.status === 'onway').map(o => (
                      <div key={o.id} className="order-detail-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</span>
                          <span className="badge badge-onway">On Way</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', marginBottom: '4px' }}><strong>Rider:</strong> {o.riderName || 'N/A'}</p>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}><i className="fas fa-map-marker-alt" style={{ marginRight: '4px', color: 'var(--gold)' }} />{o.deliveryAddress}</p>
                        <div className="progress-bar-wrapper">
                          <div className="progress-bar-fill" style={{ width: '65%' }} />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>Est. 12 mins remaining</p>
                      </div>
                    ))
                  )}

                  <h4 style={{ fontFamily: 'Playfair Display, serif', margin: '1.5rem 0 1rem' }}>Rider Status</h4>
                  {state.riders.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '1.3rem' }}>🏍️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{r.phone}</div>
                      </div>
                      <span className={`badge badge-${r.availability}`}>{r.availability}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== PAYMENTS ===== */}
          {section === 'payments' && (
            <div className="tab-panel">
              <div className="stat-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
                <StatCard icon="💰" value={`₦${(totalRevenue / 1000).toFixed(0)}K`} label="Total Revenue" color="var(--success)" />
                <StatCard icon="📋" value={state.orders.filter(o => o.paymentStatus === 'paid').length.toString()} label="Paid Orders" color="var(--gold)" />
                <StatCard icon="⏳" value={state.orders.filter(o => o.paymentStatus === 'pending').length.toString()} label="Pending Payments" color="var(--danger)" />
              </div>
              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">Payment Records</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>Order</th><th>Customer</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {state.orders.map(o => (
                      <tr key={o.id}>
                        <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</td>
                        <td>{o.customerName}</td>
                        <td style={{ fontWeight: 700 }}>₦{o.total.toLocaleString()}</td>
                        <td style={{ textTransform: 'capitalize' }}>{o.paymentMethod}</td>
                        <td><StatusBadge status={o.paymentStatus} /></td>
                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                          {new Date(o.createdAt).toLocaleDateString('en-NG')}
                        </td>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem' }}>Notifications ({state.notifications.length})</h3>
                <button className="btn-outline-gold" onClick={() => dispatch({ type: 'MARK_ALL_READ' })} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                  Mark All Read
                </button>
              </div>
              {state.notifications.map(n => (
                <div key={n.id} style={{
                  background: n.read ? 'var(--dark-2)' : 'rgba(200,155,60,0.06)',
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : 'rgba(200,155,60,0.2)'}`,
                  borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.75rem',
                  display: 'flex', gap: '1rem', alignItems: 'flex-start',
                  cursor: 'pointer',
                }}
                  onClick={() => dispatch({ type: 'MARK_NOTIF_READ', payload: n.id })}
                >
                  <div style={{ fontSize: '1.3rem' }}>
                    {n.type === 'success' ? '✅' : n.type === 'info' ? 'ℹ️' : n.type === 'warning' ? '⚠️' : '❌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>{n.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{n.message}</div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: '4px' }}>
                      {new Date(n.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginTop: '6px' }} />}
                </div>
              ))}
            </div>
          )}

          {/* ===== CUSTOMERS ===== */}
          {section === 'customers' && (
            <div className="tab-panel">
              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">Customer Orders</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total Spent</th><th>Last Order</th></tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(state.orders.map(o => o.customerEmail))).map(email => {
                      const cOrders = state.orders.filter(o => o.customerEmail === email);
                      const latest = cOrders[0];
                      const totalSpent = cOrders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
                      return (
                        <tr key={email}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="avatar" style={{ width: 34, height: 34 }}>{latest.customerName.charAt(0)}</div>
                              {latest.customerName}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{email}</div>
                            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{latest.customerPhone}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{cOrders.length}</td>
                          <td style={{ fontWeight: 700 }}>₦{totalSpent.toLocaleString()}</td>
                          <td style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
                            {new Date(latest.createdAt).toLocaleDateString('en-NG')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
