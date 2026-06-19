import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Edit2, Trash2, X as XIcon, FileCheck, Calendar, AlertCircle } from 'lucide-react';
import { insuranceAPI } from '../../api/generalAPI';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

const emptyForm = {
  provider: '',
  policyNumber: '',
  policyHolderName: '',
  relationship: 'Self',
  groupNumber: '',
  effectiveDate: '',
  expiryDate: '',
  coverageType: 'Individual',
  claimStatus: 'Active',
  notes: '',
};

export default function InsurancePage() {
  const queryClient = useQueryClient();
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['insurance'],
    queryFn: async () => {
      const { data } = await insuranceAPI.getAll();
      return data.data?.policies || data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => insuranceAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance'] });
      closeModal();
      toast.success('Insurance policy added');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add policy'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => insuranceAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance'] });
      closeModal();
      toast.success('Policy updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update policy'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => insuranceAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance'] });
      toast.success('Policy deleted');
    },
    onError: () => toast.error('Failed to delete policy'),
  });

  const closeModal = () => {
    setShowFormModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (policy) => {
    setForm({
      provider: policy.provider || '',
      policyNumber: policy.policyNumber || '',
      policyHolderName: policy.policyHolderName || '',
      relationship: policy.relationship || 'Self',
      groupNumber: policy.groupNumber || '',
      effectiveDate: policy.effectiveDate ? policy.effectiveDate.split('T')[0] : '',
      expiryDate: policy.expiryDate ? policy.expiryDate.split('T')[0] : '',
      coverageType: policy.coverageType || 'Individual',
      claimStatus: policy.claimStatus || 'Active',
      notes: policy.notes || '',
    });
    setEditingId(policy._id);
    setShowFormModal(true);
  };

  const handleSubmit = () => {
    if (!form.provider || !form.policyNumber || !form.policyHolderName) {
      toast.error('Provider, policy number, and holder name are required');
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this insurance policy?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Expired': return 'bg-red-50 text-red-700 border-red-200';
      case 'Pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Approved': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Insurance Policies</h1>
          <p className="text-neutral-500 mt-1">Manage your health insurance information.</p>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Add Policy
        </button>
      </div>

      {/* Policies List */}
      {policies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-12 text-center">
          <Shield className="mx-auto text-neutral-300 mb-3" size={48} />
          <p className="font-medium text-neutral-900">No insurance policies</p>
          <p className="text-sm text-neutral-400 mt-1 mb-4">Add your insurance information to streamline billing.</p>
          <button onClick={() => setShowFormModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> Add Your First Policy
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <div key={policy._id} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center shrink-0">
                    <Shield size={24} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-neutral-900">{policy.provider}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(policy.claimStatus)}`}>
                        {policy.claimStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                      <p className="text-neutral-500">Policy #: <span className="font-medium text-neutral-700">{policy.policyNumber}</span></p>
                      <p className="text-neutral-500">Holder: <span className="font-medium text-neutral-700">{policy.policyHolderName}</span></p>
                      <p className="text-neutral-500">Relationship: <span className="font-medium text-neutral-700">{policy.relationship}</span></p>
                      {policy.groupNumber && <p className="text-neutral-500">Group #: <span className="font-medium text-neutral-700">{policy.groupNumber}</span></p>}
                      <p className="text-neutral-500 flex items-center gap-1">
                        <Calendar size={12} /> {formatDate(policy.effectiveDate)} - {formatDate(policy.expiryDate)}
                      </p>
                      <p className="text-neutral-500">Coverage: <span className="font-medium text-neutral-700">{policy.coverageType}</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleEdit(policy)} className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(policy._id)} className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-900">{editingId ? 'Edit Policy' : 'Add Insurance Policy'}</h3>
              <button onClick={closeModal} className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Insurance Provider *</label>
                  <input
                    type="text"
                    value={form.provider}
                    onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
                    placeholder="e.g., Blue Cross Blue Shield"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Policy Number *</label>
                  <input
                    type="text"
                    value={form.policyNumber}
                    onChange={(e) => setForm((p) => ({ ...p, policyNumber: e.target.value }))}
                    placeholder="Policy number"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Policy Holder Name *</label>
                  <input
                    type="text"
                    value={form.policyHolderName}
                    onChange={(e) => setForm((p) => ({ ...p, policyHolderName: e.target.value }))}
                    placeholder="Full name on policy"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Relationship</label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm((p) => ({ ...p, relationship: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    {['Self', 'Spouse', 'Child', 'Parent', 'Other'].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Group Number</label>
                  <input
                    type="text"
                    value={form.groupNumber}
                    onChange={(e) => setForm((p) => ({ ...p, groupNumber: e.target.value }))}
                    placeholder="Group number (optional)"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Coverage Type</label>
                  <select
                    value={form.coverageType}
                    onChange={(e) => setForm((p) => ({ ...p, coverageType: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  >
                    {['Individual', 'Family', 'Group'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => setForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Claim Status</label>
                <select
                  value={form.claimStatus}
                  onChange={(e) => setForm((p) => ({ ...p, claimStatus: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  {['Active', 'Expired', 'Pending', 'Approved', 'Rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional notes (optional)"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} className="flex-1 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FileCheck size={16} />
                  {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingId ? 'Update Policy' : 'Add Policy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
