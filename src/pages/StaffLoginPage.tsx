import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { authService } from '../services/authService';

interface StaffLoginPageProps {
  targetRole: 'admin' | 'sales_rep' | 'rider';
  onNavigate: (page: string) => void;
}

export default function StaffLoginPage({ targetRole, onNavigate }: StaffLoginPageProps) {
  const { dispatch, addNotification } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill admin if it's admin role for easy testing if desired
  const isTargetAdmin = targetRole === 'admin';
  const isTargetRep = targetRole === 'sales_rep';
  const isTargetRider = targetRole === 'rider';

  const roleTitle = isTargetAdmin
    ? 'Admin Portal'
    : isTargetRep
    ? 'Sales Representative Portal'
    : 'Dispatch Rider Portal';

  const roleBadge = isTargetAdmin
    ? '🔒 Restricted Administrative Access'
    : isTargetRep
    ? '🧑‍💼 Order Operations & Kitchen Dispatch'
    : '🏍️ Delivery Fleet & Logistics';

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError('');

    const { user, error: loginError } = await authService.signIn({
      email,
      password,
    });

    setLoading(false);

    if (loginError || !user) {
      setError(loginError || 'Invalid credentials. Please check your email and password.');
      return;
    }

    // Role check verification
    if (targetRole === 'admin' && user.role !== 'admin') {
      setError('This account does not have Administrator privileges.');
      return;
    }
    if (targetRole === 'sales_rep' && user.role !== 'sales_rep') {
      setError('This account is not registered as a Sales Representative.');
      return;
    }
    if (targetRole === 'rider' && user.role !== 'rider') {
      setError('This account is not registered as a Dispatch Rider.');
      return;
    }

    dispatch({ type: 'SET_USER', payload: user });
    addNotification('success', `Welcome back, ${user.name}!`, `Authenticated as ${user.role?.replace('_', ' ')}`);

    if (user.role === 'admin') onNavigate('admin');
    else if (user.role === 'sales_rep') onNavigate('salesrep');
    else if (user.role === 'rider') onNavigate('rider');
    else onNavigate('home');
  };

  return (
    <div className="page-transition" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center top, rgba(200,155,60,0.12) 0%, var(--dark) 70%)',
      padding: '80px 1.5rem 2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/brybos-logo.png"
            alt="BRYBOS"
            style={{ width: '75px', height: '75px', borderRadius: '50%', border: '3px solid var(--gold)', cursor: 'pointer' }}
            onClick={() => onNavigate('home')}
          />
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 800, marginTop: '0.75rem', color: 'var(--gold)' }}>
            BRYBOS
          </h1>
          <span style={{
            display: 'inline-block',
            marginTop: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: 'var(--gold)',
            background: 'rgba(200,155,60,0.12)',
            border: '1px solid rgba(200,155,60,0.3)',
            padding: '4px 12px',
            borderRadius: '20px',
          }}>
            {roleBadge}
          </span>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--dark-2)',
          border: '1px solid rgba(200,155,60,0.25)',
          borderRadius: '20px',
          padding: '2.25rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 700, color: 'var(--white)', margin: 0 }}>
              {roleTitle}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginTop: '6px', lineHeight: 1.5 }}>
              {isTargetAdmin && 'Authorized administration only. Enter the administrator credentials to manage restaurant operations.'}
              {isTargetRep && 'Sales representatives: sign in with your Gmail and assigned password.'}
              {isTargetRider && 'Dispatch riders: sign in with your Gmail and assigned password.'}
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(220,53,69,0.12)',
              border: '1px solid rgba(220,53,69,0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '1.25rem',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>
                {isTargetAdmin ? 'Admin Email Address *' : 'Staff Gmail / Email Address *'}
              </label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder={isTargetAdmin ? 'fayoseayomipo170@gmail.com' : 'yourname@gmail.com'}
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', margin: 0 }}>Password *</label>
                
              </div>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-gold w-full"
              disabled={loading}
              style={{ padding: '13px', fontSize: '0.95rem', fontWeight: 700 }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} /> Authenticating...</>
              ) : (
                `Sign In to ${roleTitle}`
              )}
            </button>
          </form>

          {/* Return link to Restaurant */}
          <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
            <button type="button" onClick={() => onNavigate("home")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline" }}>
              ← Back to Restaurant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
