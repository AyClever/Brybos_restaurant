export default function AboutPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  return (
    <div className="page-transition" style={{ paddingTop: '70px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--dark-2), var(--dark-3))',
        padding: '80px 2rem 60px', textAlign: 'center',
        borderBottom: '1px solid rgba(200,155,60,0.1)',
      }}>
        <div className="section-tag">About Us</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', fontWeight: 800, marginTop: '1rem', marginBottom: '1rem' }}>
          The <span style={{ color: 'var(--gold)' }}>BRYBOS</span> Story
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.8' }}>
          Born from a passion for authentic Nigerian cuisine and a commitment to exceptional service, BRYBOS has become the gold standard in premium food delivery.
        </p>
      </div>

      {/* Story */}
      <section className="about-section">
        <div className="about-grid">
          <div className="about-img-wrapper">
            <img src="/food-dinner.jpg" alt="About BRYBOS" />
          </div>
          <div className="about-content">
            <div className="section-tag" style={{ textAlign: 'left', marginBottom: '1rem' }}>Our Mission</div>
            <h2 className="section-title" style={{ textAlign: 'left', fontSize: '2rem' }}>
              Delivering <span>Excellence</span><br />Since 2020
            </h2>
            <p>
              BRYBOS was founded with a simple yet powerful vision — to bring the finest flavours of Nigeria and the world right to your doorstep. We believe that great food should be accessible to everyone, prepared with love and delivered with care.
            </p>
            <p>
              Our team of experienced chefs sources only the freshest, highest-quality ingredients daily. From authentic jollof rice to international gourmet dishes, every meal is crafted to perfection.
            </p>
            <p>
              With our cutting-edge technology, you can track your order in real-time, pay securely through Paystack, and receive instant updates at every step of the delivery process.
            </p>
            <button className="btn-gold" onClick={() => onNavigate('menu')} style={{ marginTop: '1rem', padding: '13px 32px' }}>
              <i className="fas fa-utensils" style={{ marginRight: '8px' }} /> Explore Our Menu
            </button>
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '80px 2rem', background: 'var(--dark-2)' }}>
        <div className="section-header">
          <div className="section-tag">Our Values</div>
          <h2 className="section-title">What Drives <span>Us</span></h2>
          <div className="section-divider" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
          {[
            { icon: '🌟', title: 'Quality First', desc: 'We never compromise on the quality of our ingredients or the excellence of our service.' },
            { icon: '⚡', title: 'Speed & Reliability', desc: 'Fast delivery without sacrificing the integrity of your meal.' },
            { icon: '🤝', title: 'Community', desc: 'We support local farmers and suppliers, contributing to the Nigerian economy.' },
            { icon: '♻️', title: 'Sustainability', desc: 'Eco-friendly packaging and responsible sourcing are part of our DNA.' },
          ].map((v, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{v.icon}</div>
              <h3 className="feature-title">{v.title}</h3>
              <p className="feature-desc">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team stats */}
      <section style={{ padding: '60px 2rem', background: 'var(--dark)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          {[
            { value: '5,000+', label: 'Happy Customers' },
            { value: '48', label: 'Team Members' },
            { value: '150+', label: 'Menu Items' },
            { value: '3', label: 'Cities Covered' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', fontWeight: 800, color: 'var(--gold)' }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
