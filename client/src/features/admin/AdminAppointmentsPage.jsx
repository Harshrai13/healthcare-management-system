import { useMemo, useState } from 'react';
import { Search, Filter, Download, MoreVertical, Calendar, CheckCircle, XCircle, Clock, Video, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminAppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['admin_appointments', statusFilter],
    queryFn: async () => {
      const params = { admin: true };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await appointmentsAPI.getAll(params);
      return data.data?.appointments || data.data || [];
    },
  });

  const filteredAppointments = useMemo(() => {
    if (!searchQuery) return appointments;
    const q = searchQuery.toLowerCase();
    return appointments.filter((apt) =>
      (apt.patientName || '').toLowerCase().includes(q) ||
      (apt.doctorName || '').toLowerCase().includes(q) ||
      (apt._id || apt.id || '').toLowerCase().includes(q)
    );
  }, [appointments, searchQuery]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = appointments.filter((a) => {
      const d = new Date(a.date || a.appointmentDate || a.createdAt).toISOString().split('T')[0];
      return d === todayStr;
    }).length;
    const pending = appointments.filter((a) => a.status === 'PENDING' || a.status === 'pending').length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'completed').length;
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED' || a.status === 'cancelled').length;
    return { today, pending, completed, cancelled };
  }, [appointments]);

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'CONFIRMED': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Confirmed</span>;
      case 'PENDING': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending</span>;
      case 'COMPLETED': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Completed</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Cancelled</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700">{status}</span>;
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'VIDEO' || type === 'video') return <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md"><Video size={12} /> Video</span>;
    return <span className="flex items-center gap-1 text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-md"><Users size={12} /> In-Person</span>;
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Appointment Management</h1>
          <p className="text-neutral-500 text-sm">View and manage all clinic appointments</p>
        </div>
        <button className="btn-outline flex items-center gap-2">
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Today's Appointments", value: stats.today, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Pending Approvals', value: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Cancellations', value: stats.cancelled, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-neutral-500 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-neutral-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Search by patient, doctor, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-300"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select
            className="px-4 py-2 bg-neutral-50 border-transparent rounded-xl focus:ring-2 focus:ring-primary-100 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button className="p-2 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
            <Filter size={20} className="text-neutral-600" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Doctor</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-500">
                    <Calendar className="mx-auto text-neutral-300 mb-3" size={40} />
                    <p className="font-medium">No appointments found</p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt._id || apt.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">{(apt._id || apt.id || '').slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                          {(apt.patientName || 'P')[0]}
                        </div>
                        <span className="text-sm font-medium text-neutral-900">{apt.patientName || 'Patient'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{apt.doctorName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{typeof apt.service === 'object' ? apt.service?.name : apt.service || '-'}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-neutral-900">{new Date(apt.date || apt.appointmentDate || apt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-xs text-neutral-500">{new Date(apt.date || apt.appointmentDate || apt.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(apt.type)}</td>
                    <td className="px-6 py-4">{getStatusBadge(apt.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-neutral-400 hover:text-primary-600 transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
          <p className="text-sm text-neutral-500">Showing {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
}
