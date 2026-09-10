import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp, OrderStatus, Rider, SalesRep, MenuItem } from '../store/AppContext';
import { menuService } from '../services/menuService';
import { authService, Profile } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';
import AdminFleetMap from '../components/AdminFleetMap';

type AdminSection = 'dashboard' | 'orders' | 'customers' | 'salesreps' | 'riders' | 'menu' | 'tracking' | 'payments' | 'notifications';

interface SidebarItem {
  key: AdminSection;
  label: string;
  icon: string;
  badge?: string | number;
  badgeType?: 'gold' | 'danger';
}

function StatusBadge({ status }: { status: string }) {
  const norm = (status || '').toLowerCase();
  if (norm === 'delivered') {
    return (
      <span className="badge badge-delivered" style={{ background: 'rgba(40,167,69,0.18)', color: '#28a745', border: '1px solid rgba(40,167,69,0.4)', fontWeight: 700 }}>
        ✓ Delivered
      </span>
    );
  }
  if (norm === 'onway') {
    return (
      <span className="badge badge-onway" style={{ background: 'rgba(255,193,7,0.18)', color: '#ffc107', border: '1px solid rgba(255,193,7,0.4)', fontWeight: 700 }}>
        🏍️ On The Way
      </span>
    );
  }
  const label = status === 'onway' ? 'On Way' : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`badge badge-${status}`}>{label}</span>;
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
  const { state, dispatch, addNotification, refreshData, isSupabaseLive } = useApp();
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Menu form  
  const [menuForm, setMenuForm] = useState<{
    name: string;
    description: string;
    price: string;
    category: string;
    badge: string;
    available: boolean;
    image: string;
  }>({
    name: '',
    description: '',
    price: '',
    category: 'breakfast',
    badge: '',
    available: true,
    image: '',
  });
  const [editMenuId, setEditMenuId] = useState<string | number | null>(null);

  // Rider form
  const [riderForm, setRiderForm] = useState({ name: '', email: '', phone: '', bikeNumber: '', licenseNumber: '' });
  const [editRiderId, setEditRiderId] = useState<string | number | null>(null);
  const [showRiderForm, setShowRiderForm] = useState(false);

  // Sales Rep form
  const [repForm, setRepForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [editRepId, setEditRepId] = useState<string | number | null>(null);
  const [showRepForm, setShowRepForm] = useState(false);

  // Staff Credentials Modal
  const [createdStaffCredential, setCreatedStaffCredential] = useState<{
    name: string;
    email: string;
    role: string;
    roleNumber: number;
    password: string;
    portalUrl: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState<{
    title: string;
    itemType: string;
    itemName: string;
    itemSubtitle?: string;
    warningNote?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Customer Management - Powered by Supabase profiles table
  const [registeredCustomers, setRegisteredCustomers] = useState<Profile[]>([]);
  const [editingCustomerEmail, setEditingCustomerEmail] = useState<string | null>(null);
  const [customerEditForm, setCustomerEditForm] = useState({ name: '', phone: '' });

  const refreshCustomers = useCallback(async () => {
    const customers = await authService.getCustomers();
    setRegisteredCustomers(customers);
  }, []);

  useEffect(() => {
    refreshCustomers();
  }, [refreshCustomers]);

  const handleStartEditCustomer = (c: Profile) => {
    setEditingCustomerEmail(c.email);
    setCustomerEditForm({ name: c.full_name || '', phone: c.phone || '' });
  };

  const handleSaveCustomer = async (email: string) => {
    await authService.updateCustomer(email, {
      full_name: customerEditForm.name.trim(),
      phone: customerEditForm.phone.trim(),
    });
    await refreshCustomers();
    setEditingCustomerEmail(null);
    addNotification('success', 'Customer Updated', `${customerEditForm.name}'s profile updated in database`);
  };

  const handleDeleteCustomer = (email: string, name: string) => {
    setDeleteModal({
      title: 'Delete Customer Account',
      itemType: 'Customer',
      itemName: name,
      itemSubtitle: `Email: ${email}`,
      warningNote: 'This will permanently remove this customer account and profile from the database.',
      onConfirm: async () => {
        await authService.deleteCustomer(email);
        await refreshCustomers();
        addNotification('warning', 'Customer Removed', `Customer ${name} deleted from database`);
      },
    });
  };

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

  const handleOrderStatusChange = (orderId: string, status: OrderStatus, riderId?: string | number, riderName?: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status, riderId, riderName } });
    const order = state.orders.find(o => o.id === orderId);
    addNotification('success', 'Order Updated', `Order ${order?.orderNumber} status changed to ${status}`);
  };

  const handleAssignRider = (orderId: string, riderId: string | number) => {
    const rider = state.riders.find(r => String(r.id) === String(riderId));
    if (!rider) return;
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: orderId, status: 'assigned', riderId, riderName: rider.name } });
    dispatch({ type: 'UPDATE_RIDER_STATUS', payload: { id: riderId, availability: 'busy' } });
    addNotification('info', 'Rider Assigned', `${rider.name} has been assigned to deliver the order`);
  };

  const handleAddRider = async () => {
    if (!riderForm.name || !riderForm.phone) {
      addNotification('warning', 'Missing Details', 'Please enter rider full name and phone number');
      return;
    }

    const cleanName = riderForm.name.trim();
    const riderEmail = riderForm.email.trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;

    if (editRiderId) {
      const existing = state.riders.find(r => r.id === editRiderId)!;
      dispatch({ type: 'UPDATE_RIDER', payload: { ...existing, ...riderForm, email: riderEmail } });
      addNotification('success', 'Rider Updated', `${cleanName}'s profile updated and saved to database`);
      setEditRiderId(null);
    } else {
      const roleNumber = state.riders.length + 1;
      const generatedPassword = `riders${roleNumber}`;

      // Register staff with email and generated password
      await authService.registerStaff({
        name: cleanName,
        email: riderEmail,
        phone: riderForm.phone,
        role: 'rider',
        roleNumber,
        password: generatedPassword,
      });

      const newRider: Rider = {
        id: `rider_${Date.now()}`,
        name: cleanName,
        email: riderEmail,
        phone: riderForm.phone,
        bikeNumber: riderForm.bikeNumber || `BRY-${100 + roleNumber}`,
        licenseNumber: riderForm.licenseNumber || `LIC-00${roleNumber}`,
        availability: 'available',
        totalDeliveries: 0,
        rating: 5,
        earnings: 0,
        roleNumber,
      };

      dispatch({ type: 'ADD_RIDER', payload: newRider });
      setCreatedStaffCredential({
        name: cleanName,
        email: riderEmail,
        role: 'Dispatch Rider',
        roleNumber,
        password: generatedPassword,
        portalUrl: '/rider',
      });
      addNotification('success', 'Rider Registered', `Login credentials created: ${riderEmail} / ${generatedPassword}`);
    }
    setRiderForm({ name: '', email: '', phone: '', bikeNumber: '', licenseNumber: '' });
    setShowRiderForm(false);
  };

  const handleAddRep = async () => {
    if (!repForm.name || !repForm.email) {
      addNotification('warning', 'Missing Details', 'Please enter sales rep full name and email address');
      return;
    }

    const cleanName = repForm.name.trim();
    const repEmail = repForm.email.trim();

    if (editRepId) {
      const existing = state.salesReps.find(r => r.id === editRepId)!;
      dispatch({ type: 'UPDATE_SALES_REP', payload: { ...existing, ...repForm, email: repEmail } });
      addNotification('success', 'Sales Rep Updated', `${cleanName}'s profile updated`);
      setEditRepId(null);
    } else {
      const roleNumber = state.salesReps.length + 1;
      const generatedPassword = `salesrep${roleNumber}`;

      // Register staff with email and generated password
      await authService.registerStaff({
        name: cleanName,
        email: repEmail,
        phone: repForm.phone || '08000000000',
        role: 'sales_rep',
        roleNumber,
        password: generatedPassword,
      });

      const newRep: SalesRep = {
        id: `rep_${Date.now()}`,
        name: cleanName,
        email: repEmail,
        phone: repForm.phone || '08000000000',
        address: repForm.address || 'Lagos, Nigeria',
        ordersHandled: 0,
        status: 'active',
        roleNumber,
      };

      dispatch({ type: 'ADD_SALES_REP', payload: newRep });
      setCreatedStaffCredential({
        name: cleanName,
        email: repEmail,
        role: 'Sales Representative',
        roleNumber,
        password: generatedPassword,
        portalUrl: '/salesrep',
      });
      addNotification('success', 'Sales Rep Registered', `Login credentials created: ${repEmail} / ${generatedPassword}`);
    }
    setRepForm({ name: '', email: '', phone: '', address: '' });
    setShowRepForm(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const { url, error } = await menuService.uploadMenuImage(file);
    setUploadingImage(false);

    if (error || !url) {
      addNotification('warning', 'Upload Notice', error || 'Failed to upload image. You can still use category default.');
      return;
    }

    setMenuForm(prev => ({ ...prev, image: url }));
    addNotification('success', 'Image Uploaded', 'Menu item image uploaded successfully!');
  };

  const handleAddMenu = () => {
    if (!menuForm.name || !menuForm.price) return;
    const imageMap: Record<string, string> = {
      breakfast: '/food-breakfast.jpg',
      lunch: '/food-rice.jpg',
      dinner: '/food-dinner.jpg',
      drinks: '/food-drinks.jpg',
    };
    const finalImage = menuForm.image || imageMap[menuForm.category] || '/food-rice.jpg';

    if (editMenuId) {
      const existing = state.menuItems.find(m => String(m.id) === String(editMenuId))!;
      dispatch({
        type: 'UPDATE_MENU_ITEM',
        payload: {
          ...existing,
          name: menuForm.name,
          description: menuForm.description,
          price: Number(menuForm.price),
          category: menuForm.category as MenuItem['category'],
          badge: menuForm.badge,
          available: menuForm.available,
          image: finalImage,
        },
      });
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
        image: finalImage,
      };
      dispatch({ type: 'ADD_MENU_ITEM', payload: newItem });
      addNotification('success', 'Meal Added', `${menuForm.name} added to menu`);
    }
    setMenuForm({ name: '', description: '', price: '', category: 'breakfast', badge: '', available: true, image: '' });
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: isSupabaseConfigured ? 'rgba(40,167,69,0.1)' : 'rgba(200,155,60,0.1)',
              border: `1px solid ${isSupabaseConfigured ? 'rgba(40,167,69,0.3)' : 'rgba(200,155,60,0.3)'}`,
              borderRadius: '20px', padding: '5px 12px', fontSize: '0.75rem',
            }}>
              <span style={{ fontSize: '0.65rem' }}>{isSupabaseConfigured ? '🟢' : '⚡'}</span>
              <span style={{ color: isSupabaseConfigured ? 'var(--success)' : 'var(--gold)', fontWeight: 600 }}>
                {isSupabaseConfigured ? (isSupabaseLive ? 'Supabase Live' : 'Supabase Syncing') : 'Demo Mode'}
              </span>
            </div>

            <button
              className="btn-outline-gold"
              onClick={async () => {
                setIsSyncing(true);
                await refreshData();
                setIsSyncing(false);
                addNotification('info', 'Data Synchronized', 'Dashboard synced with Supabase PostgreSQL database');
              }}
              disabled={isSyncing}
              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Pull latest records from Supabase"
            >
              <i className={`fas fa-sync-alt ${isSyncing ? 'fa-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>

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
                        <th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.orders.slice(0, 6).map(o => (
                        <tr key={o.id}>
                          <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</td>
                          <td>{o.customerName}</td>
                          <td>₦{o.total.toLocaleString()}</td>
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
                        <th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th>
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
                              <button
                                className="btn-danger"
                                style={{ padding: '4px 8px', fontSize: '0.78rem', background: 'rgba(220,53,69,0.2)', border: '1px solid var(--danger)', cursor: 'pointer' }}
                                title="Delete order from database"
                                onClick={() => {
                                  setDeleteModal({
                                    title: 'Delete Order',
                                    itemType: 'Order',
                                    itemName: `Order ${o.orderNumber}`,
                                    itemSubtitle: `Customer: ${o.customerName} • ₦${o.total.toLocaleString()} • Status: ${o.status.toUpperCase()}`,
                                    warningNote: 'This will permanently remove this order and all its items from the database.',
                                    onConfirm: async () => {
                                      dispatch({ type: 'DELETE_ORDER', payload: o.id });
                                      addNotification('warning', 'Order Deleted', `Order ${o.orderNumber} deleted from database`);
                                    },
                                  });
                                }}
                              >
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
            </div>
          )}

          {/* ===== RIDERS ===== */}
          {section === 'riders' && (
            <div className="tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', margin: 0 }}>Dispatch Riders ({state.riders.length})</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                    Admin registers riders.
                  </p>
                </div>
                <button className="btn-gold" onClick={() => { setShowRiderForm(!showRiderForm); setEditRiderId(null); setRiderForm({ name: '', email: '', phone: '', bikeNumber: '', licenseNumber: '' }); }}>
                  <i className="fas fa-plus" style={{ marginRight: '6px' }} /> Register Rider
                </button>
              </div>

              {showRiderForm && (
                <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(200,155,60,0.3)', background: 'rgba(20,20,20,0.95)' }}>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.25rem', color: 'var(--gold)' }}>
                    {editRiderId ? 'Edit Rider Profile' : 'Register New Dispatch Rider'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input type="text" className="form-control" value={riderForm.name} onChange={e => setRiderForm({ ...riderForm, name: e.target.value })} placeholder="e.g. Babatunde Afolabi" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gmail / Login Email *</label>
                      <input type="email" className="form-control" value={riderForm.email} onChange={e => setRiderForm({ ...riderForm, email: e.target.value })} placeholder="rider@gmail.com" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input type="tel" className="form-control" value={riderForm.phone} onChange={e => setRiderForm({ ...riderForm, phone: e.target.value })} placeholder="08012345678" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bike Number Plate</label>
                      <input type="text" className="form-control" value={riderForm.bikeNumber} onChange={e => setRiderForm({ ...riderForm, bikeNumber: e.target.value })} placeholder="ABJ-123-DP" />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Rider License Number</label>
                      <input type="text" className="form-control" value={riderForm.licenseNumber} onChange={e => setRiderForm({ ...riderForm, licenseNumber: e.target.value })} placeholder="LIC-003" />
                    </div>
                  </div>

                  {/* Real-time Generated Credential Preview */}
                  {!editRiderId && (
                    <div style={{
                      background: 'rgba(200,155,60,0.08)',
                      border: '1px dashed rgba(200,155,60,0.3)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}>
                      <div style={{ fontSize: '0.82rem' }}>
                        <div style={{ color: 'var(--gold)', fontWeight: 700 }}>
                          <i className="fas fa-key" style={{ marginRight: '6px' }} />
                          Auto-Generated Credentials (Rider #{state.riders.length + 1}):
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>
                          Login Email: <strong style={{ color: 'var(--white)' }}>{riderForm.email.trim() || `${(riderForm.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'rider')}@gmail.com`}</strong>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Login Password: <strong style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>riders{state.riders.length + 1}</strong>
                        </div>
                      </div>
                      <span className="badge badge-gold" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        Portal: /rider
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-gold" onClick={handleAddRider}>
                      <i className="fas fa-save" style={{ marginRight: '6px' }} /> {editRiderId ? 'Update Rider' : 'Register Rider & Save Credentials'}
                    </button>
                    <button className="btn-outline-gold" onClick={() => { setShowRiderForm(false); setEditRiderId(null); }}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="grid-3">
                {state.riders.map((rider, idx) => {
                  const roleNum = rider.roleNumber || idx + 1;
                  const riderEmail = rider.email || `${rider.name.toLowerCase().split(' ')[0]}@gmail.com`;

                  return (
                    <div key={rider.id} className="rider-card" style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 12, right: 12 }}>
                        <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                          Rider #{roleNum}
                        </span>
                      </div>
                      <div className="rider-avatar">🏍️</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{rider.name}</div>
                      <span className={`badge badge-${rider.availability}`}>{rider.availability}</span>

                      {/* Account Box */}
                      <div style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        textAlign: 'left',
                      }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Email: <span style={{ color: 'var(--white)' }}>{riderEmail}</span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--gold)', fontSize: '0.72rem' }}>🔒 Supabase Auth</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`Email: ${riderEmail}\nPortal: /rider`);
                              addNotification('info', 'Details Copied', `Copied login email for ${rider.name}`);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.72rem', padding: 0 }}
                          >
                            📋 Copy Email
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{rider.phone}</div>
                      <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{rider.bikeNumber}</div>

                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
                        <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '6px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{rider.totalDeliveries}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Deliveries</div>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '6px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{rider.rating}★</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Rating</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
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
                          onClick={() => {
                            setShowRiderForm(true);
                            setEditRiderId(rider.id);
                            setRiderForm({
                              name: rider.name,
                              email: riderEmail,
                              phone: rider.phone,
                              bikeNumber: rider.bikeNumber,
                              licenseNumber: rider.licenseNumber,
                            });
                          }}>
                          Edit
                        </button>
                        <button className="btn-danger" style={{ padding: '6px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                          title="Delete rider record"
                          onClick={() => {
                            setDeleteModal({
                              title: 'Delete Dispatch Rider',
                              itemType: 'Rider',
                              itemName: rider.name,
                              itemSubtitle: `${riderEmail} • Bike: ${rider.bikeNumber || 'N/A'} • Role #${roleNum}`,
                              warningNote: 'This will permanently remove this rider, revoke their login access, and delete their profile from the database.',
                              onConfirm: async () => {
                                dispatch({ type: 'DELETE_RIDER', payload: rider.id });
                                addNotification('warning', 'Rider Removed', `${rider.name} deleted from database and credentials revoked`);
                              },
                            });
                          }}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== SALES REPS ===== */}
          {section === 'salesreps' && (
            <div className="tab-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', margin: 0 }}>Sales Representatives ({state.salesReps.length})</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                    Admin registers sales reps.
                  </p>
                </div>
                <button className="btn-gold" onClick={() => { setShowRepForm(!showRepForm); setEditRepId(null); setRepForm({ name: '', email: '', phone: '', address: '' }); }}>
                  <i className="fas fa-plus" style={{ marginRight: '6px' }} /> Register Sales Rep
                </button>
              </div>

              {showRepForm && (
                <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(200,155,60,0.3)', background: 'rgba(20,20,20,0.95)' }}>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.25rem', color: 'var(--gold)' }}>
                    {editRepId ? 'Edit Sales Rep Profile' : 'Register New Sales Representative'}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input type="text" className="form-control" value={repForm.name} onChange={e => setRepForm({ ...repForm, name: e.target.value })} placeholder="e.g. Adaeze Okonkwo" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gmail / Login Email *</label>
                      <input type="email" className="form-control" value={repForm.email} onChange={e => setRepForm({ ...repForm, email: e.target.value })} placeholder="rep@gmail.com" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input type="tel" className="form-control" value={repForm.phone} onChange={e => setRepForm({ ...repForm, phone: e.target.value })} placeholder="08012345678" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Office / Branch Address</label>
                      <input type="text" className="form-control" value={repForm.address} onChange={e => setRepForm({ ...repForm, address: e.target.value })} placeholder="Lagos, Nigeria" />
                    </div>
                  </div>

                  {/* Real-time Generated Credential Preview */}
                  {!editRepId && (
                    <div style={{
                      background: 'rgba(200,155,60,0.08)',
                      border: '1px dashed rgba(200,155,60,0.3)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}>
                      <div style={{ fontSize: '0.82rem' }}>
                        <div style={{ color: 'var(--gold)', fontWeight: 700 }}>
                          <i className="fas fa-key" style={{ marginRight: '6px' }} />
                          Auto-Generated Credentials (Sales Rep #{state.salesReps.length + 1}):
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>
                          Login Gmail: <strong style={{ color: 'var(--white)' }}>{repForm.email.trim() || 'rep@gmail.com'}</strong>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                          Login Password: <strong style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>salesrep{state.salesReps.length + 1}</strong>
                        </div>
                      </div>
                      <span className="badge badge-gold" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        Portal: /salesrep
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-gold" onClick={handleAddRep}>
                      <i className="fas fa-save" style={{ marginRight: '6px' }} /> {editRepId ? 'Update Rep' : 'Register Rep & Save Credentials'}
                    </button>
                    <button className="btn-outline-gold" onClick={() => { setShowRepForm(false); setEditRepId(null); }}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Security</th>
                      <th>Phone</th>
                      <th>Orders Handled</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.salesReps.map((rep, idx) => {
                      const roleNum = rep.roleNumber || idx + 1;

                      return (
                        <tr key={rep.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>{rep.name.charAt(0)}</div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{rep.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>Rep #{roleNum}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {rep.email}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--gold)', fontSize: '0.78rem', background: 'rgba(200,155,60,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(200,155,60,0.2)' }}>
                                🔒 Supabase Auth
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`Email: ${rep.email}\nPortal: /salesrep`);
                                  addNotification('info', 'Details Copied', `Copied login email for ${rep.name}`);
                                }}
                                title="Copy login email"
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                📋
                              </button>
                            </div>
                          </td>
                          <td style={{ color: 'rgba(255,255,255,0.5)' }}>{rep.phone}</td>
                          <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{rep.ordersHandled}</td>
                          <td><span className={`badge badge-${rep.status === 'active' ? 'available' : 'offline'}`}>{rep.status}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn-outline-gold" style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                onClick={() => {
                                  setShowRepForm(true);
                                  setEditRepId(rep.id);
                                  setRepForm({ name: rep.name, email: rep.email, phone: rep.phone, address: rep.address });
                                }}>
                                Edit
                              </button>
                              <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.78rem', cursor: 'pointer' }}
                                title="Delete sales rep"
                                onClick={() => {
                                  setDeleteModal({
                                    title: 'Delete Sales Representative',
                                    itemType: 'Sales Representative',
                                    itemName: rep.name,
                                    itemSubtitle: `${rep.email} • Role #${rep.roleNumber || 1} • Orders Handled: ${rep.ordersHandled}`,
                                    warningNote: 'This will permanently remove this sales representative, revoke their login access, and delete their profile from the database.',
                                    onConfirm: async () => {
                                      dispatch({ type: 'DELETE_SALES_REP', payload: rep.id });
                                      addNotification('warning', 'Rep Removed', `${rep.name} deleted from database and credentials revoked`);
                                    },
                                  });
                                }}>
                                <i className="fas fa-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Meal Image (Supabase Storage)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="btn-outline-gold"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        <i className={`fas fa-${uploadingImage ? 'spinner fa-spin' : 'cloud-upload-alt'}`} style={{ marginRight: '8px' }} />
                        {uploadingImage ? 'Uploading to Supabase Storage...' : 'Upload Image File'}
                      </button>

                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={menuForm.image}
                          onChange={e => setMenuForm({ ...menuForm, image: e.target.value })}
                          placeholder="Or paste direct image URL (https://...)"
                          style={{ fontSize: '0.82rem' }}
                        />
                      </div>

                      {menuForm.image && (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={menuForm.image}
                            alt="Preview"
                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--gold)' }}
                          />
                          <button
                            type="button"
                            onClick={() => setMenuForm({ ...menuForm, image: '' })}
                            style={{
                              position: 'absolute', top: -6, right: -6, background: 'var(--danger)',
                              color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18,
                              fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button className="btn-gold" onClick={handleAddMenu}>
                    <i className={`fas fa-${editMenuId ? 'save' : 'plus'}`} style={{ marginRight: '6px' }} />
                    {editMenuId ? 'Update Meal' : 'Add Meal'}
                  </button>
                  {editMenuId && (
                    <button className="btn-outline-gold" onClick={() => { setEditMenuId(null); setMenuForm({ name: '', description: '', price: '', category: 'breakfast', badge: '', available: true, image: '' }); }}>
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
                              onClick={() => { setEditMenuId(item.id); setMenuForm({ name: item.name, description: item.description, price: String(item.price), category: item.category, badge: item.badge || '', available: item.available, image: item.image || '' }); }}>
                              Edit
                            </button>
                            <button
                              style={{ padding: '4px 10px', fontSize: '0.78rem', background: item.available ? 'rgba(255,193,7,0.1)' : 'rgba(40,167,69,0.1)', border: `1px solid ${item.available ? '#FFC107' : 'var(--success)'}`, color: item.available ? '#FFC107' : 'var(--success)', borderRadius: '6px', cursor: 'pointer' }}
                              onClick={() => dispatch({ type: 'UPDATE_MENU_ITEM', payload: { ...item, available: !item.available } })}
                            >
                              {item.available ? 'Disable' : 'Enable'}
                            </button>
                            <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '0.78rem', cursor: 'pointer' }}
                              title="Delete meal"
                              onClick={() => {
                                setDeleteModal({
                                  title: 'Delete Meal from Menu',
                                  itemType: 'Menu Item',
                                  itemName: item.name,
                                  itemSubtitle: `Category: ${item.category} • Price: ₦${item.price.toLocaleString()}`,
                                  warningNote: 'This will permanently remove this meal from the customer menu and database.',
                                  onConfirm: async () => {
                                    dispatch({ type: 'DELETE_MENU_ITEM', payload: item.id });
                                    addNotification('warning', 'Meal Deleted', `"${item.name}" deleted from menu and database`);
                                  },
                                });
                              }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
                <div>
                  <div style={{ position: 'relative' }}>
                    <AdminFleetMap riders={state.riders} />
                    {/* Map Header Status Overlay */}
                    <div style={{
                      position: 'absolute', top: 16, left: 16, zIndex: 500,
                      background: 'rgba(20,20,20,0.88)', padding: '8px 14px', borderRadius: '10px',
                      border: '1px solid rgba(200,155,60,0.3)', display: 'flex', alignItems: 'center', gap: '10px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                    }}>
                      <span style={{ fontSize: '0.9rem' }}>🛰️</span>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold)' }}>Live Fleet Operations Map</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                          {state.riders.filter(r => r.availability === 'busy').length} active deliveries • Supabase GPS Sync
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1rem' }}>Active Deliveries</h4>
                  {state.orders.filter(o => o.status === 'onway').length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <div style={{ fontSize: '2rem' }}>🏍️</div>
                      <p>No active deliveries right now</p>
                    </div>
                  ) : (
                    state.orders.filter(o => o.status === 'onway').map(o => (
                      <div key={o.id} className="order-detail-card" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.orderNumber}</span>
                          <span className="badge badge-onway">On Way</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', marginBottom: '4px' }}><strong>Rider:</strong> {o.riderName || 'Assigned Rider'}</p>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                          <i className="fas fa-map-marker-alt" style={{ marginRight: '4px', color: 'var(--gold)' }} />
                          {o.deliveryAddress}
                        </p>
                        <div className="progress-bar-wrapper" style={{ marginTop: '8px' }}>
                          <div className="progress-bar-fill" style={{ width: '70%' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          <span>GPS Active (4G)</span>
                          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Est. 8 mins</span>
                        </div>
                      </div>
                    ))
                  )}

                  <h4 style={{ fontFamily: 'Playfair Display, serif', margin: '1.5rem 0 1rem' }}>Fleet Status</h4>
                  {state.riders.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '1.3rem' }}>🏍️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                          {r.bikeNumber || r.phone}
                        </div>
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
              {/* Registered Customer Accounts Section */}
              <div className="data-table-wrapper" style={{ marginBottom: '2rem' }}>
                <div className="data-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="data-table-title">Registered Customer Accounts ({registeredCustomers.length})</span>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                      All registered customers who can sign in with their email and password. Admins can edit or delete accounts.
                    </p>
                  </div>
                  <button
                    className="btn-outline-gold"
                    style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                    onClick={refreshCustomers}
                  >
                    <i className="fas fa-sync-alt" style={{ marginRight: '6px' }} /> Refresh
                  </button>
                </div>

                {registeredCustomers.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                    No registered customers yet. New customers registering on the Customer Login page will appear here.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Email</th>
                        <th>Phone Number</th>
                        <th>Registered Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredCustomers.map(cust => {
                        const isEditing = editingCustomerEmail === cust.email;
                        return (
                          <tr key={cust.email}>
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-control"
                                  value={customerEditForm.name}
                                  onChange={e => setCustomerEditForm({ ...customerEditForm, name: e.target.value })}
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                  <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.85rem' }}>
                                    {(cust.full_name || cust.email || 'C').charAt(0).toUpperCase()}
                                  </div>
                                  {cust.full_name || cust.email.split('@')[0]}
                                </div>
                              )}
                            </td>
                            <td style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>{cust.email}</td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-control"
                                  value={customerEditForm.phone}
                                  onChange={e => setCustomerEditForm({ ...customerEditForm, phone: e.target.value })}
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                              ) : (
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{cust.phone || 'N/A'}</span>
                              )}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                              {cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-NG') : 'Recent'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {isEditing ? (
                                  <>
                                    <button
                                      className="btn-gold"
                                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                      onClick={() => handleSaveCustomer(cust.email)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      className="btn-outline-gold"
                                      style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                      onClick={() => setEditingCustomerEmail(null)}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      className="btn-outline-gold"
                                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                                      onClick={() => handleStartEditCustomer(cust)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn-danger"
                                      style={{ padding: '4px 8px', fontSize: '0.78rem', cursor: 'pointer' }}
                                      title="Delete customer record"
                                      onClick={() => handleDeleteCustomer(cust.email, cust.full_name || cust.email)}
                                    >
                                      <i className="fas fa-trash" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Customer Orders Summary Section */}
              <div className="data-table-wrapper">
                <div className="data-table-header">
                  <span className="data-table-title">Customer Orders & Lifetime Spend</span>
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

      {/* Staff Credentials Success Modal */}
      {createdStaffCredential && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div style={{
            background: 'var(--dark-2)',
            border: '2px solid var(--gold)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: 'var(--gold)', margin: 0 }}>
              Staff Credentials Generated!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: '6px' }}>
              The new {createdStaffCredential.role} has been registered and can now sign in using their Gmail and assigned password:
            </p>

            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(200,155,60,0.3)',
              borderRadius: '12px',
              padding: '1.25rem',
              margin: '1.5rem 0',
              textAlign: 'left',
              fontSize: '0.88rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Staff Name:</span>
                <span style={{ fontWeight: 700, color: 'var(--white)' }}>{createdStaffCredential.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Assigned Role:</span>
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{createdStaffCredential.role} #{createdStaffCredential.roleNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Login Gmail:</span>
                <span style={{ color: 'var(--white)', fontFamily: 'monospace', fontWeight: 600 }}>{createdStaffCredential.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Password:</span>
                <span style={{
                  color: 'var(--gold)',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  fontWeight: 800,
                  background: 'rgba(200,155,60,0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}>
                  {createdStaffCredential.password}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Portal Route:</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{createdStaffCredential.portalUrl}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-gold"
                style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
                onClick={() => {
                  const text = `BRYBOS Staff Credentials\nRole: ${createdStaffCredential.role} #${createdStaffCredential.roleNumber}\nName: ${createdStaffCredential.name}\nLogin Email: ${createdStaffCredential.email}\nPassword: ${createdStaffCredential.password}\nPortal: ${createdStaffCredential.portalUrl}`;
                  navigator.clipboard.writeText(text);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 3000);
                  addNotification('success', 'Copied to Clipboard', 'Staff credentials copied successfully');
                }}
              >
                {copiedKey ? '✅ Copied to Clipboard!' : '📋 Copy Credentials'}
              </button>
              <button
                type="button"
                className="btn-outline-gold"
                style={{ padding: '10px 16px', fontSize: '0.88rem' }}
                onClick={() => setCreatedStaffCredential(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONFIRM DELETE MODAL ===== */}
      {deleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.25rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDeleteModal(null);
            }
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              border: '1px solid rgba(220,53,69,0.45)',
              background: '#161616',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(220,53,69,0.2)',
              textAlign: 'center',
              padding: '2rem 1.75rem',
              borderRadius: '16px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(220,53,69,0.15)',
                border: '2px solid rgba(220,53,69,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <i className="fas fa-trash-alt" style={{ fontSize: '1.6rem', color: '#ff4d4d' }} />
            </div>

            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.35rem', margin: '0 0 0.5rem', color: 'var(--white)' }}>
              {deleteModal.title}
            </h3>

            <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'rgba(255,255,255,0.6)' }}>
              Are you sure you want to permanently delete this {deleteModal.itemType.toLowerCase()}?
            </p>

            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '1rem',
                margin: '1rem 0',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--white)', marginBottom: '4px' }}>
                {deleteModal.itemName}
              </div>
              {deleteModal.itemSubtitle && (
                <div style={{ fontSize: '0.82rem', color: 'var(--gold)', marginBottom: '8px' }}>
                  {deleteModal.itemSubtitle}
                </div>
              )}
              {deleteModal.warningNote && (
                <div style={{ fontSize: '0.78rem', color: '#ff8080', display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px' }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{deleteModal.warningNote}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn-outline-gold"
                style={{ flex: 1, padding: '11px', fontSize: '0.9rem', borderRadius: '8px' }}
                disabled={isDeleting}
                onClick={() => setDeleteModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                style={{
                  flex: 1.2,
                  padding: '11px',
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(220,53,69,0.3)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteModal.onConfirm();
                  } finally {
                    setIsDeleting(false);
                    setDeleteModal(null);
                  }
                }}
              >
                {isDeleting ? (
                  <>
                    <i className="fas fa-spinner fa-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash-alt" /> Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
