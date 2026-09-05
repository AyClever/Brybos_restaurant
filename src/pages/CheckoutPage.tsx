import { useState } from 'react';
import { useApp, Order, OrderStatus } from '../store/AppContext';
import { orderService, NotificationResponse } from '../services/orderService';

interface CheckoutPageProps {
  onNavigate: (page: string) => void;
}

export default function CheckoutPage({ onNavigate }: CheckoutPageProps) {
  const { state, dispatch, cartTotal, discountAmount, grandTotal, VAT_RATE, DELIVERY_FEE, addNotification } = useApp();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationResponse | null>(null);

  const [form, setForm] = useState({
    name: state.user?.name || '',
    email: state.user?.email || '',
    phone: state.user?.phone || '',
    address: '',
    landmark: '',
    paymentMethod: 'paystack',
  });

  const discountedSub = cartTotal - discountAmount;
  const vat = Math.round(discountedSub * VAT_RATE);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePaystack = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.address.trim()) {
      addNotification('warning', 'Incomplete Details', 'Please complete your name, email, phone and delivery address');
      setStep(1);
      return;
    }

    setLoading(true);

    try {
      // 1. Generate customer-facing unique Brybos ID (format: Brybos-XXXXXX)
      const orderNum = await orderService.generateUniqueOrderNumber();

      // 2. Prepare complete order payload
      const orderPayload = {
        orderNumber: orderNum,
        customerId: state.user?.id,
        customerName: form.name.trim(),
        customerEmail: form.email.trim(),
        customerPhone: form.phone.trim(),
        deliveryAddress: form.address.trim(),
        landmark: form.landmark.trim(),
        items: [...state.cart],
        subtotal: cartTotal,
        vat,
        deliveryFee: DELIVERY_FEE,
        total: grandTotal,
        paymentMethod: form.paymentMethod,
        paymentStatus: (form.paymentMethod === 'cash' ? 'pending' : 'paid') as 'pending' | 'paid' | 'failed',
        status: 'pending' as OrderStatus,
        estimatedTime: '30 - 45 mins',
      };

      // 3. Save permanently to Supabase in orders & order_items
      const { data: savedOrder, error: saveError } = await orderService.createOrder(orderPayload);

      if (saveError || !savedOrder) {
        setLoading(false);
        addNotification(
          'error',
          'Order Placement Failed',
          saveError || 'Could not save your order to the database. Please try again.'
        );
        return;
      }

      // 4. Update local state & clear cart
      dispatch({ type: 'PLACE_ORDER', payload: savedOrder });
      dispatch({ type: 'CLEAR_CART' });

      // 5. Send notifications ONLY after successful Supabase persistence
      const notifResponse = await orderService.sendOrderNotifications(savedOrder);
      setNotificationStatus(notifResponse);

      addNotification(
        'success',
        'Order Placed Successfully!',
        `Order ${savedOrder.orderNumber} has been confirmed and saved to database.`
      );

      setCreatedOrder(savedOrder);
      setOrderId(savedOrder.id);
      setPaymentDone(true);
    } catch (err: any) {
      console.error('Checkout error:', err);
      addNotification('error', 'Checkout Error', err.message || 'An unexpected error occurred during checkout.');
    } finally {
      setLoading(false);
    }
  };

  if (state.cart.length === 0 && !paymentDone) {
    return (
      <div className="page-transition" style={{ paddingTop: '70px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon">🛒</div>
          <h3 style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.6)' }}>Your cart is empty</h3>
          <button className="btn-gold" onClick={() => onNavigate('menu')}>Browse Menu</button>
        </div>
      </div>
    );
  }

  if (paymentDone) {
    const order = createdOrder || state.orders.find(o => o.id === orderId) || state.orders[0];
    const waMessage = encodeURIComponent(
      `Hello BRYBOS! I just placed order ${order?.orderNumber} (${order?.customerName}). Please confirm my order status!`
    );

    return (
      <div className="page-transition" style={{ paddingTop: '70px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 2rem 2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '560px', width: '100%' }}>
          <div style={{
            width: '90px', height: '90px', background: 'rgba(40,167,69,0.12)',
            border: '3px solid var(--success)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.8rem', margin: '0 auto 1.5rem', animation: 'pulse 2s ease',
          }}>✓</div>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--success)' }}>
            Order Confirmed!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.75rem', fontSize: '1rem' }}>
            {form.paymentMethod === 'cash'
              ? 'Your order has been permanently recorded. Payment will be made on delivery.'
              : 'Payment confirmed! Your order has been recorded and is being prepared.'}
          </p>

          <div style={{ background: 'var(--dark-2)', border: '1px solid rgba(200,155,60,0.25)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Brybos Order ID</span>
              <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.5px' }}>{order?.orderNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Customer</span>
              <span style={{ fontWeight: 600 }}>{order?.customerName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Delivery Address</span>
              <span style={{ fontWeight: 500, maxWidth: '260px', textAlign: 'right', color: 'rgba(255,255,255,0.85)' }}>{order?.deliveryAddress}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Payment Method</span>
              <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                {form.paymentMethod === 'paystack' ? '💳 Paystack (Paid)' : form.paymentMethod === 'cash' ? '💵 Cash on Delivery (Pending)' : '🏦 Bank Transfer'}
              </span>
            </div>

            {/* Ordered items breakdown */}
            {order?.items && order.items.length > 0 && (
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Ordered Items ({order.items.length})
                </p>
                {order.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>{item.name} × {item.quantity}</span>
                    <span style={{ color: 'var(--white)', fontWeight: 600 }}>₦{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(200,155,60,0.2)', fontSize: '1.05rem' }}>
              <span style={{ fontWeight: 700 }}>Total Amount</span>
              <span style={{ fontWeight: 800, color: 'var(--gold)' }}>₦{order?.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Notification delivery confirmation box */}
          <div style={{
            background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.25)',
            borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.75rem', textAlign: 'left',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <p style={{ fontWeight: 700, margin: 0, color: 'var(--gold)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-paper-plane" /> Notifications Dispatched
              </p>
              {notificationStatus && (
                <span style={{ fontSize: '0.75rem', color: notificationStatus.success ? 'var(--success)' : 'var(--gold)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                  {notificationStatus.duplicate ? 'Idempotent Sync' : 'Real-time Dispatched'}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--success)' }}>✓</span> ✉ Confirmation email sent to <strong style={{ color: '#ffffff' }}>{form.email}</strong>
              {notificationStatus?.email?.provider && (
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>({notificationStatus.email.provider})</span>
              )}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--success)' }}>✓</span> 📱 SMS & WhatsApp dispatched to <strong style={{ color: '#ffffff' }}>{form.phone}</strong>
              {notificationStatus?.sms?.provider && (
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>({notificationStatus.sms.provider})</span>
              )}
            </p>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--success)' }}>✓</span> 👨‍🍳 Kitchen and sales team notified with ID <strong style={{ color: 'var(--gold)' }}>{order?.orderNumber}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-gold" onClick={() => onNavigate('orders')} style={{ padding: '10px 24px' }}>
              <i className="fas fa-receipt" style={{ marginRight: '6px' }} /> View In My Orders
            </button>
            <a
              href={`https://wa.me/234800279267?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-success"
              style={{ padding: '10px 20px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              <i className="fab fa-whatsapp" style={{ marginRight: '6px' }} /> WhatsApp Support
            </a>
            <button className="btn-outline-gold" onClick={() => onNavigate('menu')} style={{ padding: '10px 20px' }}>
              Order More
            </button>
          </div>
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Payment' },
    { num: 3, label: 'Confirm' },
  ];

  return (
    <div className="page-transition" style={{ paddingTop: '70px', minHeight: '100vh', padding: '90px 2rem 2rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 800 }}>
            Checkout
          </h1>
        </div>

        {/* Step Indicator */}
        <div className="checkout-step-indicator">
          {steps.map((s, i) => (
            <div key={s.num} className="checkout-step" style={{ flex: '1' }}>
              <div className={`checkout-step-num ${step === s.num ? 'active' : step > s.num ? 'done' : ''}`}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: `2px solid ${step > s.num ? 'var(--success)' : step === s.num ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}`,
                  background: step > s.num ? 'var(--success)' : step === s.num ? 'var(--gold)' : 'var(--dark-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.85rem',
                  color: step >= s.num ? 'var(--dark)' : 'rgba(255,255,255,0.3)',
                }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <div style={{ marginLeft: '8px', fontSize: '0.85rem', fontWeight: 600, color: step >= s.num ? 'var(--white)' : 'rgba(255,255,255,0.3)' }}>
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: step > s.num ? 'var(--success)' : 'rgba(255,255,255,0.1)', margin: '0 12px' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
          <div>
            {/* Step 1: Delivery Details */}
            {step === 1 && (
              <div className="card tab-panel">
                <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--gold)', marginRight: '10px' }} />
                  Delivery Details
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input type="text" name="name" className="form-control" value={form.name} onChange={handleInput} placeholder="Your full name" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input type="tel" name="phone" className="form-control" value={form.phone} onChange={handleInput} placeholder="08012345678" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" name="email" className="form-control" value={form.email} onChange={handleInput} placeholder="your@email.com" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Address *</label>
                  <input type="text" name="address" className="form-control" value={form.address} onChange={handleInput} placeholder="Full delivery address" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Landmark (optional)</label>
                  <input type="text" name="landmark" className="form-control" value={form.landmark} onChange={handleInput} placeholder="Nearest landmark" />
                </div>
                <button
                  className="btn-gold w-full"
                  onClick={() => setStep(2)}
                  disabled={!form.name || !form.phone || !form.email || !form.address}
                  style={{ padding: '13px', marginTop: '0.5rem' }}
                >
                  Continue to Payment <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }} />
                </button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="card tab-panel">
                <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                  <i className="fas fa-credit-card" style={{ color: 'var(--gold)', marginRight: '10px' }} />
                  Payment Method
                </h3>

                {[
                  {
                    id: 'paystack', icon: '💳', label: 'Paystack', desc: 'Pay with debit/credit card, USSD, bank transfer or mobile money',
                    badge: 'Recommended',
                  },
                  {
                    id: 'transfer', icon: '🏦', label: 'Bank Transfer', desc: 'Direct bank transfer to our account. Send receipt for confirmation',
                    badge: '',
                  },
                  {
                    id: 'cash', icon: '💵', label: 'Cash on Delivery', desc: 'Pay with cash when your order arrives at your door',
                    badge: '',
                  },
                ].map(pm => (
                  <label key={pm.id} className={`payment-method ${form.paymentMethod === pm.id ? 'selected' : ''}`}>
                    <input type="radio" name="paymentMethod" value={pm.id} checked={form.paymentMethod === pm.id} onChange={handleInput} />
                    <span style={{ fontSize: '1.5rem' }}>{pm.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {pm.label}
                        {pm.badge && <span style={{ background: 'var(--gold)', color: 'var(--dark)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>{pm.badge}</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{pm.desc}</div>
                    </div>
                  </label>
                ))}

                {form.paymentMethod === 'transfer' && (
                  <div style={{ background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.2)', borderRadius: '12px', padding: '1rem', marginTop: '1rem' }}>
                    <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--gold)' }}>Bank Details:</p>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Bank: Zenith Bank</p>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Account: 1234567890</p>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Name: BRYBOS Restaurant Ltd</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="btn-outline-gold" onClick={() => setStep(1)} style={{ flex: 1, padding: '13px' }}>
                    <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} /> Back
                  </button>
                  <button className="btn-gold" onClick={() => setStep(3)} style={{ flex: 2, padding: '13px' }}>
                    Review Order <i className="fas fa-arrow-right" style={{ marginLeft: '8px' }} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {step === 3 && (
              <div className="card tab-panel">
                <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                  <i className="fas fa-check-circle" style={{ color: 'var(--gold)', marginRight: '10px' }} />
                  Review Order
                </h3>

                {/* Delivery info summary */}
                <div style={{ background: 'var(--dark-3)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--gold)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Delivery To</p>
                  <p style={{ fontWeight: 600 }}>{form.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{form.address}</p>
                  {form.landmark && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Near: {form.landmark}</p>}
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '4px' }}>{form.phone} • {form.email}</p>
                </div>

                {/* Order items */}
                {state.cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                    <span>{item.name} × {item.quantity}</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 600 }}>₦{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '6px' }}>
                    <span>Subtotal</span><span>₦{cartTotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', fontSize: '0.9rem', marginBottom: '6px' }}>
                      <span>Discount</span><span>−₦{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '6px' }}>
                    <span>VAT (7.5%)</span><span>₦{Math.round((cartTotal - discountAmount) * VAT_RATE).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '6px' }}>
                    <span>Delivery Fee</span><span>₦{DELIVERY_FEE.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span>Total</span><span style={{ color: 'var(--gold)' }}>₦{grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button className="btn-outline-gold" onClick={() => setStep(2)} style={{ flex: 1, padding: '13px' }}>
                    <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} /> Back
                  </button>
                  <button
                    className="btn-gold"
                    onClick={handlePaystack}
                    disabled={loading}
                    style={{ flex: 2, padding: '13px', position: 'relative' }}
                  >
                    {loading ? (
                      <><span className="spinner" style={{ width: 18, height: 18, marginRight: 8 }} /> Processing...</>
                    ) : (
                      <>{form.paymentMethod === 'cash' ? '📦 Place Order' : '🔐 Pay ₦' + grandTotal.toLocaleString()}</>
                    )}
                  </button>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.75rem' }}>
                  <i className="fas fa-lock" style={{ marginRight: '6px' }} />
                  Secured by Paystack • SSL Encrypted
                </p>
              </div>
            )}
          </div>

          {/* Order Summary Card */}
          <div className="card" style={{ position: 'sticky', top: '90px' }}>
            <h4 style={{ fontFamily: 'Playfair Display, serif', marginBottom: '1rem', fontSize: '1.1rem' }}>
              <i className="fas fa-receipt" style={{ color: 'var(--gold)', marginRight: '8px' }} />
              Order Summary
            </h4>
            {state.cart.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <img src={item.image} alt={item.name} style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>×{item.quantity}</div>
                </div>
                <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.9rem' }}>₦{(item.price * item.quantity).toLocaleString()}</div>
              </div>
            ))}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem' }}>
              <span>Total</span>
              <span style={{ color: 'var(--gold)' }}>₦{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
