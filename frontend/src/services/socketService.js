// frontend/src/services/socketService.js
import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connecting = false;
    // Track tokens we've already joined rooms for (avoid duplicate joins)
    this._joinedTokenRooms = new Set();
    this._joinedQueueRooms = new Set();
    // Track tokens that have already received a turn-alert (avoid repeat toasts)
    this._alertedTokens = new Set();
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
      console.log('WebSocket connected:', this.socket.id);
      // Re-join rooms on reconnect
      this._joinedQueueRooms.forEach(st => {
        this.socket.emit('join-queue', { serviceType: st });
      });
      this._joinedTokenRooms.forEach(tn => {
        this.socket.emit('join-token', { tokenNumber: tn });
      });
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
    this._joinedTokenRooms.clear();
    this._joinedQueueRooms.clear();
    this._alertedTokens.clear();

    this.socket.disconnect();
    this.socket = null;
    this.connecting = false;
  }

  /**
   * Join the service-type broadcast room.
   * All queue updates for this service type will be received.
   */
  joinQueue(serviceType, userId) {
    if (!serviceType || this._joinedQueueRooms.has(serviceType)) return;
    this._joinedQueueRooms.add(serviceType);
    if (this.socket?.connected) {
      this.socket.emit('join-queue', { serviceType, userId });
    }
  }

  /**
   * Join the per-token room so this client receives turn-alert
   * only when their specific token is near the front.
   */
  joinTokenRoom(tokenNumber) {
    if (!tokenNumber || this._joinedTokenRooms.has(tokenNumber)) return;
    this._joinedTokenRooms.add(tokenNumber);
    if (this.socket?.connected) {
      this.socket.emit('join-token', { tokenNumber });
    }
  }

  onQueueUpdate(callback) {
    if (!this.socket) return;
    this.removeListener('queue-update');
    this.socket.on('queue-update', callback);
    this.listeners.set('queue-update', callback);
  }

  /**
   * Subscribe to turn-alert events.
   * The service deduplicates: a toast fires at most once per token per session.
   */
  onTurnAlert(callback) {
    if (!this.socket) return;
    this.removeListener('turn-alert');
    const wrapped = (data) => {
      const key = `${data.tokenNumber}`;
      if (this._alertedTokens.has(key)) return; // already alerted
      this._alertedTokens.add(key);
      callback(data);
    };
    this.socket.on('turn-alert', wrapped);
    this.listeners.set('turn-alert', wrapped);
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
