interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <img src="/brybos-logo.png" alt="BRYBOS" style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid var(--gold)' }} />
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)', letterSpacing: '2px' }}>BRYBOS</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', lineHeight: '1.7', maxWidth: '300px', marginBottom: '1.5rem' }}>
            Nigeria's premier food delivery platform. Bringing the finest flavours right to your doorstep with speed, quality and care.
          </p>
          <div className="social-links">
            {[
              { icon: 'fab fa-facebook-f' },
              { icon: 'fab fa-instagram' },
              { icon: 'fab fa-twitter' },
              { icon: 'fab fa-whatsapp' },
              { icon: 'fab fa-youtube' },
            ].map((s, i) => (
              <div key={i} className="social-link">
                <i className={s.icon} />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--gold)' }}>Quick Links</h4>
          <ul className="footer-links">
            {['home', 'about', 'menu', 'orders', 'contact'].map(page => (
              <li key={page}>
                <a onClick={() => onNavigate(page)}>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', marginRight: '6px', color: 'var(--gold)', opacity: 0.5 }} />
                  {page.charAt(0).toUpperCase() + page.slice(1)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--gold)' }}>Our Menu</h4>
          <ul className="footer-links">
            {['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Specials'].map((s, i) => (
              <li key={i}>
                <a onClick={() => onNavigate('menu')}>
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.7rem', marginRight: '6px', color: 'var(--gold)', opacity: 0.5 }} />
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--gold)' }}>Contact</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: 'fas fa-map-marker-alt', text: '12 Restaurant Lane, Lekki, Lagos' },
              { icon: 'fas fa-phone', text: '+234 800 BRYBOS' },
              { icon: 'fas fa-envelope', text: 'hello@brybos.ng' },
              { icon: 'fas fa-clock', text: 'Mon–Sun: 7AM – 11PM' },
            ].map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <i className={c.icon} style={{ color: 'var(--gold)', fontSize: '0.85rem', marginTop: '3px', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', lineHeight: '1.5' }}>{c.text}</span>
              </div>
            ))}
          </div>

          {/* Payment methods */}
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>We Accept</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['💳 Paystack', '🏦 Bank Transfer', '💵 Cash'].map((p, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)',
                }}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} <span style={{ color: 'var(--gold)' }}>BRYBOS</span> Restaurant. All rights reserved. |
          Built with ❤️ for Nigeria's finest dining experience.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <a onClick={() => onNavigate('admin')} style={{ color: 'var(--gold)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'none' }}>
            🔒 Admin Portal
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
          <a onClick={() => onNavigate('salesrep')} style={{ color: 'var(--gold)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'none' }}>
            🧑‍💼 Sales Rep Portal
          </a>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
          <a onClick={() => onNavigate('rider')} style={{ color: 'var(--gold)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'none' }}>
            🏍️ Rider Portal
          </a>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '0.5rem' }}>
          {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((l, i) => (
            <a key={i} href="#" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
