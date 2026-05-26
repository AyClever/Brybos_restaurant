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
import AdminDashboard from './pages/AdminDashboard';
import SalesRepDashboard from './pages/SalesRepDashboard';
import RiderDashboard from './pages/RiderDashboard';
import NotificationsPage from './pages/NotificationsPage';

function AppContent() {
  const { state, dispatch } = useApp();
  const [currentPage, setCurrentPage] = useState('home');

  const navigate = (page: string) => {
    setCurrentPage(page);
    dispatch({ type: 'SET_PAGE', payload: page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route guard for dashboards
  useEffect(() => {
    if (currentPage === 'admin' && state.user?.role !== 'admin') {
      navigate('login');
    }
    if (currentPage === 'salesrep' && state.user?.role !== 'sales_rep') {
      navigate('login');
    }
    if (currentPage === 'rider' && state.user?.role !== 'rider') {
      navigate('login');
    }
  }, [currentPage, state.user]);

  const isDashboard = ['admin', 'salesrep', 'rider'].includes(currentPage);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)' }}>
      {/* Notification Toast */}
      <NotificationToast />

      {/* Cart Sidebar */}
      <CartSidebar onCheckout={() => navigate('checkout')} />

      {/* Navbar — only on non-dashboard pages */}
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
      {currentPage === 'admin' && state.user?.role === 'admin' && <AdminDashboard onNavigate={navigate} />}
      {currentPage === 'salesrep' && state.user?.role === 'sales_rep' && <SalesRepDashboard onNavigate={navigate} />}
      {currentPage === 'rider' && state.user?.role === 'rider' && <RiderDashboard onNavigate={navigate} />}

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
