import { useState } from 'react';
import { useApp, Order, OrderStatus } from '../store/AppContext';
import LiveRiderTrackingModal from '../components/LiveRiderTrackingModal';

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'onway', 'delivered'];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
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
  ready: '🍱',
  approved: '👍',
  assigned: '🏍️',
  onway: '🛣️',
  delivered: '📦',
  cancelled: '❌',
};

function OrderCard({
  order,
  onCancel,
  onTrack,
}: {
  order: Order;
  onCancel: (id: string) => void;
  onTrack: (order: Order) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Map approved status to confirmed index in the pipeline
  const normalizedStatus = order.status === 'approved' ? 'confirmed' : order.status;
  const stepIdx = STATUS_STEPS.indexOf(normalizedStatus as OrderStatus);
  const isDelivered = order.status === 'delivered';
  const isOnWay = order.status === 'onway' || (order.status === 'assigned' && !!order.riderName);

  return (
    <div style={{
      background: 'var(--dark-2)',
      border: isDelivered ? '1px solid rgba(40,167,69,0.3)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '1rem',
      transition: 'all 0.3s',
    }}>
      {/* Header */}
      <div
        style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: isDelivered ? 'rgba(40,167,69,0.15)' : 'rgba(200,155,60,0.1)',
          border: isDelivered ? '1px solid rgba(40,167,69,0.4)' : '1px solid rgba(200,155,60,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
        }}>
          {isDelivered ? '✓' : STATUS_ICONS[order.status]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{order.orderNumber}</span>
            {/* Show only the actual current status */}
            <span
              className={`badge badge-${order.status}`}
              style={isDelivered ? { background: 'rgba(40,167,69,0.2)', color: '#28a745', border: '1px solid rgba(40,167,69,0.4)', fontWeight: 700 } : undefined}
            >
              {isDelivered ? '✓ Delivered' : STATUS_LABELS[order.status]}
            </span>
            {isDelivered && (
              <span style={{ fontSize: '0.72rem', color: 'rgba(40,167,69,0.9)', fontWeight: 700, letterSpacing: '0.5px' }}>
                (FINAL STATUS)
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>
            {order.items.length} item(s) • ₦{order.total.toLocaleString()} •{' '}
            {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Quick Track Rider button on header when active */}
        {isOnWay && (
          <button
            className="btn-success"
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onTrack(order);
            }}
          >
            <i className="fas fa-map-marker-alt" /> Track Rider
          </button>
        )}

        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Delivered Prominent Status Card */}
          {isDelivered && (
            <div style={{
              marginTop: '1.25rem',
              background: 'rgba(40, 167, 69, 0.12)',
              border: '1px solid rgba(40, 167, 69, 0.4)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>🎉</span>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Order Delivered</span>
                    <span style={{
                      background: 'var(--success)',
                      color: '#000',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      letterSpacing: '0.5px',
                    }}>
                      FINAL STATUS: DELIVERED
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>
                    Your order was successfully delivered{order.riderName ? ` by ${order.riderName}` : ''}. Thank you for ordering from Brybos!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tracking progression */}
          {order.status !== 'cancelled' && (
            <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                Order Progress
              </p>
              <div className="tracking-steps">
                {STATUS_STEPS.map((s, i) => {
                  const isDone = isDelivered ? true : i < stepIdx;
                  const isCurrent = isDelivered ? s === 'delivered' : i === stepIdx;
                  return (
                    <div key={s} className={`tracking-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                      <div className="step-icon">{STATUS_ICONS[s]}</div>
                      <div className="step-label">
                        {s === 'delivered' && isDelivered ? 'Delivered (Final)' : STATUS_LABELS[s]}
                      </div>
                    </div>
                  );
                })}
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
                <p style={{ color: isDelivered ? 'var(--success)' : 'var(--gold)', fontSize: '0.82rem', marginTop: '4px' }}>
                  {isDelivered ? 'Delivery completed' : 'Live tracking active'}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isOnWay && (
              <button
                className="btn-success"
                onClick={() => onTrack(order)}
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                <i className="fas fa-map-marker-alt" /> Track Rider
              </button>
            )}
            {['pending', 'confirmed'].includes(order.status) && (
              <button className="btn-danger" onClick={() => onCancel(order.id)} style={{ padding: '8px 20px', cursor: 'pointer' }}>
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
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  const userOrders = state.user
    ? state.orders.filter(o => o.customerEmail === state.user?.email || String(o.customerId) === String(state.user?.id))
    : state.orders;

  const filtered = filter === 'all' ? userOrders : userOrders.filter(o => o.status === filter);

  const handleCancel = (id: string) => {
    dispatch({ type: 'CANCEL_ORDER', payload: id });
    addNotification('warning', 'Order Cancelled', `Your order has been cancelled successfully.`);
  };

  return (
    <div className="page-transition" style={{ paddingTop: '70px', minHeight: '100vh', padding: '90px 2rem 2rem' }}>
      {/* Live Rider Tracking Modal */}
      {trackingOrder && (
        <LiveRiderTrackingModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
        />
      )}

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
                padding: '7px 18px',
                borderRadius: '20px',
                cursor: 'pointer',
                background: filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${filter === f ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
                color: filter === f ? 'var(--dark)' : 'rgba(255,255,255,0.6)',
                fontWeight: 600,
                fontSize: '0.85rem',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
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
            <OrderCard
              key={order.id}
              order={order}
              onCancel={handleCancel}
              onTrack={(o) => setTrackingOrder(o)}
            />
          ))
        )}
      </div>
    </div>
  );
}
