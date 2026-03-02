import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

/**
 * useSocket
 * Creates and manages a persistent Socket.io connection.
 * Auto-reconnects, exposes connection status, and cleans up on unmount.
 *
 * @param {string} token  - JWT for socket authentication
 * @param {object} options - Extra socket.io options
 * @returns {{ socket, connected, error }}
 */
export const useSocket = (token, options = {}) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      timeout: 20000,
      ...options,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      console.log('🟢 Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('🔴 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err.message);
      console.error('Socket connection error:', err.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      setConnected(true);
      setError(null);
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempt(s)`);
    });

    socket.on('reconnect_failed', () => {
      setError('Failed to reconnect to server after multiple attempts.');
      console.error('Socket reconnection failed');
    });

    return () => {
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return { socket: socketRef.current, connected, error };
};