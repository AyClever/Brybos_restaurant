import { useApp, VALID_COUPONS } from '../store/AppContext';
import { useState } from 'react';

interface CartSidebarProps {
  onCheckout: () => void;
}

export default function CartSidebar({ onCheckout }: CartSidebarProps) {
  const { state, dispatch, cartTotal, cartCount, discountAmount, grandTotal, VAT_RATE, DELIVERY_FEE } = useApp();
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState('');

  if (!state.isCartOpen) return null;

  const subtotal = cartTotal;
  const discount = discountAmount;
  const discountedSub = subtotal - discount;
  const vat = Math.round(discountedSub * VAT_RATE);

  const applyCoupon = () => {
    const coupon = VALID_COUPONS.find(c => c.code === couponInput.trim().toUpperCase());
    if (coupon) {
      dispatch({ type: 'APPLY_COUPON', payload: coupon });
      setCouponMsg(`✓ Coupon applied! ${coupon.type === 'percent' ? coupon.discount + '% off' : '₦' + coupon.discount.toLocaleString() + ' off'}`);
    } else {
      setCouponMsg('✗ Invalid coupon code');
      setTimeout(() => setCouponMsg(''), 2000);
    }
  };

  const removeCoupon = () => {
    dispatch({ type: 'REMOVE_COUPON' });
    setCouponInput('');
    setCouponMsg('');
  };

  return (
    <div className="cart-overlay" onClick={(e) => { if (e.target === e.currentTarget) dispatch({ type: 'CLOSE_CART' }); }}>
      <div className="cart-sidebar">
        {/* Header */}
        <div className="cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="cart-title">My Cart</span>
            <span className="cart-count">{cartCount}</span>
          </div>
          <button className="cart-close" onClick={() => dispatch({ type: 'CLOSE_CART' })}>
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Items */}
        <div className="cart-items">
          {state.cart.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '1rem' }}>Your cart is empty</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Add some delicious meals!</p>
            </div>
          ) : (
            state.cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-img" />
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">₦{(item.price * item.quantity).toLocaleString()}</div>
                  <div className="cart-item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.quantity - 1 } })}
                    >−</button>
                    <span className="qty-display">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => dispatch({ type: 'UPDATE_CART_QTY', payload: { id: item.id, qty: item.quantity + 1 } })}
                    >+</button>
                    <button
                      onClick={() => dispatch({ type: 'REMOVE_FROM_CART', payload: item.id })}
                      style={{
                        marginLeft: 'auto', background: 'rgba(220,53,69,0.1)',
                        border: '1px solid rgba(220,53,69,0.2)', color: 'var(--danger)',
                        width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
                      }}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {state.cart.length > 0 && (
          <div className="cart-footer">
            {/* Coupon */}
            {!state.coupon ? (
              <div className="coupon-wrapper" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter coupon code..."
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                />
                <button className="btn-outline-gold" onClick={applyCoupon} style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                  Apply
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(40,167,69,0.1)', border: '1px solid rgba(40,167,69,0.2)',
                borderRadius: '8px', padding: '8px 12px', marginBottom: '1rem',
              }}>
                <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <i className="fas fa-tag" style={{ marginRight: '6px' }} />
                  {state.coupon.code}
                </span>
                <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                  <i className="fas fa-times" />
                </button>
              </div>
            )}
            {couponMsg && (
              <p style={{
                fontSize: '0.8rem',
                color: couponMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)',
                marginBottom: '0.75rem', fontWeight: 600,
              }}>{couponMsg}</p>
            )}

            {/* Summary */}
            <div className="cart-summary-row">
              <span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="cart-summary-row" style={{ color: 'var(--success)' }}>
                <span>Discount</span><span>−₦{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="cart-summary-row">
              <span>VAT (7.5%)</span><span>₦{vat.toLocaleString()}</span>
            </div>
            <div className="cart-summary-row">
              <span>Delivery Fee</span><span>₦{DELIVERY_FEE.toLocaleString()}</span>
            </div>
            <div className="cart-summary-total">
              <span>Grand Total</span>
              <span>₦{grandTotal.toLocaleString()}</span>
            </div>

            <button className="btn-gold w-full" onClick={() => { dispatch({ type: 'CLOSE_CART' }); onCheckout(); }}
              style={{ padding: '14px', fontSize: '1rem', borderRadius: '12px' }}>
              <i className="fas fa-credit-card" style={{ marginRight: '8px' }} />
              Proceed to Checkout
            </button>
            <button
              onClick={() => dispatch({ type: 'CLEAR_CART' })}
              style={{
                width: '100%', marginTop: '8px', background: 'none',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)',
                padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
