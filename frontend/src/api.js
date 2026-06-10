// frontend/src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth APIs
export const register = (userData) => api.post('/auth/register', userData);
export const login = (userData) => api.post('/auth/login', userData);
export const getMe = () => api.get('/auth/me');

// Token APIs
export const generateToken = (tokenData) => api.post('/tokens', tokenData);
export const getMyTokens = () => api.get('/tokens/my-tokens');
export const getQueueStatus = (serviceType) => api.get(`/tokens/queue/${serviceType}`);

// Queue APIs (Admin)
export const getQueue = (serviceType) => api.get(`/queue/${serviceType}`);
export const callNext = (serviceType) => api.put(`/queue/${serviceType}/next`);
export const completeToken = (serviceType, tokenId) => api.put(`/queue/${serviceType}/complete/${tokenId}`);
export const skipToken = (serviceType, tokenId) => api.put(`/queue/${serviceType}/skip/${tokenId}`);

// Appointment APIs
export const getMyAppointments = () => api.get('/appointments/my-appointments');
export const createAppointment = (data) => api.post('/appointments', data);

export default api;