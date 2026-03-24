import { useEffect, useCallback } from 'react';
import wsService from '../services/websocket';

/**
 * React hook for WebSocket events.
 * Connects to the WS server, joins rooms, and subscribes to events.
 * 
 * @param {string|string[]} rooms - Room(s) to join
 * @param {Object} events - Map of event name → handler function
 * @param {boolean} enabled - Whether to connect (default: true)
 */
export function useWebSocket(rooms = [], events = {}, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    // Don't call connect() here — AuthContext manages the connection with proper auth.
    // Just join rooms and register event handlers.
    const roomList = Array.isArray(rooms) ? rooms : [rooms];
    roomList.forEach(room => wsService.joinRoom(room));

    // Subscribe to events
    const entries = Object.entries(events);
    entries.forEach(([event, handler]) => {
      wsService.on(event, handler);
    });

    return () => {
      entries.forEach(([event, handler]) => {
        wsService.off(event, handler);
      });
      roomList.forEach(room => wsService.leaveRoom(room));
    };
  }, [enabled]); // Intentionally stable — handlers should be wrapped in useCallback
}

export default useWebSocket;
