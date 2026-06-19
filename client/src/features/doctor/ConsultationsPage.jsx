import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Video, CheckCircle, Clock, Play, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import { consultationsAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

function ConsultationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('today');

  // Fetch VIDEO appointments for this doctor
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['consultations_appointments'],
    queryFn: async () => {
      const { data } = await appointmentsAPI.getAll({ type: 'VIDEO' });
      return data.data?.appointments || data.data || [];
    },
  });

  // Fetch all consultations for this doctor
  const { data: consultations = [] } = useQuery({
    queryKey: ['doctor_consultations'],
    queryFn: async () => {
      const { data } = await consultationsAPI.getAll();
      return data || [];
    },
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Merge appointments with their consultation records
  const mergedConsultations = useMemo(() => {
    const consultMap = new Map(consultations.map(c => [
      c.appointmentId?._id?.toString() || c.appointmentId?.toString(), c
    ]));

    return appointments.map(apt => ({
      ...apt,
      consultation: consultMap.get(apt._id?.toString() || apt.id?.toString()),
    }));
  }, [appointments, consultations]);

  const { todayConsultations, historyConsultations, statsData } = useMemo(() => {
    const today = mergedConsultations.filter(a => {
      const aptDate = new Date(a.date).toISOString().split('T')[0];
      return aptDate === todayStr;
    });

    const history = mergedConsultations.filter(a => {
      const aptDate = new Date(a.date).toISOString().split('T')[0];
      return aptDate < todayStr || a.status === 'COMPLETED';
    });

    return {
      todayConsultations: today,
      historyConsultations: history,
      statsData: {
        waiting: mergedConsultations.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING').length,
        inProgress: mergedConsultations.filter(a => a.consultation?.status === 'IN_PROGRESS').length,
        completed: mergedConsultations.filter(a => a.status === 'COMPLETED').length,
      },
    };
  }, [mergedConsultations, todayStr]);

  const startMutation = useMutation({
    mutationFn: (appointmentId) => consultationsAPI.start(appointmentId),
    onSuccess: (res) => {
      const consultationId = res.data?.data?.consultation?._id || res.data?.data?.consultation?.id;
      if (consultationId) {
        navigate(`/doctor/telehealth/${consultationId}`);
      }
      queryClient.invalidateQueries({ queryKey: ['consultations_appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor_consultations'] });
      toast.success('Consultation started');
    },
    onError: () => toast.error('Failed to start consultation'),
  });

  const completeMutation = useMutation({
    mutationFn: (consultationId) => consultationsAPI.complete(consultationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations_appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor_consultations'] });
      toast.success('Consultation completed');
    },
    onError: () => toast.error('Failed to complete consultation'),
  });

  const filteredConsultations = filter === 'today' ? todayConsultations : historyConsultations;

  const getPatientName = (apt) => {
    if (apt.patientId) {
      if (typeof apt.patientId === 'object') return `${apt.patientId.firstName || ''} ${apt.patientId.lastName || ''}`.trim() || 'Patient';
    }
    return apt.patientName || 'Patient';
  };

  const getServiceName = (apt) => {
    if (apt.serviceId) {
      if (typeof apt.serviceId === 'object') return apt.serviceId.name || 'Consultation';
    }
    return apt.serviceName || apt.service || 'Consultation';
  };

  const getDoctorName = (apt) => {
    if (apt.doctorId?.userId) {
      return `${apt.doctorId.userId.firstName || ''} ${apt.doctorId.userId.lastName || ''}`.trim() || 'Doctor';
    }
    return 'Doctor';
  };

  const formatDate = (apt) => {
    const aptDate = new Date(apt.date || apt.appointmentDate || apt.createdAt);
    const today = new Date();
    if (aptDate.toDateString() === today.toDateString()) return 'Today';
    return aptDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (apt) => {
    return apt.startTime || new Date(apt.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Consultations</h1>
          <p className="text-neutral-500 mt-1">Manage your video consultations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
          <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center mb-3">
            <Clock size={20} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{statsData.waiting}</p>
          <p className="text-sm text-neutral-500">Waiting</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3">
            <Video size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{statsData.inProgress}</p>
          <p className="text-sm text-neutral-500">In Progress</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
            <CheckCircle size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{statsData.completed}</p>
          <p className="text-sm text-neutral-500">Completed</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['today', 'history'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-primary-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {f === 'today' ? "Today's Sessions" : 'History'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredConsultations.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 bg-white rounded-xl border border-neutral-100">
            <Video size={40} className="mx-auto mb-3 text-neutral-300" />
            <p className="font-medium">{filter === 'today' ? 'No video consultations today' : 'No past consultations'}</p>
          </div>
        ) : (
          filteredConsultations.map((apt) => {
            const consultation = apt.consultation;
            const consultStatus = consultation?.status || 'WAITING';
            return (
            <div key={apt._id || apt.id} className="bg-white rounded-xl border border-neutral-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    consultStatus === 'IN_PROGRESS' ? 'bg-green-100' :
                    consultStatus === 'WAITING' ? 'bg-yellow-100' : 'bg-neutral-100'
                  }`}>
                    <Video size={18} className={
                      consultStatus === 'IN_PROGRESS' ? 'text-green-600' :
                      consultStatus === 'WAITING' ? 'text-yellow-600' : 'text-neutral-400'
                    } />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{getPatientName(apt)}</p>
                    <p className="text-sm text-neutral-500">{getServiceName(apt)} &bull; {formatDate(apt)} at {formatTime(apt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    consultStatus === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' :
                    consultStatus === 'WAITING' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {consultStatus.replace('_', ' ')}
                  </span>
                  {(apt.status === 'CONFIRMED' || apt.status === 'PENDING') && consultStatus !== 'IN_PROGRESS' && (
                    <button
                      onClick={() => startMutation.mutate(apt._id || apt.id)}
                      disabled={startMutation.isPending}
                      className="btn-primary text-sm py-2 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Play size={14} /> Start
                    </button>
                  )}
                  {consultStatus === 'IN_PROGRESS' && (
                    <button
                      onClick={() => completeMutation.mutate(consultation._id || consultation.id)}
                      disabled={completeMutation.isPending}
                      className="btn-outline text-sm py-2 flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle size={14} /> Complete
                    </button>
                  )}
                  {consultStatus === 'COMPLETED' && (
                    <button className="p-2 text-neutral-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors" title="View Notes">
                      <FileText size={16} />
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

export default ConsultationsPage;
