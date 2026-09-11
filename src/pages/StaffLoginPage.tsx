import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const isEmailNotConfirmed = error.toLowerCase().includes('email not confirmed');

  const handleResendConfirmation = async () => {
    if (!email) return;
    setResending(true);
    setResendStatus(null);
    const res = await authService.resendConfirmationEmail(email);
    setResending(false);
    if (res.success) {
      setResendStatus('Confirmation email sent! Please check your inbox or spam folder.');
    } else {
      setResendStatus(res.error || 'Unable to send confirmation email.');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError('');
    setResendStatus(null);

    const { user, error: loginError } = await authService.signIn({
      email,
      password,
    });

    setLoading(false);

    if (loginError || !user) {
      setError(loginError || 'Invalid credentials. Please check your email and password.');
      return;
    }

    const effectiveUser = { ...user };

    // Role check verification with fallback to registered staff list in state or database
    if (targetRole === 'admin' && effectiveUser.role !== 'admin') {
      setError('This account does not have Administrator privileges.');
      return;
    }
    if (targetRole === 'sales_rep' && effectiveUser.role !== 'sales_rep') {
      let isKnownRep = state.salesReps.some(r => r.email?.trim().toLowerCase() === effectiveUser.email?.trim().toLowerCase());
      if (!isKnownRep && isSupabaseConfigured) {
        try {
          const { data: dbRep } = await supabase
            .from('sales_reps')
            .select('id, profile_id, email')
            .or(`profile_id.eq.${effectiveUser.id},email.eq.${effectiveUser.email?.toLowerCase()}`)
            .maybeSingle();
          if (dbRep) isKnownRep = true;
        } catch {
          // ignore error
        }
      }
      if (isKnownRep) {
        effectiveUser.role = 'sales_rep';
        authService.updateProfileRole(String(effectiveUser.id), 'sales_rep').catch(console.warn);
      } else {
        setError('This account is not registered as a Sales Representative.');
        return;
      }
    }
    if (targetRole === 'rider' && effectiveUser.role !== 'rider') {
      let isKnownRider = state.riders.some(r => r.email?.trim().toLowerCase() === effectiveUser.email?.trim().toLowerCase());
      if (!isKnownRider && isSupabaseConfigured) {
        try {
          const { data: dbRider } = await supabase
            .from('riders')
            .select('id, profile_id, email')
            .or(`profile_id.eq.${effectiveUser.id},email.eq.${effectiveUser.email?.toLowerCase()}`)
            .maybeSingle();
          if (dbRider) isKnownRider = true;
        } catch {
          // ignore error
        }
      }
      if (isKnownRider) {
        effectiveUser.role = 'rider';
        authService.updateProfileRole(String(effectiveUser.id), 'rider').catch(console.warn);
      } else {
        setError('This account is not registered as a Dispatch Rider.');
        return;
      }
    }

    dispatch({ type: 'SET_USER', payload: effectiveUser });
    addNotification('success', `Welcome back, ${effectiveUser.name}!`, `Authenticated as ${effectiveUser.role?.replace('_', ' ')}`);

    if (effectiveUser.role === 'admin') onNavigate('admin');
    else if (effectiveUser.role === 'sales_rep') onNavigate('salesrep');
    else if (effectiveUser.role === 'rider') onNavigate('rider');
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
              padding: '12px 14px',
              marginBottom: '1.25rem',
              color: 'var(--danger)',
              fontSize: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <i className="fas fa-exclamation-circle" />
                <span>{error}</span>
              </div>

              {isEmailNotConfirmed && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(220,53,69,0.2)' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                    Supabase requires your email to be confirmed before sign in. You can send a new confirmation link or auto-confirm in your Supabase dashboard.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending || !email}
                    style={{
                      background: 'var(--gold)',
                      color: 'var(--dark)',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {resending ? 'Sending link...' : '✉️ Resend Confirmation Email'}
                  </button>
                  {resendStatus && (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
                      {resendStatus}
                    </div>
                  )}
                </div>
              )}
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
