import { useState, useMemo } from 'react';
import {
  DollarSign, FileText, ArrowUpRight, ArrowDownRight, CreditCard,
  Search, Filter, Download, Eye, Edit2, Trash2, X, Plus, Send,
  TrendingUp, Clock, AlertCircle, CheckCircle, Wallet,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { invoicesAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const COLORS = ['#059669', '#F59E0B', '#EF4444', '#6B7280'];

export default function AdminBillingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin_invoices', search, statusFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = await invoicesAPI.getAll(params);
      return data.data || { invoices: [], pagination: {} };
    },
  });

  const { data: paymentHistory } = useQuery({
    queryKey: ['admin_payments'],
    queryFn: async () => {
      const { data } = await invoicesAPI.getPaymentHistory({ limit: 100 });
      return data.data?.payments || [];
    },
  });

  const invoices = data?.invoices || [];
  const pagination = data?.pagination || {};

  const deleteMutation = useMutation({
    mutationFn: (id) => invoicesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin_invoices']);
    },
  });

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    let thisMonth = 0;
    let lastMonth = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const lastMonthNum = currentMonth === 0 ? 11 : currentMonth - 1;

    invoices.forEach((inv) => {
      const amount = inv.total || 0;
      const invMonth = new Date(inv.createdAt).getMonth();

      if (inv.status === 'PAID') {
        totalRevenue += amount;
        if (invMonth === currentMonth) thisMonth += amount;
        if (invMonth === lastMonthNum) lastMonth += amount;
      } else if (inv.status === 'OVERDUE') {
        overdueAmount += amount;
      } else if (inv.status === 'PENDING') {
        pendingAmount += amount;
      }
    });

    const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    return { totalRevenue, pendingAmount, overdueAmount, thisMonth, lastMonth, growth };
  }, [invoices]);

  const revenueChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, index) => {
      const monthInvoices = invoices.filter(
        (inv) => inv.status === 'PAID' && new Date(inv.createdAt).getMonth() === index
      );
      return {
        name: month,
        revenue: monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
      };
    });
    return monthlyData;
  }, [invoices]);

  const paymentMethodData = useMemo(() => {
    const methods = {};
    (paymentHistory || []).forEach((p) => {
      const method = p.method || 'MANUAL';
      methods[method] = (methods[method] || 0) + (p.amount || 0);
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [paymentHistory]);

  const statusDistribution = useMemo(() => {
    const statusCount = {};
    invoices.forEach((inv) => {
      const status = inv.status || 'PENDING';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownloadPDF = async (invoiceId) => {
    try {
      const { data } = await invoicesAPI.downloadInvoicePDF(invoiceId);
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId.slice(-8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download failed:', error);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Invoice ID', 'Patient', 'Amount', 'Status', 'Date', 'Due Date'];
    const rows = invoices.map((inv) => [
      inv._id?.slice(-8).toUpperCase(),
      inv.patientId ? `${inv.patientId.firstName} ${inv.patientId.lastName}` : '-',
      inv.total || 0,
      inv.status,
      formatDate(inv.createdAt),
      formatDate(inv.dueDate),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Billing & Invoices</h1>
          <p className="text-neutral-500 text-sm">Manage clinic revenue and patient billing</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 transition-colors text-sm font-medium"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Total Revenue</p>
          <h3 className="text-lg font-bold text-neutral-900">{formatCurrency(stats.totalRevenue)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><Clock size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Pending</p>
          <h3 className="text-lg font-bold text-neutral-900">{formatCurrency(stats.pendingAmount)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Overdue</p>
          <h3 className="text-lg font-bold text-neutral-900">{formatCurrency(stats.overdueAmount)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">This Month</p>
          <h3 className="text-lg font-bold text-neutral-900">{formatCurrency(stats.thisMonth)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><DollarSign size={18} /></div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Last Month</p>
          <h3 className="text-lg font-bold text-neutral-900">{formatCurrency(stats.lastMonth)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${stats.growth >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {stats.growth >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </div>
          </div>
          <p className="text-xs font-medium text-neutral-500">Growth</p>
          <h3 className={`text-lg font-bold ${stats.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
          </h3>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <h3 className="font-bold text-neutral-900 mb-4">Revenue Trend (Monthly)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <h3 className="font-bold text-neutral-900 mb-4">Payment Methods</h3>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentMethodData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-neutral-500 text-sm text-center py-8">No payment data yet</p>
          )}
        </div>
      </div>

      {/* Invoice Status Distribution */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <h3 className="font-bold text-neutral-900 mb-4">Invoice Status Distribution</h3>
        <div className="flex flex-wrap gap-4">
          {statusDistribution.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span className="text-sm text-neutral-600">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search by patient name or invoice ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Invoice ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Patient</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Amount</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                  <FileText className="mx-auto text-neutral-300 mb-3" size={40} />
                  <p className="font-medium">No invoices found</p>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-semibold text-primary-600">{inv._id?.slice(-8).toUpperCase()}</td>
                  <td className="px-6 py-4 font-medium">
                    {inv.patientId ? `${inv.patientId.firstName} ${inv.patientId.lastName}` : '-'}
                  </td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(inv.total)}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(inv.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownloadPDF(inv._id)}
                        className="p-1.5 text-neutral-400 hover:text-emerald-600 transition-colors"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => { setEditingInvoice(inv); setShowEditModal(true); }}
                        className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      {inv.status !== 'PAID' && (
                        <button
                          onClick={() => setShowRecordPaymentModal(inv)}
                          className="p-1.5 text-neutral-400 hover:text-emerald-600 transition-colors"
                          title="Record Payment"
                        >
                          <Wallet size={16} />
                        </button>
                      )}
                      {inv.status !== 'PAID' && (
                        <button
                          onClick={() => handleDelete(inv._id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Cancel"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Invoice Modal */}
      {showEditModal && editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          onClose={() => { setShowEditModal(false); setEditingInvoice(null); }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingInvoice(null);
            queryClient.invalidateQueries(['admin_invoices']);
          }}
        />
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && (
        <RecordPaymentModal
          invoice={showRecordPaymentModal}
          onClose={() => setShowRecordPaymentModal(null)}
          onSuccess={() => {
            setShowRecordPaymentModal(null);
            queryClient.invalidateQueries(['admin_invoices']);
          }}
        />
      )}
    </div>
  );
}

function EditInvoiceModal({ invoice, onClose, onSuccess }) {
  const [items, setItems] = useState(invoice.items || []);
  const [tax, setTax] = useState(invoice.tax || 0);
  const [dueDate, setDueDate] = useState(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');

  const subtotal = items.reduce((sum, item) => sum + (item.amount || (item.quantity || 1) * (item.rate || 0)), 0);
  const total = subtotal + tax;

  const handleUpdate = async () => {
    try {
      await invoicesAPI.update(invoice._id, { items, tax, total, dueDate });
      onSuccess();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = (newItems[index].quantity || 1) * (newItems[index].rate || 0);
    }
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-neutral-900">Edit Invoice</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-1 block">Items</label>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description || ''}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity || 1}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-16 px-3 py-2 border border-neutral-200 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Rate"
                  value={item.rate || 0}
                  onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-neutral-200 rounded-lg text-sm"
                />
                <button onClick={() => removeItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <X size={16} />
                </button>
              </div>
            ))}
            <button onClick={addItem} className="flex items-center gap-1 text-sm text-emerald-600 font-medium mt-2">
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-1 block">Tax (₹)</label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 mb-1 block">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Subtotal:</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Tax:</span>
              <span className="font-medium">₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-neutral-200 pt-2">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors font-medium">
            Cancel
          </button>
          <button onClick={handleUpdate} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordPaymentModal({ invoice, onClose, onSuccess }) {
  const [amount, setAmount] = useState(invoice.total || 0);
  const [method, setMethod] = useState('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const recordMutation = useMutation({
    mutationFn: (data) => invoicesAPI.processPayment(invoice._id, data),
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      onSuccess();
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to record payment'),
  });

  const handleSubmit = () => {
    if (!amount || amount <= 0) return toast.error('Amount must be greater than 0');
    recordMutation.mutate({
      amount,
      method,
      transactionId: transactionId || undefined,
      notes: notes || undefined,
      gateway: 'manual',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Record Payment</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Invoice #{invoice._id?.slice(-8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-neutral-50 rounded-xl">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Patient:</span>
              <span className="font-medium">
                {invoice.patientId ? `${invoice.patientId.firstName} ${invoice.patientId.lastName}` : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-neutral-600">Invoice Total:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NET_BANKING">Net Banking</option>
              <option value="WALLET">Wallet</option>
              <option value="CHEQUE">Cheque</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="ONLINE">Online Payment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">Transaction ID (optional)</label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g., TXN123456"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-neutral-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 font-medium">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={recordMutation.isPending}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50"
          >
            {recordMutation.isPending ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
