import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Search, ArrowLeft, UserCheck, Pill } from 'lucide-react';
import { prescriptionsAPI } from '../../api/medicalAPI';
import { adminAPI } from '../../api/generalAPI';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CreatePrescriptionPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '' }]);
  const [instructions, setInstructions] = useState('');

  // Search patients
  const { data: searchResults = [] } = useQuery({
    queryKey: ['patient_search', patientSearch],
    queryFn: async () => {
      if (patientSearch.length < 2) return [];
      const { data } = await adminAPI.getUsers({ search: patientSearch, role: 'PATIENT', limit: 5 });
      return data.data?.users || [];
    },
    enabled: patientSearch.length >= 2,
  });

  // Get patient's appointments
  const { data: patientAppointments = [] } = useQuery({
    queryKey: ['patient_appointments', selectedPatient?._id],
    queryFn: async () => {
      if (!selectedPatient) return [];
      const { data } = await appointmentsAPI.getAll({ patientId: selectedPatient._id, doctor: user?._id || user?.id });
      return data.data?.appointments || data.data || [];
    },
    enabled: !!selectedPatient,
  });

  const createMutation = useMutation({
    mutationFn: (data) => prescriptionsAPI.create(data),
    onSuccess: () => {
      toast.success('Prescription created successfully');
      navigate('/doctor/dashboard');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create prescription');
    },
  });

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch('');
    setSelectedAppointmentId('');
  };

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '' }]);
  };

  const handleRemoveMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index, field, value) => {
    setMedications(medications.map((med, i) => i === index ? { ...med, [field]: value } : med));
  };

  const handleSubmit = () => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    if (!selectedAppointmentId) {
      toast.error('Please select an appointment');
      return;
    }
    const validMeds = medications.filter((m) => m.name.trim());
    if (validMeds.length === 0) {
      toast.error('Please add at least one medication');
      return;
    }
    const medicationStrings = validMeds.map((m) =>
      [m.name, m.dosage, m.frequency].filter(Boolean).join(' - ')
    );
    createMutation.mutate({
      patientId: selectedPatient._id,
      appointmentId: selectedAppointmentId,
      medications: medicationStrings,
      instructions,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">New Prescription</h1>
          <p className="text-neutral-500 mt-1">Create a prescription for a patient.</p>
        </div>
      </div>

      {/* Step 1: Select Patient */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">1</span>
          Select Patient
        </h3>

        {selectedPatient ? (
          <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl border border-primary-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                {selectedPatient.firstName?.[0]}{selectedPatient.lastName?.[0]}
              </div>
              <div>
                <p className="font-medium text-neutral-900">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-sm text-neutral-500">{selectedPatient.email}</p>
              </div>
            </div>
            <button onClick={() => { setSelectedPatient(null); setSelectedAppointmentId(''); }} className="text-sm text-primary-600 font-medium hover:underline">
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search patient by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors flex items-center gap-3 border-b border-neutral-50 last:border-0"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">
                      {p.firstName?.[0]}{p.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-neutral-500">{p.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Select Appointment */}
      {selectedPatient && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">2</span>
            Select Appointment
          </h3>
          {patientAppointments.length === 0 ? (
            <p className="text-sm text-neutral-500">No appointments found for this patient.</p>
          ) : (
            <div className="space-y-2">
              {patientAppointments.map((apt) => (
                <button
                  key={apt._id}
                  onClick={() => setSelectedAppointmentId(apt._id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedAppointmentId === apt._id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-neutral-200 hover:border-primary-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {apt.service?.name || apt.serviceName || 'Consultation'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {new Date(apt.date || apt.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      apt.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Medications */}
      {selectedAppointmentId && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">3</span>
            Medications
          </h3>
          <div className="space-y-3">
            {medications.map((med, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={med.name}
                    onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                    placeholder="Medication name"
                    className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                    placeholder="Dosage (e.g., 500mg)"
                    className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <input
                    type="text"
                    value={med.frequency}
                    onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                    placeholder="Frequency (e.g., 2x/day)"
                    className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                {medications.length > 1 && (
                  <button onClick={() => handleRemoveMedication(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={handleAddMedication} className="flex items-center gap-2 text-sm text-primary-600 font-medium hover:text-primary-700">
              <Plus size={16} /> Add Medication
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Instructions */}
      {selectedAppointmentId && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            Instructions
          </h3>
          <textarea
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Additional instructions for the patient..."
            className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      )}

      {/* Submit */}
      {selectedAppointmentId && (
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="flex-1 px-6 py-3 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            {createMutation.isPending ? 'Creating...' : 'Create Prescription'}
          </button>
        </div>
      )}
    </div>
  );
}
