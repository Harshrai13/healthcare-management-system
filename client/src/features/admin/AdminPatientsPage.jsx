import { useMemo, useState } from 'react';
import { Search, Filter, MoreVertical } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminPatientsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['admin_patients'],
    queryFn: async () => {
      const { data } = await adminAPI.getUsers({ role: 'PATIENT' });
      return data.data?.users || data.data || [];
    },
  });

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.firstName || '').toLowerCase().includes(q) ||
      (p.lastName || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p._id || p.id || '').toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  if (isLoading) return <LoadingSpinner />;

  const getPatientName = (p) => {
    return p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Patient Management</h1>
          <p className="text-neutral-500 text-sm">View and manage all registered patients ({patients.length} total)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </div>
        <button className="btn-outline flex items-center gap-2">
          <Filter size={18} /> Filters
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Patient Info</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Contact</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Joined</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                  <Search className="mx-auto text-neutral-300 mb-3" size={40} />
                  <p className="font-medium">No patients found</p>
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => {
                const name = getPatientName(patient);
                return (
                  <tr key={patient._id || patient.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                          {name[0]?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{name}</p>
                          <p className="text-xs text-neutral-500">{(patient._id || patient.id || '').slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-neutral-900">{patient.email || '-'}</p>
                      <p className="text-xs text-neutral-500">{patient.phone || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">{formatDate(patient.createdAt || patient.joined)}</td>
                    <td className="px-6 py-4">
                      {(patient.status === 'ACTIVE' || patient.status === 'active' || !patient.status)
                        ? <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">Active</span>
                        : <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold">Inactive</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary-600 font-semibold text-sm mr-4 hover:text-primary-700">View</button>
                      <button className="text-neutral-400 hover:text-neutral-900"><MoreVertical size={20} /></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
