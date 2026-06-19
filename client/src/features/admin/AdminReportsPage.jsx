import { useState, useMemo } from 'react';
import { Calendar, Download, TrendingUp, DollarSign, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { invoicesAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

const COLORS = ['#059669', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function AdminReportsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('custom');

  const { data, isLoading } = useQuery({
    queryKey: ['admin_invoices_report', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await invoicesAPI.getAll({ dateFrom, dateTo, limit: 1000 });
      return data.data?.invoices || [];
    },
  });

  const { data: paymentData } = useQuery({
    queryKey: ['admin_payments_report'],
    queryFn: async () => {
      const { data } = await invoicesAPI.getPaymentHistory({ limit: 1000 });
      return data.data?.payments || [];
    },
  });

  const invoices = data || [];
  const payments = paymentData || [];

  const stats = useMemo(() => {
    const totalRevenue = invoices.filter((i) => i.status === 'PAID').reduce((sum, i) => sum + (i.total || 0), 0);
    const totalPending = invoices.filter((i) => i.status === 'PENDING').reduce((sum, i) => sum + (i.total || 0), 0);
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((i) => i.status === 'PAID').length;
    const avgInvoiceValue = paidInvoices > 0 ? totalRevenue / paidInvoices : 0;
    const collectionRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    return { totalRevenue, totalPending, totalInvoices, paidInvoices, avgInvoiceValue, collectionRate };
  }, [invoices]);

  const dailyRevenueData = useMemo(() => {
    const dailyMap = {};
    invoices.filter((i) => i.status === 'PAID').forEach((inv) => {
      const date = new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dailyMap[date] = (dailyMap[date] || 0) + (inv.total || 0);
    });
    return Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }));
  }, [invoices]);

  const serviceBreakdown = useMemo(() => {
    const serviceMap = {};
    invoices.forEach((inv) => {
      const serviceName = inv.appointmentId?.serviceId?.name || 'Other Services';
      if (inv.status === 'PAID') {
        serviceMap[serviceName] = (serviceMap[serviceName] || 0) + (inv.total || 0);
      }
    });
    return Object.entries(serviceMap).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const paymentMethodBreakdown = useMemo(() => {
    const methodMap = {};
    payments.forEach((p) => {
      const method = p.method || 'MANUAL';
      methodMap[method] = (methodMap[method] || 0) + (p.amount || 0);
    });
    return Object.entries(methodMap).map(([name, value]) => ({ name, value }));
  }, [payments]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    const now = new Date();
    let from = new Date();

    switch (newPeriod) {
      case 'today':
        from = now;
        break;
      case 'week':
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        from.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        from.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return;
    }

    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Invoice ID', 'Patient', 'Amount', 'Status', 'Payment Method'];
    const rows = invoices.map((inv) => [
      new Date(inv.createdAt).toLocaleDateString('en-IN'),
      inv._id?.slice(-8).toUpperCase(),
      inv.patientId ? `${inv.patientId.firstName} ${inv.patientId.lastName}` : '-',
      inv.total || 0,
      inv.status,
      inv.payments?.[0]?.method || '-',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_report_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Revenue Reports</h1>
          <p className="text-neutral-500 text-sm">Analyze clinic revenue and payment trends</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors text-sm font-medium"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex gap-2 flex-wrap">
            {['today', 'week', 'month', 'quarter', 'year', 'custom'].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-3 items-center md:ml-auto">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-neutral-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPeriod('custom'); }}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              />
            </div>
            <span className="text-neutral-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPeriod('custom'); }}
              className="px-3 py-2 border border-neutral-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Total Revenue</p>
          <h3 className="text-xl font-bold text-neutral-900">{formatCurrency(stats.totalRevenue)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><TrendingUp size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Pending Amount</p>
          <h3 className="text-xl font-bold text-neutral-900">{formatCurrency(stats.totalPending)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><CreditCard size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Avg Invoice Value</p>
          <h3 className="text-xl font-bold text-neutral-900">{formatCurrency(stats.avgInvoiceValue)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><TrendingUp size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Collection Rate</p>
          <h3 className="text-xl font-bold text-neutral-900">{stats.collectionRate.toFixed(1)}%</h3>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <h3 className="font-bold text-neutral-900 mb-4">Daily Revenue Trend</h3>
          {dailyRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-neutral-500 text-sm text-center py-12">No revenue data for this period</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <h3 className="font-bold text-neutral-900 mb-4">Revenue by Service</h3>
          {serviceBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={serviceBreakdown} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {serviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-neutral-500 text-sm text-center py-12">No service data</p>
          )}
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <h3 className="font-bold text-neutral-900 mb-4">Payment Method Breakdown</h3>
        {paymentMethodBreakdown.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={paymentMethodBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {paymentMethodBreakdown.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-sm font-medium text-neutral-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-neutral-900">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-neutral-500 text-sm text-center py-8">No payment data</p>
        )}
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100">
          <h3 className="font-bold text-neutral-900">Invoice Summary</h3>
          <p className="text-sm text-neutral-500">{invoices.length} invoices in selected period</p>
        </div>
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Invoice</th>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Patient</th>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {invoices.slice(0, 20).map((inv) => (
              <tr key={inv._id} className="hover:bg-neutral-50/50">
                <td className="px-6 py-3 font-mono text-xs">{inv._id?.slice(-8).toUpperCase()}</td>
                <td className="px-6 py-3 text-sm">
                  {inv.patientId ? `${inv.patientId.firstName} ${inv.patientId.lastName}` : '-'}
                </td>
                <td className="px-6 py-3 font-bold text-sm">{formatCurrency(inv.total)}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                    inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>{inv.status}</span>
                </td>
                <td className="px-6 py-3 text-sm text-neutral-600">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
