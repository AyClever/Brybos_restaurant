import { useState } from 'react';
import { useApp, Order, OrderStatus } from '../store/AppContext';

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'approved', 'assigned', 'onway', 'delivered'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  approved: 'Approved',
  assigned: 'Rider Assigned',
  onway: 'On The Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: '⏳',
  confirmed: '✅',
  preparing: '👨‍🍳',
  approved: '👍',
  assigned: '🏍️',
  onway: '🛣️',
  delivered: '📦',
  cancelled: '❌',
};

function OrderCard({ order, onCancel }: { order: Order; onCancel: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const stepIdx = STATUS_STEPS.indexOf(order.status);

  return (
    <div style={{
      background: 'var(--dark-2)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', overflow: 'hidden', marginBottom: '1rem',
      transition: 'all 0.3s',
    }}>
      {/* Header */}
      <div
        style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
        }}>
          {STATUS_ICONS[order.status]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{order.orderNumber}</span>
            <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
            <span className={`badge badge-${order.paymentStatus}`}>{order.paymentStatus}</span>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
            {order.items.length} item(s) • ₦{order.total.toLocaleString()} •{' '}
            {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Tracking */}
          {order.status !== 'cancelled' && (
            <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                Order Progress
              </p>
              <div className="tracking-steps">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className={`tracking-step ${i < stepIdx ? 'done' : i === stepIdx ? 'current' : ''}`}>
                    <div className="step-icon">{STATUS_ICONS[s]}</div>
                    <div className="step-label">{STATUS_LABELS[s]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Items Ordered</p>
            {order.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.9rem' }}>
                <span>{item.name} × {item.quantity}</span>
                <span style={{ color: 'var(--gold)' }}>₦{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Delivery info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
            <div style={{ background: 'var(--dark-3)', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery To</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{order.customerName}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>{order.deliveryAddress}</p>
            </div>
            {order.riderName && (
              <div style={{ background: 'var(--dark-3)', borderRadius: '10px', padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Rider</p>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>🏍️ {order.riderName}</p>
                <p style={{ color: 'var(--success)', fontSize: '0.82rem', marginTop: '4px' }}>Live tracking available</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
            {order.riderName && order.status === 'onway' && (
              <button className="btn-success" style={{ padding: '8px 20px' }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight: '6px' }} /> Track Rider
              </button>
            )}
            {['pending', 'confirmed'].includes(order.status) && (
              <button className="btn-danger" onClick={() => onCancel(order.id)} style={{ padding: '8px 20px' }}>
                <i className="fas fa-times" style={{ marginRight: '6px' }} /> Cancel Order
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { state, dispatch, addNotification } = useApp();
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');

  const userOrders = state.user
    ? state.orders.filter(o => o.customerEmail === state.user?.email || o.customerId === state.user?.id)
    : state.orders;

  const filtered = filter === 'all' ? userOrders : userOrders.filter(o => o.status === filter);

  const handleCancel = (id: string) => {
    dispatch({ type: 'CANCEL_ORDER', payload: id });
    addNotification('warning', 'Order Cancelled', `Your order has been cancelled successfully.`);
  };

  return (
    <div className="page-transition" style={{ paddingTop: '70px', minHeight: '100vh', padding: '90px 2rem 2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--gold)' }}>My</span> Orders
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Track and manage all your food orders</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {(['all', 'pending', 'preparing', 'onway', 'delivered', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 18px', borderRadius: '20px', cursor: 'pointer',
                background: filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
                color: filter === f ? 'var(--dark)' : 'rgba(255,255,255,0.6)',
                fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize', transition: 'all 0.2s',
              }}
            >
              {f === 'all' ? 'All Orders' : STATUS_LABELS[f as OrderStatus]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No orders found</p>
          </div>
        ) : (
          filtered.map(order => (
            <OrderCard key={order.id} order={order} onCancel={handleCancel} />
          ))
        )}
      </div>
    </div>
  );
}
