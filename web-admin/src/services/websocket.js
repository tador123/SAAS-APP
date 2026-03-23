import { io } from 'socket.io-client';

const isTauri = Boolean(window.__TAURI_INTERNALS__);
const SOCKET_URL = import.meta.env.VITE_WS_URL
  || (isTauri ? (localStorage.getItem('serverUrl') || 'http://localhost:3001') : window.location.origin);

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.joinedRooms = new Set();
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: token ? { token } : undefined,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected:', this.socket.id);
      // Rejoin rooms on reconnect
      this.joinedRooms.forEach(room => this.socket.emit('join', room));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });
  }

  updateToken(token) {
    if (this.socket) {
      this.socket.auth = { token };
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.joinedRooms.clear();
  }

  joinRoom(room) {
    this.joinedRooms.add(room);
    if (this.socket?.connected) {
      this.socket.emit('join', room);
    }
  }

  leaveRoom(room) {
    this.joinedRooms.delete(room);
    if (this.socket?.connected) {
      this.socket.emit('leave', room);
    }
  }

  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
    // track for cleanup
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
      const cbs = this.listeners.get(event) || [];
      this.listeners.set(event, cbs.filter(cb => cb !== callback));
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  get connected() {
    return this.socket?.connected || false;
  }
}

// Singleton
const wsService = new WebSocketService();
export default wsService;
