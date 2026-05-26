import { useState } from 'react';
import { useApp, User } from '../store/AppContext';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (page: string) => void;
}

const DEMO_ACCOUNTS = [
  { email: 'admin@brybos.com', password: 'admin123', role: 'admin', name: 'Admin User', phone: '08000000001', id: 1 },
  { email: 'rep@brybos.com', password: 'rep123', role: 'sales_rep', name: 'Adaeze Okonkwo', phone: '08011223344', id: 2 },
  { email: 'rider@brybos.com', password: 'rider123', role: 'rider', name: 'Emeka Okafor', phone: '08012345678', id: 3 },
  { email: 'customer@brybos.com', password: 'cust123', role: 'customer', name: 'John Adebayo', phone: '08055667788', id: 4 },
];

export default function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { dispatch, addNotification } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));

    const account = DEMO_ACCOUNTS.find(a => a.email === form.email && a.password === form.password);
    if (account) {
      const user: User = { id: account.id, name: account.name, email: account.email, phone: account.phone, role: account.role as User['role'] };
      dispatch({ type: 'SET_USER', payload: user });
      addNotification('success', `Welcome back, ${account.name}!`, `Logged in as ${account.role}`);

      // Navigate to correct dashboard
      if (account.role === 'admin') onNavigate('admin');
      else if (account.role === 'sales_rep') onNavigate('salesrep');
      else if (account.role === 'rider') onNavigate('rider');
      else onNavigate('home');
    } else {
      setError('Invalid email or password');
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));

    const user: User = {
      id: Date.now(),
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: 'customer',
    };
    dispatch({ type: 'SET_USER', payload: user });
    addNotification('success', 'Account Created!', `Welcome to BRYBOS, ${form.name}!`);
    onNavigate('home');
  };

  return (
    <div className="page-transition" style={{
      paddingTop: '70px', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--dark) 60%, rgba(200,155,60,0.05) 100%)',
      padding: '90px 2rem 2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/brybos-logo.png" alt="BRYBOS" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--gold)' }} />
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 800, marginTop: '1rem', color: 'var(--gold)' }}>BRYBOS</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Premium Food Delivery</p>
        </div>

        <div style={{
          background: 'var(--dark-2)', border: '1px solid rgba(200,155,60,0.15)',
          borderRadius: '20px', padding: '2rem',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Join BRYBOS today'}
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
              <label className="form-label">Full Name</label>
              <input type="text" name="name" className="form-control" value={form.name} onChange={handleInput} placeholder="Your full name" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" name="email" className="form-control" value={form.email} onChange={handleInput} placeholder="your@email.com" />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" name="phone" className="form-control" value={form.phone} onChange={handleInput} placeholder="08012345678" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-control" value={form.password} onChange={handleInput} placeholder="••••••••" />
          </div>

          <button
            className="btn-gold w-full"
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            style={{ padding: '13px', marginTop: '0.5rem', fontSize: '1rem' }}
          >
            {loading ? <><span className="spinner" style={{ width: 18, height: 18, marginRight: 8 }} /> Processing...</> :
              mode === 'login' ? 'Sign In' : 'Create Account'}
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

        {/* Demo accounts */}
        {mode === 'login' && (
          <div style={{ marginTop: '1.5rem', background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.15)', borderRadius: '14px', padding: '1.25rem' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--gold)' }}>
              <i className="fas fa-key" style={{ marginRight: '8px' }} /> Demo Accounts
            </p>
            <div style={{ display: 'grid', gap: '6px' }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  onClick={() => {
                    setForm({ ...form, email: acc.email, password: acc.password });
                    setError('');
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,155,60,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                >
                  <span>{acc.name}</span>
                  <span style={{ color: 'var(--gold)', fontWeight: 600, textTransform: 'capitalize' }}>{acc.role.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
