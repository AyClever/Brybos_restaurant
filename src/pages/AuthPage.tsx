import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';
import { UserRole } from '../types';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (page: string) => void;
}

const CUSTOMER_DEMO_ACCOUNT = {
  email: 'customer@brybos.com',
  password: 'password',
  role: 'customer' as UserRole,
  name: 'John Adebayo',
  phone: '08055667788',
};

export default function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { dispatch, addNotification } = useApp();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');

    const { user, error: loginError } = await authService.signIn({
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (loginError || !user) {
      setError(loginError || 'Invalid credentials. Please try again.');
      return;
    }

    dispatch({ type: 'SET_USER', payload: user });
    addNotification('success', `Welcome back, ${user.name}!`, `Logged in as ${user.role?.replace('_', ' ')}`);

    // Route directly based on role
    if (user.role === 'admin') onNavigate('admin');
    else if (user.role === 'sales_rep') onNavigate('salesrep');
    else if (user.role === 'rider') onNavigate('rider');
    else onNavigate('home');
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in your name, email, and password');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    // Strictly enforce customer role for public registration
    const { user, error: regError } = await authService.signUp({
      email: form.email,
      password: form.password,
      fullName: form.name,
      phone: form.phone || '',
      role: 'customer',
    });

    setLoading(false);

    if (regError || !user) {
      setError(regError || 'Registration failed. Please try again.');
      return;
    }

    dispatch({ type: 'SET_USER', payload: user });
    addNotification('success', 'Customer Account Created!', `Welcome to BRYBOS, ${user.name}!`);
    onNavigate('home');
  };

  return (
    <div className="page-transition" style={{
      paddingTop: '70px', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--dark) 60%, rgba(200,155,60,0.05) 100%)',
      padding: '90px 2rem 2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '460px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/brybos-logo.png"
            alt="BRYBOS"
            style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--gold)', cursor: 'pointer' }}
            onClick={() => onNavigate('home')}
          />
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 800, marginTop: '1rem', color: 'var(--gold)' }}>BRYBOS</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Nigeria's Premier Dining & Food Delivery</p>
        </div>

        {/* Supabase Status Banner */}
        <div style={{
          background: isSupabaseConfigured ? 'rgba(40,167,69,0.08)' : 'rgba(200,155,60,0.08)',
          border: `1px solid ${isSupabaseConfigured ? 'rgba(40,167,69,0.25)' : 'rgba(200,155,60,0.25)'}`,
          borderRadius: '12px', padding: '10px 14px', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem',
        }}>
          <span style={{ fontSize: '1rem' }}>{isSupabaseConfigured ? '🟢' : '⚡'}</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: isSupabaseConfigured ? 'var(--success)' : 'var(--gold)' }}>
              {isSupabaseConfigured ? 'Supabase Auth & Database Connected' : 'Supabase Environment Ready'}
            </span>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
              {isSupabaseConfigured
                ? 'Customer accounts authenticate with your live Supabase database'
                : 'Interactive customer mode active. Add Supabase credentials in settings anytime.'}
            </p>
          </div>
        </div>

        <div style={{
          background: 'var(--dark-2)', border: '1px solid rgba(200,155,60,0.15)',
          borderRadius: '20px', padding: '2rem',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
            {mode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            {mode === 'login' ? 'Sign in to order your favourite meals and track delivery' : 'Join BRYBOS to order delicious food and track live orders'}
          </p>

          {error && (
            <div style={{
              background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem',
              color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600,
            }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }} />{error}
            </div>
          )}

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input type="text" name="name" className="form-control" value={form.name} onChange={handleInput} placeholder="e.g. John Adebayo" required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input type="email" name="email" className="form-control" value={form.email} onChange={handleInput} placeholder="your@email.com" required />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" name="phone" className="form-control" value={form.phone} onChange={handleInput} placeholder="08012345678" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input type="password" name="password" className="form-control" value={form.password} onChange={handleInput} placeholder="••••••••" required />
          </div>

          <button
            className="btn-gold w-full"
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            style={{ padding: '13px', marginTop: '0.5rem', fontSize: '1rem' }}
          >
            {loading ? (
              <><span className="spinner" style={{ width: 18, height: 18, marginRight: 8 }} /> Processing...</>
            ) : (
              mode === 'login' ? 'Sign In as Customer' : 'Register Customer Account'
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
            {mode === 'login' ? (
              <>Don't have an account?{' '}
                <span style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600 }} onClick={() => onNavigate('register')}>Register here</span>
              </>
            ) : (
              <>Already have an account?{' '}
                <span style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600 }} onClick={() => onNavigate('login')}>Sign in</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Customer Test Button */}
        {mode === 'login' && (
          <div style={{ marginTop: '1.25rem', background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.15)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--gold)' }}>
                  <i className="fas fa-user" style={{ marginRight: '6px' }} /> Demo Customer:
                </span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginLeft: '6px' }}>
                  {CUSTOMER_DEMO_ACCOUNT.email}
                </span>
              </div>
              <button
                type="button"
                className="btn-outline-gold"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                onClick={() => {
                  setForm({ ...form, email: CUSTOMER_DEMO_ACCOUNT.email, password: CUSTOMER_DEMO_ACCOUNT.password });
                  setError('');
                }}
              >
                Fill Credentials
              </button>
            </div>
          </div>
        )}

        {/* Staff & Admin Access Links */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '12px',
          fontSize: '0.8rem',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>
            Restaurant Staff & Administration Access:
          </span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span
              style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              onClick={() => onNavigate('admin')}
            >
              🔒 Admin Portal
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span
              style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              onClick={() => onNavigate('salesrep')}
            >
              🧑‍💼 Sales Rep Portal
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span
              style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
              onClick={() => onNavigate('rider')}
            >
              🏍️ Rider Portal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
