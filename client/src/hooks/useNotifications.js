import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useSocket } from './useSocket';

export function useNotifications() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/notifications');
        return data.data?.notifications || [];
      } catch { return []; }
    },
    enabled: panelOpen, // Only fetch when notification panel is opened
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchInterval: panelOpen ? 120000 : false, // Poll every 2 min only when open
  });

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      // Optimistically prepend to cache
      queryClient.setQueryData(['notifications'], (old = []) => {
        if (old.some((n) => n._id === notification._id)) return old;
        return [notification, ...old];
      });
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, queryClient]);

  const markAsRead = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    isLoading,
    unreadCount,
    panelOpen,
    setPanelOpen,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
  };
}

export default useNotifications;
