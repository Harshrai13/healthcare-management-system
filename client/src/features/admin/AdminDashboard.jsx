import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, DollarSign, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../api/axios';

function AdminDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard');
      return data.data;
    },
  });

  const stats = dashboardData?.stats || {};

  const statCards = [
    { label: 'Total Patients', value: stats.totalPatients || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Doctors', value: stats.totalDoctors || 0, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: "Today's Appointments", value: stats.todayAppointments || 0, icon: Calendar, color: 'bg-purple-50 text-purple-600' },
    { label: 'Pending Appointments', value: stats.pendingAppointments || 0, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Completed', value: stats.completedAppointments || 0, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, icon: DollarSign, color: 'bg-orange-50 text-orange-600' },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      CONFIRMED: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-2xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-primary-100">Overview of your medical center's performance.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((stat) => (
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

          {/* Recent Appointments */}
          <div className="card">
            <h2 className="text-xl font-heading font-semibold text-neutral-900 mb-6">Recent Appointments</h2>
            {dashboardData?.recentAppointments?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Patient</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Doctor</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Service</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recentAppointments.map((appt) => (
                      <tr key={appt.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="py-3 px-4 text-sm text-neutral-900">{appt.patient?.firstName} {appt.patient?.lastName}</td>
                        <td className="py-3 px-4 text-sm text-neutral-900">Dr. {appt.doctor?.user?.firstName} {appt.doctor?.user?.lastName}</td>
                        <td className="py-3 px-4 text-sm text-neutral-600">{appt.service?.name}</td>
                        <td className="py-3 px-4 text-sm text-neutral-600">{new Date(appt.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(appt.status)}`}>
                            {appt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar size={48} className="mx-auto text-neutral-300 mb-4" />
                <p className="text-neutral-500">No appointments yet.</p>
              </div>
            )}
          </div>

          {/* Quick Stats Chart Placeholder */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-heading font-semibold text-neutral-900 mb-4">Appointments by Status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Confirmed', count: stats.totalPatients || 0, color: 'bg-green-500' },
                  { label: 'Pending', count: stats.pendingAppointments || 0, color: 'bg-yellow-500' },
                  { label: 'Completed', count: stats.completedAppointments || 0, color: 'bg-blue-500' },
                  { label: 'Cancelled', count: 0, color: 'bg-red-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="flex-1 text-sm text-neutral-700">{item.label}</span>
                    <span className="font-medium text-neutral-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-heading font-semibold text-neutral-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: 'Manage Doctors', path: '/admin/doctors' },
                  { label: 'View All Patients', path: '/admin/patients' },
                  { label: 'Review Analytics', path: '/admin/analytics' },
                  { label: 'Check Audit Logs', path: '/admin/audit-logs' },
                ].map((action) => (
                  <a key={action.label} href={action.path} className="block px-4 py-3 rounded-lg bg-neutral-50 hover:bg-primary-50 hover:text-primary-700 transition-colors text-sm font-medium text-neutral-700">
                    {action.label} →
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
