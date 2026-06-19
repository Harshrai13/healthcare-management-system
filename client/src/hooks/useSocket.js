import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

let socketInstance = null;

export function useSocket() {
  const accessToken = useSelector((state) => state.auth.accessToken);
  const user = useSelector((state) => state.auth.user);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accessToken || !user) {
      // Disconnect if logged out
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    // Connect or reconnect with new token
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;

    if (!socketInstance) {
      socketInstance = io(socketUrl, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance.id);
      });

      socketInstance.on('connect_error', (err) => {
        console.warn('Socket connection error:', err.message);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      socketRef.current = socketInstance;
    } else {
      // Update auth token on existing connection
      socketInstance.auth = { token: accessToken };
      socketInstance.connect();
    }

    return () => {
      // Cleanup on unmount only — don't disconnect on every re-render
    };
  }, [accessToken, user]);

  const joinRoom = useCallback((roomId) => {
    socketInstance?.emit('chat:join', roomId);
  }, []);

  const leaveRoom = useCallback((roomId) => {
    socketInstance?.emit('chat:leave', roomId);
  }, []);

  const emitTyping = useCallback((roomId, isTyping) => {
    socketInstance?.emit('chat:typing', { roomId, isTyping });
  }, []);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    joinRoom,
    leaveRoom,
    emitTyping,
  };
}

export default useSocket;
