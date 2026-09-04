import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { authService } from '../services/authService';

interface StaffLoginPageProps {
  targetRole: 'admin' | 'sales_rep' | 'rider';
  onNavigate: (page: string) => void;
}

export default function StaffLoginPage({ targetRole, onNavigate }: StaffLoginPageProps) {
  const { state, dispatch, addNotification } = useApp();
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

  const handleFillAdmin = () => {
    setEmail('fayoseayomipo170@gmail.com');
    setPassword('Admin123');
    setError('');
  };

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
              {isTargetRep && 'Sales representatives: sign in with your Gmail and assigned password (salesrep+role_number).'}
              {isTargetRider && 'Dispatch riders: sign in with your Gmail and assigned password (salesrep+role_number).'}
            </p>
          </div>

          {/* Quick fill highlight for Admin */}
          {isTargetAdmin && (
            <div style={{
              background: 'rgba(200,155,60,0.08)',
              border: '1px dashed rgba(200,155,60,0.4)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div style={{ fontSize: '0.8rem' }}>
                <div style={{ color: 'var(--gold)', fontWeight: 700 }}>Requested Admin Account:</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  fayoseayomipo170@gmail.com
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
                  Password: <strong style={{ color: 'var(--white)' }}>Admin123</strong>
                </div>
              </div>
              <button
                type="button"
                className="btn-gold"
                onClick={handleFillAdmin}
                style={{ padding: '6px 12px', fontSize: '0.75rem', flexShrink: 0 }}
              >
                ⚡ Fill Admin
              </button>
            </div>
          )}

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
                {isTargetAdmin && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--gold)', cursor: 'pointer' }} onClick={handleFillAdmin}>
                    Default: Admin123
                  </span>
                )}
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

          {/* Quick Fill for Sales Reps */}
          {isTargetRep && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '8px' }}>
                <i className="fas fa-id-badge" style={{ marginRight: '6px' }} /> Quick Sign In (Registered Sales Reps):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {state.salesReps.map((rep, idx) => {
                  const pass = rep.loginPassword || `salesrep${rep.roleNumber || idx + 1}`;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => { setEmail(rep.email); setPassword(pass); setError(''); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,155,60,0.4)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    >
                      <div>
                        <strong>{rep.name}</strong> <span style={{ color: 'rgba(255,255,255,0.4)' }}>({rep.email})</span>
                      </div>
                      <span style={{ color: 'var(--gold)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {pass}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Fill for Riders */}
          {isTargetRider && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '8px' }}>
                <i className="fas fa-motorcycle" style={{ marginRight: '6px' }} /> Quick Sign In (Registered Riders):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {state.riders.map((rider, idx) => {
                  const riderEmail = rider.email || `${rider.name.toLowerCase().split(' ')[0]}@gmail.com`;
                  const pass = rider.loginPassword || `salesrep${rider.roleNumber || idx + 1}`;
                  return (
                    <button
                      key={rider.id}
                      type="button"
                      onClick={() => { setEmail(riderEmail); setPassword(pass); setError(''); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,155,60,0.4)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                    >
                      <div>
                        <strong>{rider.name}</strong> <span style={{ color: 'rgba(255,255,255,0.4)' }}>({riderEmail})</span>
                      </div>
                      <span style={{ color: 'var(--gold)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {pass}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.8rem',
            textAlign: 'center',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.4)' }}>
              Are you a customer?{' '}
              <span
                style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => onNavigate('login')}
              >
                Customer Sign In
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              {!isTargetAdmin && (
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('admin')}>
                  Admin Portal
                </span>
              )}
              {!isTargetRep && (
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('salesrep')}>
                  Sales Rep Portal
                </span>
              )}
              {!isTargetRider && (
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('rider')}>
                  Rider Portal
                </span>
              )}
              <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onNavigate('home')}>
                Back to Restaurant
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
