import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import toast from 'react-hot-toast';

export function useAppointments(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/appointments?${queryString}`);
        return data.data || [];
      } catch { return []; }
    },
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentData) => api.post('/appointments', appointmentData),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Appointment booked successfully!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Booking failed'),
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.put(`/appointments/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Appointment cancelled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Cancellation failed'),
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.post(`/appointments/${id}/reschedule`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      toast.success('Appointment rescheduled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Reschedule failed'),
  });
}
