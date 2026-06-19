import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios';
import { isAdminRole } from '../utils/adminNav';

export function useDashboardSearch() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const items = [];
      const role = user?.role;

      if (role === 'PATIENT') {
        const [apptRes, prescRes] = await Promise.allSettled([
          api.get('/appointments', { params: { limit: 5 } }),
          api.get('/prescriptions', { params: { limit: 5 } }),
        ]);

        if (apptRes.status === 'fulfilled') {
          const appointments = apptRes.value.data.data?.appointments || [];
          appointments
            .filter((a) => {
              const doctorName = `${a.doctorId?.userId?.firstName || ''} ${a.doctorId?.userId?.lastName || ''}`.toLowerCase();
              const service = (a.serviceId?.name || '').toLowerCase();
              return doctorName.includes(term.toLowerCase()) || service.includes(term.toLowerCase());
            })
            .forEach((a) => items.push({
              type: 'Appointment',
              label: `${a.serviceId?.name || 'Appointment'} — Dr. ${a.doctorId?.userId?.lastName || ''}`,
              path: '/dashboard/appointments',
            }));
        }

        if (prescRes.status === 'fulfilled') {
          const prescriptions = prescRes.value.data.data?.prescriptions || prescRes.value.data.data || [];
          prescriptions
            .filter((p) => (p.medications || []).some((m) => m.name?.toLowerCase().includes(term.toLowerCase())))
            .forEach(() => items.push({ type: 'Prescription', label: 'Matching prescription', path: '/dashboard/prescriptions' }));
        }

        if (term.toLowerCase().includes('bill') || term.toLowerCase().includes('pay')) {
          items.push({ type: 'Page', label: 'Billing & Payments', path: '/dashboard/billing' });
        }
      } else if (role === 'DOCTOR') {
        const { data } = await api.get('/appointments', { params: { limit: 20 } });
        const appointments = data.data?.appointments || [];
        appointments
          .filter((a) => {
            const patientName = `${a.patientId?.firstName || ''} ${a.patientId?.lastName || ''}`.toLowerCase();
            return patientName.includes(term.toLowerCase());
          })
          .slice(0, 5)
          .forEach((a) => items.push({
            type: 'Patient',
            label: `${a.patientId?.firstName} ${a.patientId?.lastName}`,
            path: '/doctor/patients',
          }));
      } else if (isAdminRole(role)) {
        const { data } = await api.get('/admin/users', { params: { search: term, limit: 5 } });
        (data.data?.users || []).forEach((u) => items.push({
          type: u.role,
          label: `${u.firstName} ${u.lastName} (${u.email})`,
          path: u.role === 'DOCTOR' ? '/admin/doctors' : '/admin/patients',
        }));
      }

      setResults(items.slice(0, 6));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const navigateTo = (path) => {
    navigate(path);
    setQuery('');
    setResults([]);
  };

  return { query, setQuery, results, loading, navigateTo };
}

export default useDashboardSearch;
