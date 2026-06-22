import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Play, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import { consultationsAPI } from '../../api/generalAPI';
import { useSocket } from '../../hooks/useSocket';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PatientAppointmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('upcoming');
  const { socket } = useSocket();

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['patient_appointments'],
    queryFn: async () => {
      const { data } = await appointmentsAPI.getAll();
      return data.data?.appointments || data.data || [];
    },
  });

  const { data: consultationsData } = useQuery({
    queryKey: ['patient_consultations'],
    queryFn: async () => {
      const { data } = await consultationsAPI.getAll();
      return data.data || [];
    },
  });

  // Listen for real-time consultation started notification
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      toast.success(`${payload.doctorName} has started the call! Join now.`, {
        duration: 8000,
        icon: '📹',
      });
      queryClient.invalidateQueries({ queryKey: ['patient_consultations'] });
    };
    socket.on('consultation:started', handler);
    return () => { socket.off('consultation:started', handler); };
  }, [socket, queryClient]);

  const todayStr = new Date().toISOString().split('T')[0];

  const { upcoming, past, videoConsultations } = useMemo(() => {
    const appts = appointmentsData || [];
    const consultMap = new Map((consultationsData || []).map(c => [c.appointmentId?._id?.toString() || c.appointmentId?.toString(), c]));

    const enriched = appts.map(a => ({
      ...a,
      consultation: consultMap.get(a._id?.toString() || a.id?.toString()),
    }));

    const upcomingAppts = enriched.filter(a => {
      const aptDate = new Date(a.date).toISOString().split('T')[0];
      return aptDate >= todayStr && a.status !== 'CANCELLED';
    });

    const pastAppts = enriched.filter(a => {
      const aptDate = new Date(a.date).toISOString().split('T')[0];
      return aptDate < todayStr || a.status === 'CANCELLED' || a.status === 'COMPLETED';
    });

    const videoAppts = enriched.filter(a => a.consultationType === 'VIDEO');

    return { upcoming: upcomingAppts, past: pastAppts, videoConsultations: videoAppts };
  }, [appointmentsData, consultationsData, todayStr]);

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentsAPI.cancel(id),
    onSuccess: () => {
      toast.success('Appointment cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['patient_appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient_consultations'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to cancel appointment.');
    },
  });

  const handleCancel = (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      cancelMutation.mutate(appointmentId);
    }
  };

  const joinCall = (consultation) => {
    if (!consultation?._id) {
      toast.error('Consultation not found. Please wait for the doctor to start the call.');
      return;
    }
    navigate(`/dashboard/telehealth/${consultation._id}`);
  };

  const getStatusBadge = (status) => {
    const map = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      CONFIRMED: 'bg-blue-100 text-blue-700',
      COMPLETED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
      RESCHEDULED: 'bg-purple-100 text-purple-700',
      NO_SHOW: 'bg-gray-100 text-gray-700',
    };
    return map[status] || 'bg-neutral-100 text-neutral-700';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle size={18} className="text-green-600" />;
      case 'CANCELLED': return <XCircle size={18} className="text-red-600" />;
      case 'PENDING':
      case 'CONFIRMED': return <Clock size={18} className="text-yellow-600" />;
      default: return <Calendar size={18} className="text-neutral-400" />;
    }
  };

  const filteredList = filter === 'upcoming' ? upcoming : past;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900">My Appointments</h1>
            <p className="text-neutral-500 mt-1">Manage your upcoming and past appointments</p>
          </div>
        </div>
      </div>

      {/* Video Consultations Banner */}
      {videoConsultations.filter(a =>
        a.consultation?.status === 'IN_PROGRESS' || a.consultation?.status === 'WAITING'
      ).length > 0 && (
        <div className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Video size={24} />
            <h2 className="text-lg font-bold">Active Video Consultations</h2>
          </div>
          <div className="space-y-3">
            {videoConsultations
              .filter(a => a.consultation?.status === 'IN_PROGRESS' || a.consultation?.status === 'WAITING')
              .map(a => (
                <div key={a._id} className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Dr. {a.doctorId?.userId?.firstName} {a.doctorId?.userId?.lastName}</p>
                    <p className="text-sm text-primary-200">{a.serviceId?.name} &bull; {new Date(a.date).toLocaleDateString()} at {a.startTime}</p>
                    <p className="text-xs text-primary-300 mt-1">
                      {a.consultation?.status === 'IN_PROGRESS' ? '🟢 Doctor is in the room — Join now!' : '🟡 Waiting for doctor to start...'}
                    </p>
                  </div>
                  <button
                    onClick={() => joinCall(a.consultation)}
                    className="bg-white text-primary-700 font-bold px-5 py-2.5 rounded-xl hover:bg-primary-50 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Play size={16} /> Join Call
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['upcoming', 'past'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-primary-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {f === 'upcoming' ? 'Upcoming' : 'Past'}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 bg-white rounded-xl border border-neutral-100">
            <Calendar size={40} className="mx-auto mb-3 text-neutral-300" />
            <p className="font-medium">{filter === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}</p>
            {filter === 'upcoming' && (
              <button onClick={() => navigate('/appointments/book')} className="btn-primary mt-4">
                Book an Appointment
              </button>
            )}
          </div>
        ) : (
          filteredList.map((appt) => {
            const isVideo = appt.consultationType === 'VIDEO';
            const consultation = appt.consultation;
            const canJoin = isVideo && consultation && (consultation.status === 'IN_PROGRESS' || consultation.status === 'WAITING');

            return (
              <div key={appt._id || appt.id} className="bg-white rounded-xl border border-neutral-100 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isVideo ? 'bg-purple-50' : 'bg-primary-50'
                    }`}>
                      {isVideo ? <Video size={20} className="text-purple-600" /> : getStatusIcon(appt.status)}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">
                        Dr. {appt.doctorId?.userId?.firstName} {appt.doctorId?.userId?.lastName}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {appt.serviceId?.name} &bull; {new Date(appt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {appt.startTime}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusBadge(appt.status)}`}>
                          {appt.status?.replace('_', ' ')}
                        </span>
                        {isVideo && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Video Call
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canJoin && (
                      <button
                        onClick={() => joinCall(consultation)}
                        className="btn-primary text-sm py-2 flex items-center gap-2"
                      >
                        <Play size={14} /> {consultation.status === 'IN_PROGRESS' ? 'Join Call' : 'Waiting...'}
                      </button>
                    )}
                    {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                      <button
                        onClick={() => handleCancel(appt._id)}
                        disabled={cancelMutation.isPending}
                        className="text-sm py-2 px-3 flex items-center gap-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
                      >
                        <X size={14} /> Cancel
                      </button>
                    )}
                    {appt.status === 'CONFIRMED' && !canJoin && (
                      <button
                        onClick={() => navigate(`/appointments/book`)}
                        className="btn-outline text-sm py-2"
                      >
                        Reschedule
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
