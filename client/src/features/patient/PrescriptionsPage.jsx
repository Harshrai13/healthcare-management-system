import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Clock, RefreshCw, CheckCircle, AlertCircle, FileText, Info, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { prescriptionsAPI } from '../../api/medicalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PrescriptionsPage() {
  const navigate = useNavigate();
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: async () => {
      const { data } = await prescriptionsAPI.getAll();
      return data.data?.prescriptions || data.data || [];
    },
  });

  const { activePrescriptions, pastPrescriptions } = useMemo(() => {
    const active = prescriptions.filter(
      (rx) => rx.status === 'Active' || rx.status === 'active' || rx.status === 'Refill Needed'
    );
    const past = prescriptions.filter(
      (rx) => rx.status === 'Completed' || rx.status === 'completed' || rx.status === 'Inactive'
    );
    return { activePrescriptions: active, pastPrescriptions: past };
  }, [prescriptions]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">My Prescriptions</h1>
          <p className="text-neutral-500 mt-1">Manage your active medications and request refills.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Active Prescriptions */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Pill className="text-primary-600" size={20} /> Active Medications
              </h2>
              <span className="text-sm font-medium text-neutral-500">{activePrescriptions.length} active</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {activePrescriptions.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <Pill className="mx-auto text-neutral-300 mb-2" size={32} />
                  <p className="font-medium">No active prescriptions</p>
                </div>
              ) : (
                activePrescriptions.map((rx) => (
                  <div key={rx._id || rx.id} className="p-5 hover:bg-neutral-50 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-neutral-900">
                            {rx.medication || rx.name} <span className="text-sm font-medium text-neutral-500 ml-1">{rx.dosage}</span>
                          </h3>
                          {rx.status === 'Refill Needed' ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
                              <AlertCircle size={12} /> Refill Needed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                              <CheckCircle size={12} /> Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 flex items-center gap-1.5">
                          <Clock size={14} className="text-neutral-400" /> {rx.frequency || rx.instructions}
                        </p>
                        <p className="text-xs text-neutral-500 mt-2">
                          Prescribed by {rx.doctorName || rx.prescribedBy || 'Doctor'} on {formatDate(rx.date || rx.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col justify-center items-end gap-2">
                        {rx.refillsLeft !== undefined && (
                          <p className="text-sm font-medium text-neutral-700">
                            Refills remaining: <span className={rx.refillsLeft === 0 ? 'text-red-600 font-bold' : 'text-neutral-900'}>{rx.refillsLeft}</span>
                          </p>
                        )}
                        <button className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors ${
                          rx.refillsLeft === 0
                            ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                            : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                        }`}>
                          <RefreshCw size={16} /> {rx.refillsLeft === 0 ? 'Request Refill' : 'Refill Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Past Prescriptions */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="text-neutral-500" size={20} /> Prescription History
              </h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {pastPrescriptions.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <FileText className="mx-auto text-neutral-300 mb-2" size={32} />
                  <p className="font-medium">No prescription history</p>
                </div>
              ) : (
                pastPrescriptions.map((rx) => (
                  <div key={rx._id || rx.id} className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="space-y-1 w-full">
                      <h3 className="text-md font-bold text-neutral-800">
                        {rx.medication || rx.name} <span className="text-sm font-medium text-neutral-500 ml-1">{rx.dosage}</span>
                      </h3>
                      <p className="text-sm text-neutral-600">{rx.frequency || rx.instructions}</p>
                      <p className="text-xs text-neutral-500">
                        Prescribed by {rx.doctorName || rx.prescribedBy || 'Doctor'} on {formatDate(rx.date || rx.createdAt)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-semibold rounded-full whitespace-nowrap">
                      Completed
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-primary-50 rounded-2xl p-5 border border-primary-100">
            <h3 className="font-bold text-primary-900 mb-2 flex items-center gap-2"><Info size={18} /> Pharmacy Info</h3>
            <p className="text-sm text-primary-800 font-medium mb-1">CVS Pharmacy #104</p>
            <p className="text-sm text-primary-700 mb-3">123 Main St, Anytown, CA 90210<br/>(555) 123-4567</p>
            <button className="w-full py-2 bg-white text-primary-700 font-medium text-sm rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors">
              Change Pharmacy
            </button>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
            <h3 className="font-bold text-neutral-900 mb-4">Medication Reminders</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Morning Meds</p>
                    <p className="text-xs text-neutral-500">8:00 AM</p>
                  </div>
                </div>
                <div className="w-10 h-6 bg-primary-600 rounded-full flex items-center p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-sm"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Bedtime Meds</p>
                    <p className="text-xs text-neutral-500">10:00 PM</p>
                  </div>
                </div>
                <div className="w-10 h-6 bg-primary-600 rounded-full flex items-center p-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-4 shadow-sm"></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 text-sm text-primary-600 font-medium hover:underline text-center">
              + Add Reminder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
