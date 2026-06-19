import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { adminAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

const COLORS = ['#059669', '#2563eb', '#7c3aed', '#ea580c', '#dc2626', '#0891b2'];

export default function AdminAnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin_analytics'],
    queryFn: async () => {
      const { data } = await adminAPI.getAnalytics({});
      return data.data || {};
    },
  });

  const stats = useMemo(() => {
    const a = analytics || {};
    return [
      { title: 'Total Patients', value: a.totalPatients?.toLocaleString() || '0', trend: a.patientsTrend || '+0%', isUp: true, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Appointments (MTD)', value: a.appointmentsMTD?.toLocaleString() || '0', trend: a.appointmentsTrend || '+0%', isUp: true, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { title: 'Telehealth Ratio', value: a.telehealthRatio || '0%', trend: a.telehealthTrend || '+0%', isUp: true, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
      { title: 'Revenue (MTD)', value: a.revenueMTD ? `₹${a.revenueMTD.toLocaleString('en-IN')}` : '₹0', trend: a.revenueTrend || '+0%', isUp: true, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];
  }, [analytics]);

  const revenueData = useMemo(() => {
    if (analytics?.revenueChart) return analytics.revenueChart;
    return [
      { month: 'Jan', revenue: 0, target: 0 },
      { month: 'Feb', revenue: 0, target: 0 },
      { month: 'Mar', revenue: 0, target: 0 },
      { month: 'Apr', revenue: 0, target: 0 },
      { month: 'May', revenue: 0, target: 0 },
      { month: 'Jun', revenue: 0, target: 0 },
    ];
  }, [analytics]);

  const demographicsData = useMemo(() => {
    if (analytics?.demographics) return analytics.demographics;
    return [
      { name: 'Adults (18-44)', value: 35 },
      { name: 'Middle-Aged (45-64)', value: 30 },
      { name: 'Seniors (65+)', value: 20 },
      { name: 'Pediatric (0-17)', value: 15 },
    ];
  }, [analytics]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Analytics & Reports</h1>
        <p className="text-neutral-500 text-sm">Comprehensive clinic performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className={`flex items-center text-xs font-bold ${stat.isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                {stat.isUp ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                {stat.trend}
              </span>
            </div>
            <h3 className="text-3xl font-black text-neutral-900 mb-1">{stat.value}</h3>
            <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm h-96 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-neutral-900">Revenue vs Target</h3>
            <select className="text-sm bg-neutral-50 border-none rounded-lg px-3 py-1 outline-none">
              <option>Last 6 Months</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="target" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographics Pie Chart */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm h-96 flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-neutral-900">Patient Demographics</h3>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demographicsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {demographicsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
