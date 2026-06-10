// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';

// Import components
import DarkModeToggle from './components/DarkModeToggle';
import BankAdmin from './components/BankAdmin';
import NadraAdmin from './components/NadraAdmin';
import UniversityAdmin from './components/UniversityAdmin';
import HospitalAdmin from './components/HospitalAdmin';
import EnhancedUserDashboard from './components/EnhancedUserDashboard';
import AppointmentHistory from './components/AppointmentHistory';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';

// Navigation Component
function Navigation() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);
  }, []);
  
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };
  
  if (!user) return null;
  
  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-600 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-4 flex-wrap">
            <Link to="/" className="hover:bg-blue-500 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1">
              <span>🏠</span> Home
            </Link>
            <Link to="/history" className="hover:bg-blue-500 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1">
              <span>📅</span> History
            </Link>
            <Link to="/analytics" className="hover:bg-blue-500 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1">
              <span>📊</span> Analytics
            </Link>
            {user?.role === 'admin' && (
              <>
                <Link to="/admin/bank" className="hover:bg-green-600 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1">
                  <span>🏦</span> Bank
                </Link>
                <Link to="/admin/nadra" className="hover:bg-purple-600 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1">
                  <span>🪪</span> NADRA
                </Link>
                <Link to="/admin/university" className="hover:bg-orange-600 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1">
                  <span>🎓</span> University
                </Link>
                <Link to="/admin/hospital" className="hover:bg-red-600 px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1">
                  <span>🏥</span> Hospital
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
              user?.role === 'admin' 
                ? 'bg-yellow-400 text-black' 
                : 'bg-green-500 text-white'
            }`}>
              {user?.role === 'admin' ? '👑 ADMIN' : '👤 USER'}
            </span>
            <DarkModeToggle />
            <span className="text-sm bg-blue-500 px-3 py-1 rounded-full flex items-center gap-1">
              <span>👤</span> {user?.name}
            </span>
            <button 
              onClick={handleLogout}
              className="bg-red-500 px-4 py-1 rounded-full hover:bg-red-600 transition-all duration-200 flex items-center gap-1"
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading (remove in production)
    const timer = setTimeout(() => setIsLoading(false), 500);
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
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
          },
          success: {
            icon: '✅',
            style: {
              background: '#22c55e',
              color: '#fff',
            },
          },
          error: {
            icon: '❌',
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      />
      <Navigation />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected User Routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <EnhancedUserDashboard />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <AppointmentHistory />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AnalyticsDashboard />
          </ProtectedRoute>
        } />
        
        {/* Protected Admin Routes with adminOnly={true} */}
        <Route path="/admin/bank" element={
          <ProtectedRoute adminOnly={true}>
            <BankAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/nadra" element={
          <ProtectedRoute adminOnly={true}>
            <NadraAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/university" element={
          <ProtectedRoute adminOnly={true}>
            <UniversityAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/hospital" element={
          <ProtectedRoute adminOnly={true}>
            <HospitalAdmin />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;