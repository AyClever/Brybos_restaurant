import { useState } from 'react';
import { useApp } from '../store/AppContext';

export default function ContactPage() {
  const { addNotification } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return;
    await new Promise(r => setTimeout(r, 1000));
    addNotification('success', 'Message Sent!', 'We\'ll get back to you within 24 hours.');
    setSent(true);
    setTimeout(() => { setSent(false); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }, 3000);
  };

  return (
    <div className="page-transition" style={{ paddingTop: '70px' }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--dark-2), var(--dark-3))',
        padding: '80px 2rem 60px', textAlign: 'center',
        borderBottom: '1px solid rgba(200,155,60,0.1)',
      }}>
        <div className="section-tag">Contact Us</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', fontWeight: 800, marginTop: '1rem', marginBottom: '1rem' }}>
          Get in <span style={{ color: 'var(--gold)' }}>Touch</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '500px', margin: '0 auto' }}>
          We'd love to hear from you. Reach out for any questions, feedback or partnership inquiries.
        </p>
      </div>

      <section className="contact-section">
        <div className="contact-grid">
          {/* Info */}
          <div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', marginBottom: '2rem' }}>Contact Information</h3>
            {[
              { icon: '📍', title: 'Our Location', info: '12 Restaurant Lane, Lekki Phase 1, Lagos, Nigeria' },
              { icon: '📞', title: 'Phone Number', info: '+234 800 BRYBOS (279267)' },
              { icon: '✉️', title: 'Email Address', info: 'hello@brybos.ng' },
              { icon: '🕐', title: 'Working Hours', info: 'Mon–Sun: 7:00 AM – 11:00 PM' },
            ].map((c, i) => (
              <div key={i} className="contact-info-item">
                <div className="contact-icon">{c.icon}</div>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '4px', fontSize: '0.95rem' }}>{c.title}</h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{c.info}</p>
                </div>
              </div>
            ))}

            <div style={{ marginTop: '2rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Follow Us</p>
              <div className="social-links">
                {[
                  { icon: 'fab fa-facebook-f', label: 'FB' },
                  { icon: 'fab fa-instagram', label: 'IG' },
                  { icon: 'fab fa-twitter', label: 'TW' },
                  { icon: 'fab fa-whatsapp', label: 'WA' },
                  { icon: 'fab fa-tiktok', label: 'TT' },
                ].map((s, i) => (
                  <div key={i} className="social-link">
                    <i className={s.icon} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="card">
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', marginBottom: '1.5rem' }}>
              <i className="fas fa-paper-plane" style={{ color: 'var(--gold)', marginRight: '10px' }} />
              Send a Message
            </h3>

            {sent ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Message Sent!</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>We'll get back to you soon.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input type="text" className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08012345678" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input type="text" className="form-control" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="What's this about?" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Message *</label>
                  <textarea
                    className="form-control"
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us how we can help you..."
                    rows={5}
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button className="btn-gold w-full" onClick={handleSubmit} style={{ padding: '13px', marginTop: '0.5rem' }}>
                  <i className="fas fa-paper-plane" style={{ marginRight: '8px' }} /> Send Message
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
