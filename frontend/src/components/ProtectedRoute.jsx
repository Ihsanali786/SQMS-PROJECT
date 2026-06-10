import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  if (!token || !user) {
    toast.error('Please login to access this page');
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    toast.error('Admin access required. You do not have permission to view this page.');
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
