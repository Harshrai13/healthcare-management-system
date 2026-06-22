import { useMemo, useState, useEffect } from 'react';
import { Search, Filter, Download, MoreVertical, Calendar, CheckCircle, XCircle, Clock, Video, Users, Eye, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function AdminAppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['admin_appointments', statusFilter],
    queryFn: async () => {
      const params = { admin: true };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await appointmentsAPI.getAll(params);
      return data.data?.appointments || data.data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await appointmentsAPI.updateStatus(id, status);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_appointments'] });
      toast.success('Appointment status updated');
    },
    onError: () => toast.error('Failed to update status'),
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

  const handleExportCSV = () => {
    const headers = ['ID', 'Patient', 'Doctor', 'Service', 'Date', 'Time', 'Type', 'Status'];
    const rows = appointments.map((apt) => [
      (apt._id || apt.id || '').slice(-8).toUpperCase(),
      apt.patientName || 'Patient',
      apt.doctorName || '-',
      typeof apt.service === 'object' ? apt.service?.name : apt.service || '-',
      new Date(apt.date || apt.appointmentDate || apt.createdAt).toLocaleDateString(),
      new Date(apt.date || apt.appointmentDate || apt.createdAt).toLocaleTimeString(),
      apt.type || 'In-Person',
      apt.status || 'Unknown',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const handleStatusChange = (aptId, newStatus) => {
    updateStatusMutation.mutate({ id: aptId, status: newStatus });
    setOpenMenuId(null);
  };

  if (isLoading) return <LoadingSpinner />;

  const activeFilters = statusFilter !== 'ALL';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Appointment Management</h1>
          <p className="text-neutral-500 text-sm">View and manage all clinic appointments</p>
        </div>
        <button onClick={handleExportCSV} className="btn-outline flex items-center gap-2">
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
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select
            className="px-4 py-2 bg-neutral-50 rounded-xl focus:ring-2 focus:ring-primary-100 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
              className={`p-2 border rounded-xl hover:bg-neutral-50 transition-colors ${activeFilters ? 'border-primary-300 bg-primary-50' : 'border-neutral-200'}`}
            >
              <Filter size={20} className={activeFilters ? 'text-primary-600' : 'text-neutral-600'} />
            </button>
            {showFilters && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 z-30">
                <p className="px-4 py-2 text-xs font-semibold text-neutral-400 uppercase">Quick Filters</p>
                {[
                  { value: 'ALL', label: 'All Appointments' },
                  { value: 'PENDING', label: 'Pending Only' },
                  { value: 'CONFIRMED', label: 'Confirmed Only' },
                  { value: 'COMPLETED', label: 'Completed Only' },
                  { value: 'CANCELLED', label: 'Cancelled Only' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setShowFilters(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors flex items-center justify-between ${statusFilter === opt.value ? 'text-primary-600 font-semibold' : 'text-neutral-700'}`}
                  >
                    {opt.label}
                    {statusFilter === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                  </button>
                ))}
                {activeFilters && (
                  <button
                    onClick={() => { setStatusFilter('ALL'); setShowFilters(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-neutral-100 flex items-center gap-2"
                  >
                    <X size={14} /> Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
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
                      <div className="relative inline-block">
                        <button
                          className="text-neutral-400 hover:text-primary-600 transition-colors p-1"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === (apt._id || apt.id) ? null : (apt._id || apt.id)); }}
                        >
                          <MoreVertical size={20} />
                        </button>
                        {openMenuId === (apt._id || apt.id) && (
                          <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 z-30">
                            <a
                              href={`/dashboard/appointments`}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <Eye size={16} /> View Details
                            </a>
                            {(apt.status === 'PENDING' || apt.status === 'pending') && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(apt._id || apt.id, 'CONFIRMED')}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <CheckCircle size={16} /> Confirm
                                </button>
                                <button
                                  onClick={() => handleStatusChange(apt._id || apt.id, 'CANCELLED')}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <XCircle size={16} /> Cancel
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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
