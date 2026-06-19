import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export function useDoctors(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ['doctors', params],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/doctors?${queryString}`);
        return data.data?.doctors || data.data || [];
      } catch { return []; }
    },
  });
}

export function useDoctor(id) {
  return useQuery({
    queryKey: ['doctor', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/doctors/${id}`);
        return data.data;
      } catch { return null; }
    },
    enabled: !!id,
  });
}

export function useDoctorSchedule(doctorId) {
  return useQuery({
    queryKey: ['doctorSchedule', doctorId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/doctors/${doctorId}/schedule`);
        return data.data || [];
      } catch { return []; }
    },
    enabled: !!doctorId,
  });
}
