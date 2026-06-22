import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, FileText, Calendar, ArrowLeft } from 'lucide-react';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

function PatientsListPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor_patients', user?._id || user?.id],
    queryFn: async () => {
      const { data } = await appointmentsAPI.getAll({ doctor: user?._id || user?.id });
      return data.data?.appointments || data.data || [];
    },
  });

  const patients = useMemo(() => {
    const patientMap = new Map();
    appointments.forEach((apt) => {
      const patientId = typeof apt.patient === 'object' ? apt.patient._id || apt.patient.id : apt.patient || apt.patientId;
      const patientName = typeof apt.patient === 'object' ? apt.patient.name || `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim() : apt.patientName || 'Unknown Patient';
      const patientEmail = typeof apt.patient === 'object' ? apt.patient.email : apt.patientEmail || '';
      const patientPhone = typeof apt.patient === 'object' ? apt.patient.phone : apt.patientPhone || '';

      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          id: patientId,
          name: patientName,
          email: patientEmail,
          phone: patientPhone,
          visits: 0,
          lastVisit: null,
          conditions: new Set(),
        });
      }
      const p = patientMap.get(patientId);
      p.visits++;
      const aptDate = new Date(apt.date || apt.appointmentDate || apt.createdAt);
      if (!p.lastVisit || aptDate > new Date(p.lastVisit)) {
        p.lastVisit = aptDate.toISOString();
      }
      if (apt.service) {
        const serviceName = typeof apt.service === 'object' ? apt.service.name : apt.service;
        p.conditions.add(serviceName);
      }
    });
    return Array.from(patientMap.values()).map((p) => ({
      ...p,
      condition: Array.from(p.conditions).join(', ') || 'General',
      lastVisit: p.lastVisit
        ? new Date(p.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-',
    }));
  }, [appointments]);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.condition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-900">My Patients</h1>
            <p className="text-neutral-500 mt-1">{patients.length} patients assigned to you</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search patients by name, email, or condition..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="text-left py-3 px-5 text-sm font-medium text-neutral-600">Patient</th>
              <th className="text-left py-3 px-5 text-sm font-medium text-neutral-600 hidden md:table-cell">Contact</th>
              <th className="text-left py-3 px-5 text-sm font-medium text-neutral-600 hidden sm:table-cell">Last Visit</th>
              <th className="text-left py-3 px-5 text-sm font-medium text-neutral-600">Condition</th>
              <th className="text-right py-3 px-5 text-sm font-medium text-neutral-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-neutral-500">
                  <Search size={40} className="mx-auto mb-3 text-neutral-300" />
                  <p className="font-medium">No patients found</p>
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => (
                <tr key={patient.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold text-sm">{patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{patient.name}</p>
                        <p className="text-xs text-neutral-500">{patient.visits} visit{patient.visits !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 hidden md:table-cell">
                    <p className="text-sm text-neutral-600">{patient.email || '-'}</p>
                    <p className="text-xs text-neutral-500">{patient.phone || '-'}</p>
                  </td>
                  <td className="py-4 px-5 hidden sm:table-cell">
                    <p className="text-sm text-neutral-600">{patient.lastVisit}</p>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full line-clamp-1">{patient.condition}</span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => setSelectedPatient(patient)}
                      className="p-2 text-neutral-400 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-bold">{selectedPatient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
              </div>
              <div>
                <h3 className="font-display font-bold text-neutral-900">{selectedPatient.name}</h3>
                <p className="text-sm text-neutral-500">{selectedPatient.email || 'No email on file'}</p>
              </div>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-sm text-neutral-500">Phone</span>
                <span className="text-sm font-medium">{selectedPatient.phone || '-'}</span>
              </div>
              <div className="flex justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-sm text-neutral-500">Total Visits</span>
                <span className="text-sm font-medium">{selectedPatient.visits}</span>
              </div>
              <div className="flex justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-sm text-neutral-500">Last Visit</span>
                <span className="text-sm font-medium">{selectedPatient.lastVisit}</span>
              </div>
              <div className="flex justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-sm text-neutral-500">Conditions</span>
                <span className="text-sm font-medium text-right max-w-[180px] line-clamp-2">{selectedPatient.condition}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelectedPatient(null)} className="btn-outline flex-1">Close</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-2">
                <FileText size={16} /> View Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientsListPage;
