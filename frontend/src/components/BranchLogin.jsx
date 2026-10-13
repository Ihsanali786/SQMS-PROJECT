// frontend/src/components/BranchLogin.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const BranchLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // First, verify staff belongs to branch
      const response = await api.post('/auth/staff-login', {
        email,
        password,
        branchCode
      });
      
      if (response.data.success) {
        localStorage.setItem('staff', JSON.stringify(response.data.data));
        localStorage.setItem('branchId', response.data.data.branchId);
        localStorage.setItem('token', response.data.data.accessToken || response.data.data.token);
        
        toast.success(`Welcome ${response.data.data.name}`);
        navigate(`/admin/${response.data.data.branchId}/dashboard`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
            SQ
          </div>
          <h2 className="text-2xl font-bold dark:text-white">Branch Staff Login</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Login to manage your branch queue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Branch Code</label>
            <input
              type="text"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
              className="w-full border rounded-lg p-3 dark:bg-gray-700"
              placeholder="e.g., HBL-KHI-001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Staff Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg p-3 dark:bg-gray-700"
              placeholder="manager@hbl-khi.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3 dark:bg-gray-700"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            {loading ? 'Logging in...' : 'Login to Branch'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-sm font-semibold mb-2">Demo Branch Staff Credentials:</p>
          <p className="text-xs">Branch Code: HBL-KHI-001</p>
          <p className="text-xs">Email: manager@hbl-khi.com</p>
          <p className="text-xs">Password: any</p>
        </div>
      </div>
    </div>
  );
};

export default BranchLogin;