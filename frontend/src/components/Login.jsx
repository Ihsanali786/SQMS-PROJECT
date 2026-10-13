// frontend/src/components/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      setLoading(false);
      return;
    }

    try {
      // ✅ FIXED: Send login to REAL backend API
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { data } = response.data;
        
        // Store the REAL JWT token from backend
        localStorage.setItem('user', JSON.stringify({
          id: data._id,
          email: data.email,
          name: data.name,
          role: data.role
        }));
        localStorage.setItem('token', data.accessToken || data.token);
        
        toast.success(`Welcome back ${data.name}!`);
        
        window.dispatchEvent(new Event('sqms-auth-change'));
        if (data.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/');
        }
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 401) {
        toast.error('Invalid email or password');
      } else {
        toast.error('Server error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg">
            SQ
          </div>
          <h2 className="text-2xl font-bold dark:text-white">Welcome Back</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Login to Smart Queue System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
              <span>📧</span> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300 flex items-center gap-2">
              <span>🔒</span> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold text-lg shadow-md disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              '🔑 Login'
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-semibold">
            Register here
          </Link>
        </p>

        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-sm font-semibold mb-2 dark:text-white">📌 Demo Accounts:</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">👑 Admin: admin@example.com / admin1234 (seed default)</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">👤 Or register a new customer account below</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">🔐 All data is stored securely in MongoDB</p>
        </div>
      </div>
    </div>
  );
};

export default Login;