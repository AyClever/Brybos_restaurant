import { useState } from 'react';
import { useApp, MenuItem } from '../store/AppContext';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

function FoodCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="food-card">
      <div className="food-card-img-wrapper">
        <img src={item.image} alt={item.name} className="food-card-img" />
        {item.badge && <span className="food-badge">{item.badge}</span>}
      </div>
      <div className="food-card-body">
        <h4 className="food-name">{item.name}</h4>
        <p className="food-desc">{item.description}</p>
        <div className="food-price">₦{item.price.toLocaleString()}</div>
        <div className="food-controls">
          <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span className="qty-display">{qty}</span>
          <button className="qty-btn" onClick={() => setQty(qty + 1)}>+</button>
        </div>
        <button className="btn-add-cart" onClick={onAdd}>
          <i className="fas fa-cart-plus" />
          Add to Cart
        </button>
      </div>
    </div>
  );
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { state, dispatch } = useApp();
  const featuredItems = state.menuItems.slice(4, 8);

  return (
    <div className="page-transition">
      {/* HERO */}
      <section className="hero">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px' }}>
          <div className="hero-badge">
            <i className="fas fa-star" /> Premium Nigerian Cuisine
          </div>
          <h1 className="hero-title">
            Taste the <span className="highlight">Finest</span><br />
            Flavours of Nigeria
          </h1>
          <p className="hero-subtitle">
            From authentic local delicacies to international cuisine — order from BRYBOS and experience restaurant-quality food delivered straight to your door.
          </p>
          <div className="hero-actions">
            <button className="btn-gold" onClick={() => onNavigate('menu')} style={{ padding: '14px 36px', fontSize: '1rem' }}>
              <i className="fas fa-utensils" style={{ marginRight: '8px' }} />
              Order Now
            </button>
            <button className="btn-outline-gold" onClick={() => onNavigate('about')} style={{ padding: '14px 36px', fontSize: '1rem' }}>
              <i className="fas fa-play-circle" style={{ marginRight: '8px' }} />
              Our Story
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Daily Orders</div>
            </div>
            <div className="stat-item" style={{ borderLeft: '1px solid rgba(200,155,60,0.2)', borderRight: '1px solid rgba(200,155,60,0.2)', padding: '0 3rem' }}>
              <div className="stat-number">4.9★</div>
              <div className="stat-label">Customer Rating</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">30min</div>
              <div className="stat-label">Avg Delivery</div>
            </div>
          </div>
        </div>

        <div style={{
          position: 'absolute', bottom: 40, right: 60,
          background: 'rgba(26,26,26,0.9)', border: '1px solid rgba(200,155,60,0.3)',
          borderRadius: '16px', padding: '1rem 1.25rem',
          backdropFilter: 'blur(20px)',
          animation: 'fadeInUp 1s ease 1s both',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{ fontSize: '2rem' }}>🏍️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Live Tracking</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Watch your order in real-time</div>
          </div>
          <div className="live-dot" />
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <div className="section-header">
          <div className="section-tag">Why Choose Us</div>
          <h2 className="section-title">Delivering <span>Excellence</span></h2>
          <div className="section-divider" />
        </div>
        <div className="features-grid">
          {[
            { icon: '⚡', title: 'Lightning Fast', desc: 'Average delivery time of 30 minutes or less within our coverage area' },
            { icon: '👨‍🍳', title: 'Expert Chefs', desc: 'Meals prepared by experienced chefs using fresh, premium ingredients daily' },
            { icon: '🔒', title: 'Secure Payment', desc: "Pay safely with Paystack — Nigeria's most trusted payment gateway" },
            { icon: '📍', title: 'Live Tracking', desc: 'Track your rider in real-time on Google Maps from kitchen to doorstep' },
            { icon: '🌟', title: 'Premium Quality', desc: 'Only the finest locally-sourced ingredients make it to your plate' },
            { icon: '💬', title: '24/7 Support', desc: 'Our support team is always ready to assist you day and night' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED MENU */}
      <section className="menu-section">
        <div className="section-header">
          <div className="section-tag">Today's Specials</div>
          <h2 className="section-title">Featured <span>Dishes</span></h2>
          <div className="section-divider" />
        </div>
        <div className="menu-grid">
          {featuredItems.map(item => (
            <FoodCard key={item.id} item={item} onAdd={() => dispatch({ type: 'ADD_TO_CART', payload: item })} />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <button className="btn-gold" onClick={() => onNavigate('menu')} style={{ padding: '14px 40px', fontSize: '1rem' }}>
            <i className="fas fa-th-large" style={{ marginRight: '8px' }} />
            View Full Menu
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 2rem', background: 'var(--dark-2)' }}>
        <div className="section-header">
          <div className="section-tag">Simple Process</div>
          <h2 className="section-title">How It <span>Works</span></h2>
          <div className="section-divider" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { step: '01', icon: '🍽️', title: 'Browse Menu', desc: 'Explore our wide variety of Nigerian and international dishes' },
            { step: '02', icon: '🛒', title: 'Add to Cart', desc: 'Select your favourite meals and customize your order' },
            { step: '03', icon: '💳', title: 'Pay Securely', desc: 'Pay with Paystack, bank transfer or cash on delivery' },
            { step: '04', icon: '🏍️', title: 'Fast Delivery', desc: 'Track your rider live as they bring your order to you' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '1', minWidth: '180px', textAlign: 'center', padding: '1.5rem' }}>
              <div style={{
                width: '70px', height: '70px',
                background: 'linear-gradient(135deg, rgba(200,155,60,0.2), rgba(200,155,60,0.05))',
                border: '1px solid rgba(200,155,60,0.3)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', margin: '0 auto 1rem',
              }}>
                {s.icon}
              </div>
              <div style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '2px', marginBottom: '0.5rem' }}>STEP {s.step}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{s.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: '1.6' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: '80px 2rem', background: 'var(--dark)' }}>
        <div className="section-header">
          <div className="section-tag">Customer Love</div>
          <h2 className="section-title">What Our <span>Customers Say</span></h2>
          <div className="section-divider" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
          {[
            { name: 'Adunola Fashola', role: 'Lagos', text: 'BRYBOS is absolutely the best! Their jollof rice is out of this world and delivery is always on time.', rating: 5 },
            { name: 'Chukwuma Obi', role: 'Abuja', text: 'The food quality is exceptional. I order at least 4 times a week. The live tracking gives me total peace of mind.', rating: 5 },
            { name: 'Blessing Nkemelu', role: 'Port Harcourt', text: 'Finally a food delivery service that delivers on their promise. The goat meat pepper soup is incredible!', rating: 5 },
          ].map((t, i) => (
            <div key={i} style={{
              background: 'var(--dark-2)', border: '1px solid rgba(200,155,60,0.1)',
              borderRadius: '16px', padding: '2rem',
            }}>
              <div style={{ color: 'var(--gold)', fontSize: '1.5rem', marginBottom: '1rem' }}>❝</div>
              <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.7', marginBottom: '1.5rem', fontStyle: 'italic' }}>{t.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="avatar" style={{ width: '42px', height: '42px', fontSize: '1rem' }}>{t.name.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{t.role}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--gold)', fontSize: '0.85rem' }}>{'★'.repeat(t.rating)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{
        padding: '60px 2rem', textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(200,155,60,0.15), rgba(200,155,60,0.03))',
        borderTop: '1px solid rgba(200,155,60,0.1)', borderBottom: '1px solid rgba(200,155,60,0.1)',
      }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>
          Ready to Order? <span style={{ color: 'var(--gold)' }}>Let's Eat!</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '1.05rem' }}>
          Join thousands of satisfied customers enjoying premium food delivery
        </p>
        <button className="btn-gold" onClick={() => onNavigate('menu')} style={{ padding: '16px 48px', fontSize: '1.1rem' }}>
          <i className="fas fa-fire" style={{ marginRight: '10px' }} />
          Start Ordering Now
        </button>
      </section>
    </div>
  );
}
