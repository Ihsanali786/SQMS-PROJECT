// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';

import DarkModeToggle from './components/DarkModeToggle';
import StaffDashboard from './components/StaffDashboard';
import EnhancedUserDashboard from './components/EnhancedUserDashboard';
import AppointmentHistory from './components/AppointmentHistory';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AdminOverviewDashboard from './components/AdminOverviewDashboard';
import StaffManagement from './components/StaffManagement';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';

const ADMIN_SERVICE_LINKS = [
  { path: '/admin/bank', label: 'Bank', icon: '🏦' },
  { path: '/admin/nadra', label: 'NADRA', icon: '🪪' },
  { path: '/admin/university', label: 'University', icon: '🎓' },
  { path: '/admin/hospital', label: 'Hospital', icon: '🏥' },
];

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function AppShell({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(readStoredUser);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    setUser(readStoredUser());
  }, [location.pathname]);

  useEffect(() => {
    const sync = () => setUser(readStoredUser());
    window.addEventListener('sqms-auth-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('sqms-auth-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!user) {
    return <>{children}</>;
  }

  const isAdmin = user.role === 'admin';

  const isNavActive = (path) => {
    const current = location.pathname;
    if (path === '/') return current === '/';
    if (path === '/admin/dashboard') return current === '/admin/dashboard' || current === '/admin';
    if (path === '/history') return current === '/history';
    if (path === '/analytics') return current === '/analytics';
    if (path === '/admin/staff') return current === '/admin/staff';
    return current === path;
  };

  const navLinkClass = (path) => {
    const active = isNavActive(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
      active
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80'
    }`;
  };

  const handleLogout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event('sqms-auth-change'));
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          type="button"
          aria-label="Open menu"
          className="p-2 rounded-lg border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <span className="font-semibold dark:text-white">SQMS</span>
        <DarkModeToggle />
      </header>

      <div className="flex flex-1 min-h-0 w-full">
        <aside
          className={`fixed lg:sticky top-0 z-50 h-screen w-64 shrink-0 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col transform transition-transform duration-200 ease-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-5 border-b dark:border-gray-700">
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">Smart Queue</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Management System</p>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {!isAdmin && (
              <>
                <Link to="/" className={navLinkClass('/')}>
                  <span aria-hidden>🏠</span> Customer home
                </Link>
                <Link to="/history" className={navLinkClass('/history')}>
                  <span aria-hidden>📅</span> My history
                </Link>
              </>
            )}

            {isAdmin && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Admin
                </p>
                <Link to="/admin/dashboard" className={navLinkClass('/admin/dashboard')}>
                  <span aria-hidden>📊</span> Dashboard
                </Link>
                {ADMIN_SERVICE_LINKS.map((item) => (
                  <Link key={item.path} to={item.path} className={navLinkClass(item.path)}>
                    <span aria-hidden>{item.icon}</span> {item.label}
                  </Link>
                ))}
                <Link to="/analytics" className={navLinkClass('/analytics')}>
                  <span aria-hidden>📈</span> Analytics
                </Link>
                <Link to="/admin/staff" className={navLinkClass('/admin/staff')}>
                  <span aria-hidden>👔</span> Staff Management
                </Link>
                <Link to="/history" className={navLinkClass('/history')}>
                  <span aria-hidden>📜</span> History
                </Link>
                <div className="pt-3 mt-2 border-t dark:border-gray-700">
                  <Link to="/" className={navLinkClass('/')}>
                    <span aria-hidden>🏠</span> Customer view
                  </Link>
                </div>
              </>
            )}
          </nav>

          <div className="p-4 border-t dark:border-gray-700 space-y-3">
            <div className="hidden lg:flex justify-end">
              <DarkModeToggle />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isAdmin ? 'bg-amber-400 text-amber-950' : 'bg-green-500 text-white'
                }`}
              >
                {isAdmin ? 'Admin' : 'User'}
              </span>
              <span className="text-sm truncate dark:text-gray-200">{user.name}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 lg:min-h-screen">
          <div className="flex-1">{children}</div>
          <footer className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
            <p>SQMS © {new Date().getFullYear()} · Smart queue for Bank, NADRA, University &amp; Hospital</p>
            <p className="mt-1 text-gray-400 dark:text-gray-500">Real-time updates via Socket.IO · Secure admin access</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <EnhancedUserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <AppointmentHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute adminOnly>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <AdminOverviewDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute adminOnly>
              <StaffManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/:serviceType"
          element={
            <ProtectedRoute adminOnly>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff', borderRadius: '12px' },
          success: { icon: '✅', style: { background: '#22c55e', color: '#fff' } },
          error: { icon: '❌', style: { background: '#ef4444', color: '#fff' } },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
