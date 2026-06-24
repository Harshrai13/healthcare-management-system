import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Users, Calendar, TrendingUp, TrendingDown, DollarSign,
  Mail, MessageSquare, Bell, Wifi, WifiOff, CheckCircle2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { adminAPI } from '../../api/generalAPI';
import { getEmailAnalytics, getSMSAnalytics, getCommunicationHealth } from '../../api/communicationAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

const COLORS = ['#059669', '#2563eb', '#7c3aed', '#ea580c', '#dc2626', '#0891b2'];
const STATUS_COLORS = {
  emerald: 'text-emerald-600 bg-emerald-50',
  red: 'text-red-600 bg-red-50',
  amber: 'text-amber-600 bg-amber-50',
  blue: 'text-blue-600 bg-blue-50',
  purple: 'text-purple-600 bg-purple-50',
  neutral: 'text-neutral-600 bg-neutral-50',
};

export default function AdminAnalyticsPage() {
  const [emailPeriod, setEmailPeriod] = useState('week');
  const [smsPeriod, setSmsPeriod] = useState('week');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin_analytics'],
    queryFn: async () => {
      const { data } = await adminAPI.getAnalytics({});
      return data.data || {};
    },
  });

  const { data: emailAnalytics, isLoading: emailLoading } = useQuery({
    queryKey: ['email_analytics', emailPeriod],
    queryFn: async () => {
      const { data } = await getEmailAnalytics({ period: emailPeriod });
      return data.data || {};
    },
  });

  const { data: smsAnalytics, isLoading: smsLoading } = useQuery({
    queryKey: ['sms_analytics', smsPeriod],
    queryFn: async () => {
      const { data } = await getSMSAnalytics({ period: smsPeriod });
      return data.data || {};
    },
  });

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['communication_health'],
    queryFn: async () => {
      const { data } = await getCommunicationHealth();
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

  const communicationStats = useMemo(() => {
    const e = emailAnalytics || {};
    const s = smsAnalytics || {};
    return [
      {
        title: 'Emails Sent',
        value: e.totalEmails?.toLocaleString() || '0',
        sub: `${e.sentEmails?.toLocaleString() || 0} delivered · ${e.failedEmails?.toLocaleString() || 0} failed`,
        icon: Mail,
        color: STATUS_COLORS.blue,
      },
      {
        title: 'Email Success Rate',
        value: e.successRate || '0%',
        sub: `${e.pendingEmails?.toLocaleString() || 0} pending`,
        icon: CheckCircle2,
        color: STATUS_COLORS.emerald,
      },
      {
        title: 'SMS Sent',
        value: s.totalSMS?.toLocaleString() || '0',
        sub: `${s.sentSMS?.toLocaleString() || 0} delivered · ${s.failedSMS?.toLocaleString() || 0} failed`,
        icon: MessageSquare,
        color: STATUS_COLORS.purple,
      },
      {
        title: 'SMS Delivery Rate',
        value: s.deliveryRate || '0%',
        sub: `${s.pendingSMS?.toLocaleString() || 0} pending`,
        icon: Wifi,
        color: STATUS_COLORS.amber,
      },
    ];
  }, [emailAnalytics, smsAnalytics]);

  const health = healthData || {};
  const healthScore = parseInt(health.healthScore || '0', 10);

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

  const emailVolume = useMemo(() => {
    const raw = emailAnalytics?.dailyVolume || [];
    return raw.map((d) => ({ date: d._id, sent: d.sent || 0, failed: d.failed || 0, total: d.count || 0 }));
  }, [emailAnalytics]);

  const smsVolume = useMemo(() => {
    const raw = smsAnalytics?.dailyVolume || [];
    return raw.map((d) => ({ date: d._id, sent: d.sent || 0, failed: d.failed || 0, total: d.count || 0 }));
  }, [smsAnalytics]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Analytics & Reports</h1>
        <p className="text-neutral-500 text-sm">Comprehensive clinic performance metrics</p>
      </div>

      {/* Core clinic stats */}
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

      {/* Communication health monitor */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Bell size={20} className="text-primary-600" />
              Communication Health Monitor
            </h3>
            <p className="text-neutral-500 text-sm">Live status of email and SMS delivery services</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">Health Score</span>
            <span className={`text-2xl font-black ${healthScore >= 80 ? 'text-emerald-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {health.healthScore || '0%'}
            </span>
          </div>
        </div>

        {healthLoading ? (
          <div className="py-8 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthCard
              label="Email Service"
              online={health.emailService?.online}
              last={health.emailService?.lastSent}
            />
            <HealthCard
              label="SMS Service"
              online={health.smsService?.online}
              last={health.smsService?.lastSent}
            />
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              <p className="text-sm text-neutral-500 mb-1">Failed (24h)</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-lg font-bold text-neutral-900">{health.failedEmails24h || 0}</p>
                  <p className="text-xs text-neutral-400">emails</p>
                </div>
                <div className="w-px h-8 bg-neutral-200" />
                <div>
                  <p className="text-lg font-bold text-neutral-900">{health.failedSMS24h || 0}</p>
                  <p className="text-xs text-neutral-400">sms</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              <p className="text-sm text-neutral-500 mb-1">Pending Deliveries</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-lg font-bold text-neutral-900">{health.pendingEmails || 0}</p>
                  <p className="text-xs text-neutral-400">emails</p>
                </div>
                <div className="w-px h-8 bg-neutral-200" />
                <div>
                  <p className="text-lg font-bold text-neutral-900">{health.pendingSMS || 0}</p>
                  <p className="text-xs text-neutral-400">sms</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Communication stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(emailLoading || smsLoading)
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm animate-pulse">
                <div className="h-10 w-10 rounded-xl bg-neutral-100 mb-4" />
                <div className="h-8 w-24 bg-neutral-100 rounded mb-2" />
                <div className="h-4 w-32 bg-neutral-100 rounded" />
              </div>
            ))
          : communicationStats.map((stat, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
                <div className={`p-3 rounded-xl w-fit mb-4 ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <h3 className="text-3xl font-black text-neutral-900 mb-1">{stat.value}</h3>
                <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">{stat.title}</p>
                <p className="text-xs text-neutral-400 mt-2">{stat.sub}</p>
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

      {/* Communication volume charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm h-96 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Mail size={18} />
              Email Volume
            </h3>
            <select
              value={emailPeriod}
              onChange={(e) => setEmailPeriod(e.target.value)}
              className="text-sm bg-neutral-50 border-none rounded-lg px-3 py-1 outline-none"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emailVolume}>
                <defs>
                  <linearGradient id="emailSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="emailFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="sent" stroke="#2563eb" fill="url(#emailSent)" name="Sent" />
                <Area type="monotone" dataKey="failed" stroke="#dc2626" fill="url(#emailFailed)" name="Failed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm h-96 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <MessageSquare size={18} />
              SMS Volume
            </h3>
            <select
              value={smsPeriod}
              onChange={(e) => setSmsPeriod(e.target.value)}
              className="text-sm bg-neutral-50 border-none rounded-lg px-3 py-1 outline-none"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={smsVolume}>
                <defs>
                  <linearGradient id="smsSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="smsFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="sent" stroke="#7c3aed" fill="url(#smsSent)" name="Sent" />
                <Area type="monotone" dataKey="failed" stroke="#dc2626" fill="url(#smsFailed)" name="Failed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthCard({ label, online, last }) {
  return (
    <div className={`p-4 rounded-2xl border ${online ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
      <div className="flex items-center gap-2 mb-2">
        {online ? (
          <Wifi size={18} className="text-emerald-600" />
        ) : (
          <WifiOff size={18} className="text-red-600" />
        )}
        <span className={`text-sm font-semibold ${online ? 'text-emerald-700' : 'text-red-700'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <p className="text-sm text-neutral-500 mb-1">{label}</p>
      <p className="text-xs text-neutral-400">
        Last sent: {last ? new Date(last).toLocaleString() : 'Never'}
      </p>
    </div>
  );
}
