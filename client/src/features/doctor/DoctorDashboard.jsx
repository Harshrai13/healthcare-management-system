import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, FileText, Video, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import { prescriptionsAPI } from '../../api/medicalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

function DoctorDashboard() {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('today');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor_appointments'],
    queryFn: async () => {
      const { data } = await appointmentsAPI.getAll({ doctor: user?._id || user?.id });
      return data.data?.appointments || data.data || [];
    },
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['doctor_prescriptions'],
    queryFn: async () => {
      const { data } = await prescriptionsAPI.getAll({ doctor: user?._id || user?.id });
      return data.data?.prescriptions || data.data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      status === 'CANCELLED'
        ? appointmentsAPI.cancel(id)
        : appointmentsAPI.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor_appointments'] });
      toast.success('Appointment status updated');
    },
    onError: () => toast.error('Failed to update appointment status'),
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const { todayAppointments, upcomingAppointments, historyAppointments, stats } = useMemo(() => {
    const today = appointments.filter((a) => {
      const aptDate = new Date(a.date || a.appointmentDate || a.createdAt);
      return aptDate.toISOString().split('T')[0] === todayStr;
    });
    const upcoming = appointments.filter((a) => {
      const aptDate = new Date(a.date || a.appointmentDate || a.createdAt);
      return aptDate.toISOString().split('T')[0] > todayStr;
    });
    const history = appointments.filter((a) =>
      a.status === 'COMPLETED' || a.status === 'completed'
    );

    const totalPatients = new Set(appointments.map((a) => a.patientId || a.patient)).size;
    const pendingReview = appointments.filter((a) => a.status === 'PENDING' || a.status === 'pending').length;
    const completedThisWeek = history.filter((a) => {
      const aptDate = new Date(a.date || a.appointmentDate || a.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return aptDate >= weekAgo;
    }).length;

    return {
      todayAppointments: today,
      upcomingAppointments: upcoming,
      historyAppointments: history,
      stats: [
        { label: "Today's Appointments", value: today.length, icon: Calendar, color: 'bg-primary-100 text-primary-700' },
        { label: 'Pending Reviews', value: pendingReview, icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
        { label: 'Total Patients', value: totalPatients, icon: Users, color: 'bg-blue-100 text-blue-700' },
        { label: 'Completed This Week', value: completedThisWeek, icon: CheckCircle, color: 'bg-green-100 text-green-700' },
      ],
    };
  }, [appointments, todayStr]);

  const getPatientName = (apt) => {
    if (typeof apt.patient === 'object') return apt.patient?.name || apt.patientName || 'Patient';
    return apt.patientName || 'Patient';
  };

  const getServiceName = (apt) => {
    if (typeof apt.service === 'object') return apt.service?.name || 'Consultation';
    return apt.service || apt.serviceName || 'Consultation';
  };

  const formatTime = (apt) => {
    const d = new Date(apt.date || apt.appointmentDate || apt.createdAt);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Doctor Dashboard</h1>
          <p className="text-neutral-500 mt-1">Manage your appointments and patients</p>
        </div>
        <button onClick={() => navigate('/telehealth')} className="btn-primary flex items-center gap-2">
          <Video size={18} />
          Start Consultation
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 border border-neutral-100 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
            <p className="text-sm text-neutral-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm">
        <div className="border-b border-neutral-100 px-6 py-4">
          <div className="flex gap-4">
            {['today', 'upcoming', 'history', 'prescriptions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'today' && (
            <div className="space-y-3">
              {todayAppointments.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Calendar size={40} className="mx-auto mb-3 text-neutral-300" />
                  <p className="font-medium">No appointments scheduled for today</p>
                </div>
              ) : (
                todayAppointments.map((apt) => {
                  const patientName = getPatientName(apt);
                  const initials = patientName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={apt._id || apt.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-100 hover:border-primary-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-semibold text-sm">{initials}</span>
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{patientName}</p>
                          <p className="text-sm text-neutral-500">{getServiceName(apt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-neutral-700">{formatTime(apt)}</p>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                            apt.type === 'VIDEO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {apt.type === 'VIDEO' && <Video size={10} />}
                            {apt.type || 'IN_PERSON'}
                          </span>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          apt.status === 'CONFIRMED' || apt.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {apt.status}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: apt._id || apt.id, status: 'COMPLETED' })}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                            title="Mark Complete"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: apt._id || apt.id, status: 'CANCELLED' })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                          <button
                            onClick={() => navigate('/messages')}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Message Patient"
                          >
                            <MessageSquare size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Calendar size={40} className="mx-auto mb-3 text-neutral-300" />
                  <p className="font-medium">No upcoming appointments beyond today</p>
                </div>
              ) : (
                upcomingAppointments.map((apt) => (
                  <div key={apt._id || apt.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-100">
                    <div>
                      <p className="font-medium text-neutral-900">{getPatientName(apt)}</p>
                      <p className="text-sm text-neutral-500">{getServiceName(apt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-500">{new Date(apt.date || apt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        apt.status === 'CONFIRMED' || apt.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {historyAppointments.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <CheckCircle size={40} className="mx-auto mb-3 text-neutral-300" />
                  <p className="font-medium">No completed appointments yet</p>
                </div>
              ) : (
                historyAppointments.slice(0, 10).map((apt) => (
                  <div key={apt._id || apt.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-100">
                    <div>
                      <p className="font-medium text-neutral-900">{getPatientName(apt)}</p>
                      <p className="text-sm text-neutral-500">{getServiceName(apt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-500">{new Date(apt.date || apt.appointmentDate || apt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        COMPLETED
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'prescriptions' && (
            <div className="space-y-3">
              <button onClick={() => navigate('/doctor/prescriptions/new')} className="btn-primary mb-4 flex items-center gap-2">
                <FileText size={16} />
                New Prescription
              </button>
              {prescriptions.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <FileText size={40} className="mx-auto mb-3 text-neutral-300" />
                  <p className="font-medium">No prescriptions issued yet</p>
                </div>
              ) : (
                prescriptions.slice(0, 10).map((rx) => (
                  <div key={rx._id || rx.id} className="flex items-center justify-between p-4 rounded-lg border border-neutral-100">
                    <div>
                      <p className="font-medium text-neutral-900">{rx.patientName || 'Patient'}</p>
                      <p className="text-sm text-neutral-500">{rx.medication || rx.name} {rx.dosage}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-neutral-500">{new Date(rx.date || rx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        rx.status === 'Active' || rx.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {rx.status || 'Active'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctorDashboard;
