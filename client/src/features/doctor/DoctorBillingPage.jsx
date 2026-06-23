import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, FileText, CheckCircle, Clock, ArrowLeft, DollarSign, Pill, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesAPI } from '../../api/generalAPI';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

const formatDate = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

export default function DoctorBillingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['doctor_invoices'],
    queryFn: async () => {
      const { data } = await invoicesAPI.getDoctorInvoices({ limit: 50 });
      return data.data?.invoices || [];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['doctor_completed_appointments'],
    queryFn: async () => {
      const { data } = await appointmentsAPI.getAll({ status: 'COMPLETED', limit: 100 });
      return data.data?.appointments || [];
    },
  });

  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + (i.total || 0), 0);
  const totalPending = invoices.filter((i) => i.status === 'PENDING').reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold text-neutral-900">Billing & Invoices</h1>
          <p className="text-neutral-500 mt-1 text-sm">Create invoices for your patients and track payments.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Create Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><DollarSign size={18} /></div>
            <p className="text-xs font-medium text-neutral-500">Total Invoiced</p>
          </div>
          <h3 className="text-xl font-bold text-neutral-900">{formatCurrency(totalInvoiced)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle size={18} /></div>
            <p className="text-xs font-medium text-neutral-500">Paid</p>
          </div>
          <h3 className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Clock size={18} /></div>
            <p className="text-xs font-medium text-neutral-500">Pending</p>
          </div>
          <h3 className="text-xl font-bold text-orange-600">{formatCurrency(totalPending)}</h3>
        </div>
      </div>

      {/* Invoices list */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">My Invoices</h2>
          <span className="text-sm text-neutral-500">{invoices.length} total</span>
        </div>
        {isLoading ? (
          <LoadingSpinner />
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <FileText className="mx-auto text-neutral-300 mb-3" size={40} />
            <p className="font-medium">No invoices created yet</p>
            <p className="text-sm mt-1">Click "Create Invoice" to generate one for a completed appointment.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {invoices.map((inv) => (
              <div key={inv._id} className="p-5 hover:bg-neutral-50 transition-colors flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {inv.status === 'PAID' ? <CheckCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">
                      {inv.patientId ? `${inv.patientId.firstName} ${inv.patientId.lastName}` : 'Patient'}
                    </h3>
                    <p className="text-sm text-neutral-500 mt-0.5">
                      Invoice #{inv._id?.slice(-8).toUpperCase()} • {formatDate(inv.createdAt)}
                    </p>
                    {inv.items && inv.items.length > 0 && (
                      <p className="text-xs text-neutral-400 mt-1">
                        {inv.items.length} item{inv.items.length !== 1 ? 's' : ''}: {inv.items.slice(0, 2).map((i) => i.description).join(', ')}{inv.items.length > 2 ? '...' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                  <span className="text-lg font-bold text-neutral-900">{formatCurrency(inv.total)}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateInvoiceModal
          appointments={appointments}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries(['doctor_invoices']);
            toast.success('Invoice created successfully');
          }}
        />
      )}
    </div>
  );
}

function CreateInvoiceModal({ appointments, onClose, onSuccess }) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, rate: 0 }]);
  const [tax, setTax] = useState(0);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const selectedAppointment = appointments.find((a) => a._id === selectedAppointmentId);
  const subtotal = items.reduce((sum, item) => sum + ((item.quantity || 1) * (item.rate || 0)), 0);
  const total = subtotal + (tax || 0);

  const createMutation = useMutation({
    mutationFn: (data) => invoicesAPI.create(data),
    onSuccess: () => onSuccess(),
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to create invoice'),
  });

  const addItem = () => setItems([...items, { description: '', quantity: 1, rate: 0 }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  };

  const quickAdd = (type) => {
    const templates = {
      consultation: { description: 'Consultation Fee', quantity: 1, rate: 500 },
      medicine: { description: 'Medicines', quantity: 1, rate: 0 },
      test: { description: 'Diagnostic Test', quantity: 1, rate: 0 },
    };
    setItems([...items, templates[type]]);
  };

  const handleSubmit = () => {
    if (!selectedAppointmentId) return toast.error('Please select an appointment');
    if (items.some((i) => !i.description || !i.rate)) return toast.error('Please fill in all item details');
    if (subtotal <= 0) return toast.error('Total amount must be greater than 0');

    createMutation.mutate({
      patientId: selectedAppointment.patientId._id,
      appointmentId: selectedAppointmentId,
      items: items.map((i) => ({ ...i, amount: (i.quantity || 1) * (i.rate || 0) })),
      tax,
      dueDate,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900">Create New Invoice</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Appointment selection */}
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">Select Completed Appointment</label>
            <select
              value={selectedAppointmentId}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            >
              <option value="">-- Choose an appointment --</option>
              {appointments.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.patientId?.firstName} {a.patientId?.lastName} - {a.serviceId?.name || 'Service'} - {formatDate(a.date)}
                </option>
              ))}
            </select>
          </div>

          {/* Patient info */}
          {selectedAppointment && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
              <p className="text-sm text-emerald-800">
                <strong>Patient:</strong> {selectedAppointment.patientId?.firstName} {selectedAppointment.patientId?.lastName}
                {' • '}
                <strong>Email:</strong> {selectedAppointment.patientId?.email}
              </p>
            </div>
          )}

          {/* Quick add buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-neutral-700">Items</label>
              <div className="flex gap-2">
                <button onClick={() => quickAdd('consultation')} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">+ Consultation</button>
                <button onClick={() => quickAdd('medicine')} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 inline-flex items-center gap-1"><Pill size={12} /> Medicine</button>
                <button onClick={() => quickAdd('test')} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 inline-flex items-center gap-1"><FlaskConical size={12} /> Test</button>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Description (e.g., Paracetamol 500mg)"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Rate"
                    min="0"
                    value={item.rate}
                    onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-24 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <button onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="flex items-center gap-1 text-sm text-emerald-600 font-medium mt-2 hover:text-emerald-700">
              <Plus size={14} /> Add Item
            </button>
          </div>

          {/* Tax and due date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Tax (₹)</label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Tax:</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-neutral-200 pt-2">
              <span>Total:</span>
              <span className="text-emerald-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-neutral-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 font-medium">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
