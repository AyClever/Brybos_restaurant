import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';

// Components
import Navbar from './components/Navbar';
import CartSidebar from './components/CartSidebar';
import NotificationToast from './components/NotificationToast';
import Footer from './components/Footer';

// Pages
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import AuthPage from './pages/AuthPage';
import StaffLoginPage from './pages/StaffLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import SalesRepDashboard from './pages/SalesRepDashboard';
import RiderDashboard from './pages/RiderDashboard';
import NotificationsPage from './pages/NotificationsPage';

function AppContent() {
  const { state, dispatch } = useApp();
  const [currentPage, setCurrentPage] = useState('home');

  // Sync with browser URL / hash on load
  useEffect(() => {
    const parseUrlRoute = () => {
      const path = window.location.pathname.toLowerCase().replace(/^\//, '').trim();
      const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '').trim();
      const route = hash || path;

      if (route === 'admin') return 'admin';
      if (['salesrep', 'sales-rep', 'sales_rep', 'sales rep'].includes(route)) return 'salesrep';
      if (['rider', 'riders'].includes(route)) return 'rider';
      if (route === 'menu') return 'menu';
      if (route === 'orders') return 'orders';
      if (route === 'checkout') return 'checkout';
      if (route === 'login') return 'login';
      if (route === 'register') return 'register';
      if (route === 'about') return 'about';
      if (route === 'contact') return 'contact';
      if (route === 'notifications') return 'notifications';
      return null;
    };

    const initialRoute = parseUrlRoute();
    if (initialRoute) {
      setCurrentPage(initialRoute);
      dispatch({ type: 'SET_PAGE', payload: initialRoute });
    }

    const handlePopState = () => {
      const route = parseUrlRoute();
      if (route) {
        setCurrentPage(route);
        dispatch({ type: 'SET_PAGE', payload: route });
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [dispatch]);

  const navigate = (page: string) => {
    setCurrentPage(page);
    dispatch({ type: 'SET_PAGE', payload: page });
    try {
      window.history.pushState(null, '', page === 'home' ? '/' : `/${page}`);
    } catch {
      // Fallback for sandboxed iframe without throwing
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isDashboard = ['admin', 'salesrep', 'rider'].includes(currentPage);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)' }}>
      {/* Notification Toast */}
      <NotificationToast />

      {/* Cart Sidebar */}
      <CartSidebar onCheckout={() => navigate('checkout')} />

      {/* Navbar — only on public non-dashboard & non-portal pages */}
      {!isDashboard && (
        <Navbar onNavigate={navigate} />
      )}

      {/* Page Routing */}
      {currentPage === 'home' && <HomePage onNavigate={navigate} />}
      {currentPage === 'menu' && <MenuPage />}
      {currentPage === 'checkout' && <CheckoutPage onNavigate={navigate} />}
      {currentPage === 'orders' && <OrdersPage />}
      {currentPage === 'about' && <AboutPage onNavigate={navigate} />}
      {currentPage === 'contact' && <ContactPage />}
      {currentPage === 'login' && <AuthPage mode="login" onNavigate={navigate} />}
      {currentPage === 'register' && <AuthPage mode="register" onNavigate={navigate} />}
      {currentPage === 'notifications' && <NotificationsPage />}

      {/* Admin Portal: /admin */}
      {currentPage === 'admin' && (
        state.authLoading ? (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark)' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 42, height: 42, margin: '0 auto 1.25rem' }} />
              <div style={{ color: 'var(--gold)', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.5px' }}>Restoring Secure Session...</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Authenticating with Supabase</div>
            </div>
          </div>
        ) : state.user?.role === 'admin' ? (
          <AdminDashboard onNavigate={navigate} />
        ) : (
          <StaffLoginPage targetRole="admin" onNavigate={navigate} />
        )
      )}

      {/* Sales Rep Portal: /salesrep */}
      {currentPage === 'salesrep' && (
        state.authLoading ? (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark)' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 42, height: 42, margin: '0 auto 1.25rem' }} />
              <div style={{ color: 'var(--gold)', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.5px' }}>Restoring Secure Session...</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Authenticating with Supabase</div>
            </div>
          </div>
        ) : state.user?.role === 'sales_rep' ? (
          <SalesRepDashboard onNavigate={navigate} />
        ) : (
          <StaffLoginPage targetRole="sales_rep" onNavigate={navigate} />
        )
      )}

      {/* Rider Portal: /rider */}
      {currentPage === 'rider' && (
        state.authLoading ? (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark)' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ width: 42, height: 42, margin: '0 auto 1.25rem' }} />
              <div style={{ color: 'var(--gold)', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.5px' }}>Restoring Secure Session...</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Authenticating with Supabase</div>
            </div>
          </div>
        ) : state.user?.role === 'rider' ? (
          <RiderDashboard onNavigate={navigate} />
        ) : (
          <StaffLoginPage targetRole="rider" onNavigate={navigate} />
        )
      )}

      {/* Footer — only on public pages */}
      {!isDashboard && !['login', 'register'].includes(currentPage) && (
        <Footer onNavigate={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
