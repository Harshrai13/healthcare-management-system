import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Calendar, FileText, Pill, CreditCard, Clock, CheckCircle, XCircle, Video, Play } from 'lucide-react';
import api from '../../api/axios';

function PatientDashboard() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await api.get('/appointments?limit=5');
      return data.data;
    },
    enabled: !!user,
  });

  const { data: consultationsData } = useQuery({
    queryKey: ['patient_consultations'],
    queryFn: async () => {
      const { data } = await api.get('/consultations');
      return data.data || [];
    },
    enabled: !!user,
  });

  const consultMap = useMemo(() => {
    return new Map((consultationsData || []).map(c => [c.appointmentId?._id?.toString() || c.appointmentId?.toString(), c]));
  }, [consultationsData]);

  const stats = [
    { label: 'Upcoming', value: appointmentsData?.appointments?.filter((a) => a.status === 'CONFIRMED').length || 0, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Completed', value: appointmentsData?.appointments?.filter((a) => a.status === 'COMPLETED').length || 0, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Cancelled', value: appointmentsData?.appointments?.filter((a) => a.status === 'CANCELLED').length || 0, icon: XCircle, color: 'bg-red-50 text-red-600' },
    { label: 'Pending', value: appointmentsData?.appointments?.filter((a) => a.status === 'PENDING').length || 0, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      CONFIRMED: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-red-100 text-red-700',
      RESCHEDULED: 'bg-purple-100 text-purple-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-2xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="mt-2 text-primary-100">Here's an overview of your healthcare journey.</p>
        <Link to="/dashboard/appointments/book" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-white text-primary-700 font-medium rounded-lg hover:bg-primary-50 transition-colors">
          <Calendar size={18} /> Book New Appointment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-sm text-neutral-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: 'Book Appointment', icon: Calendar, path: '/dashboard/appointments/book', color: 'bg-primary-50 text-primary-700' },
          { label: 'Medical Records', icon: FileText, path: '/dashboard/records', color: 'bg-blue-50 text-blue-700' },
          { label: 'Prescriptions', icon: Pill, path: '/dashboard/prescriptions', color: 'bg-purple-50 text-purple-700' },
          { label: 'Billing', icon: CreditCard, path: '/dashboard/billing', color: 'bg-orange-50 text-orange-700' },
        ].map((action) => (
          <Link key={action.label} to={action.path} className="card flex flex-col items-center text-center hover:scale-105 transition-transform">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${action.color}`}>
              <action.icon size={28} />
            </div>
            <span className="font-medium text-neutral-900">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Appointments */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading font-semibold text-neutral-900">Recent Appointments</h2>
          <Link to="/dashboard/appointments" className="text-primary-700 font-medium hover:underline text-sm">View All</Link>
        </div>
        {appointmentsData?.appointments?.length > 0 ? (
          <div className="space-y-4">
            {appointmentsData.appointments.slice(0, 5).map((appt) => {
              const consultation = consultMap.get(appt._id?.toString() || appt.id?.toString());
              const isVideo = appt.consultationType === 'VIDEO';
              const canJoin = isVideo && consultation && (consultation.status === 'IN_PROGRESS' || consultation.status === 'WAITING');
              return (
                <div key={appt.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isVideo ? 'bg-purple-100' : 'bg-primary-100'}`}>
                      {isVideo ? <Video size={20} className="text-purple-700" /> : <Calendar size={20} className="text-primary-700" />}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Dr. {appt.doctor?.user?.firstName} {appt.doctor?.user?.lastName}</p>
                      <p className="text-sm text-neutral-500">{appt.service?.name} &bull; {new Date(appt.date).toLocaleDateString()} at {appt.startTime}</p>
                      {isVideo && consultation?.status === 'IN_PROGRESS' && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">Doctor is in the room</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appt.status)}`}>
                      {appt.status}
                    </span>
                    {canJoin && (
                      <button
                        onClick={() => navigate(`/dashboard/telehealth/${consultation._id}`)}
                        className="bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-primary-800 transition-colors"
                      >
                        <Play size={12} /> Join
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar size={48} className="mx-auto text-neutral-300 mb-4" />
            <p className="text-neutral-500">No appointments yet. Book your first appointment today!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientDashboard;
