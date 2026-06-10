import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connecting = false;
  }

  connect(userId, userType = 'user') {
    // Reuse the same socket instance to avoid connection spam.
    if (this.socket) return this.socket;
    if (this.connecting) return this.socket;
    this.connecting = true;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      query: { userId: userId || 'anonymous', userType },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.connecting = false;
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      this.connecting = false;
      console.log('WebSocket connection error:', error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (!this.socket) return;

    for (const [event, handler] of this.listeners.entries()) {
      this.socket.off(event, handler);
    }
    this.listeners.clear();

    this.socket.disconnect();
    this.socket = null;
    this.connecting = false;
  }

  joinQueue(serviceType, userId) {
    if (this.socket?.connected) {
      this.socket.emit('join-queue', { serviceType, userId });
    }
  }

  onQueueUpdate(callback) {
    if (!this.socket) return;
    this.removeListener('queue-update');
    this.socket.on('queue-update', callback);
    this.listeners.set('queue-update', callback);
  }

  onTurnAlert(callback) {
    if (!this.socket) return;
    this.removeListener('turn-alert');
    this.socket.on('turn-alert', callback);
    this.listeners.set('turn-alert', callback);
  }

  adminAction(action, data) {
    if (this.socket?.connected) {
      this.socket.emit('admin-action', { action, data });
    }
  }

  removeListener(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
      this.listeners.delete(event);
    }
  }

  isConnected() {
    return !!this.socket?.connected;
  }
}

export default new SocketService();

