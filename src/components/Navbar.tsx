import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { authService } from '../services/authService';

interface NavbarProps {
  onNavigate: (page: string) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const { state, dispatch, cartCount } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Home', page: 'home' },
    { label: 'About', page: 'about' },
    { label: 'Menu', page: 'menu' },
    { label: 'Orders', page: 'orders' },
    { label: 'Contact', page: 'contact' },
  ];

  const go = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        {/* Logo */}
        <div className="navbar-brand" onClick={() => go('home')} style={{ cursor: 'pointer' }}>
          <img src="/brybos-logo.png" alt="BRYBOS Logo" className="brand-logo" />
          <span className="brand-text">BRYBOS</span>
        </div>

        {/* Desktop Nav */}
        <ul className="nav-links">
          {navLinks.map(l => (
            <li key={l.page}>
              <a
                className={state.currentPage === l.page ? 'active' : ''}
                onClick={() => go(l.page)}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="nav-actions">
          {/* Cart */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_CART' })}
            style={{
              position: 'relative',
              background: 'rgba(200,155,60,0.1)',
              border: '1px solid rgba(200,155,60,0.3)',
              color: 'var(--gold)',
              width: 42,
              height: 42,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,155,60,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(200,155,60,0.1)')}
          >
            <i className="fas fa-shopping-cart" />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--danger)', color: '#fff',
                width: 18, height: 18, borderRadius: '50%',
                fontSize: '0.65rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cartCount}
              </span>
            )}
          </button>

          {/* Notifications */}
          <div className="notif-bell" onClick={() => go('notifications')}>
            <button style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              width: 42, height: 42, borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
            }}>
              <i className="fas fa-bell" />
              {state.unreadNotifications > 0 && (
                <span className="badge-count">{state.unreadNotifications}</span>
              )}
            </button>
          </div>

          {state.user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn-outline-gold"
                style={{ padding: '6px 12px', fontSize: '0.78rem', textTransform: 'capitalize' }}
                onClick={() => go(state.user?.role === 'admin' ? 'admin' : state.user?.role === 'sales_rep' ? 'salesrep' : state.user?.role === 'rider' ? 'rider' : 'orders')}
              >
                <i className="fas fa-tachometer-alt" style={{ marginRight: '5px' }} />
                {state.user.role === 'admin' ? 'Admin' : state.user.role === 'sales_rep' ? 'Sales Rep' : state.user.role === 'rider' ? 'Rider' : 'My Orders'}
              </button>
              <div
                className="avatar"
                onClick={() => go(state.user?.role === 'admin' ? 'admin' : state.user?.role === 'sales_rep' ? 'salesrep' : state.user?.role === 'rider' ? 'rider' : 'orders')}
                title={`${state.user.name} (${state.user.role})`}
                style={{ cursor: 'pointer' }}
              >
                {state.user.name.charAt(0)}
              </div>
              <button
                className="btn-outline-gold"
                style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                onClick={async () => {
                  await authService.signOut();
                  dispatch({ type: 'SET_USER', payload: null });
                  go('home');
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <button className="btn-outline-gold" onClick={() => go('login')}>Login</button>
              <button className="btn-gold" onClick={() => go('register')}>Register</button>
            </>
          )}

          {/* Mobile toggle */}
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
            <i className={`fas fa-${mobileOpen ? 'times' : 'bars'}`} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 70, left: 0, right: 0, zIndex: 999,
          background: 'rgba(26,26,26,0.98)',
          borderBottom: '1px solid rgba(200,155,60,0.2)',
          padding: '1rem',
          backdropFilter: 'blur(10px)',
        }}>
          {navLinks.map(l => (
            <div
              key={l.page}
              onClick={() => go(l.page)}
              style={{
                padding: '12px 16px',
                color: state.currentPage === l.page ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.95rem',
                fontWeight: 500,
              }}
            >
              {l.label}
            </div>
          ))}
          {!state.user && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn-outline-gold w-full" onClick={() => go('login')}>Login</button>
              <button className="btn-gold w-full" onClick={() => go('register')}>Register</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
