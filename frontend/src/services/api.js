// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const looksLikeJwt =
      typeof token === 'string' && token.split('.').length === 3 && token !== 'undefined' && token !== 'null';
    if (looksLikeJwt) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token) {
      // Prevent sending malformed tokens (commonly "undefined") which causes jwt malformed on backend
      localStorage.removeItem('token');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Auth APIs ───────────────────────────────────────────────────────────────
export const register = (userData) => api.post('/auth/register', userData);
export const login = (userData) => api.post('/auth/login', userData);
export const getMe = () => api.get('/auth/me');

// ─── Token APIs ──────────────────────────────────────────────────────────────
export const generateToken = (tokenData) => api.post('/tokens', tokenData);
export const getMyTokens = () => api.get('/tokens/my-tokens');
export const getQueueStatus = (serviceType) => api.get(`/tokens/queue/${serviceType}`);

// ─── Queue APIs (Admin) ──────────────────────────────────────────────────────
export const getQueue = (serviceType) => api.get(`/queue/${serviceType}`);
export const callNext = (serviceType) => api.put(`/queue/${serviceType}/next`);
export const completeToken = (serviceType, tokenId) =>
  api.put(`/queue/${serviceType}/complete/${tokenId}`);
export const skipToken = (serviceType, tokenId) =>
  api.put(`/queue/${serviceType}/skip/${tokenId}`);

// Counter management: action = 'open' | 'close' | 'set', count optional for 'set'
export const manageCounter = (serviceType, action, count) =>
  api.put(`/queue/${serviceType}/counter`, { action, count });

// Real analytics for a service type
export const getQueueAnalytics = (serviceType) =>
  api.get(`/queue/${serviceType}/analytics`);

// Simulate a customer arrival (admin demo only)
export const simulateArrival = (serviceType, customerName, service) =>
  api.post(`/queue/${serviceType}/simulate`, { customerName, service });

export const getSimulationStatus = (serviceType) =>
  api.get(`/queue/${serviceType}/simulation`);

export const startSimulation = (serviceType, intervalMs) =>
  api.post(`/queue/${serviceType}/simulation/start`, { intervalMs });

export const stopSimulation = (serviceType) =>
  api.post(`/queue/${serviceType}/simulation/stop`);

export const resetSimulation = (serviceType) =>
  api.post(`/queue/${serviceType}/simulation/reset`);

// ─── Appointment APIs ────────────────────────────────────────────────────────
export const getMyAppointments = () => api.get('/appointments/my-appointments');
export const createAppointment = (data) => api.post('/appointments', data);
export const cancelAppointment = (id) => api.put(`/appointments/${id}/cancel`);

export default api;
