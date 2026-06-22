import { useMemo, useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Eye, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminPatientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['admin_patients'],
    queryFn: async () => {
      const { data } = await adminAPI.getUsers({ role: 'PATIENT' });
      return data.data?.users || data.data || [];
    },
  });

  const filteredPatients = useMemo(() => {
    let result = patients;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.firstName || '').toLowerCase().includes(q) ||
        (p.lastName || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p._id || p.id || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'ACTIVE') {
      result = result.filter((p) => p.isActive !== false);
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter((p) => p.isActive === false);
    }
    return result;
  }, [patients, searchQuery, statusFilter]);

  if (isLoading) return <LoadingSpinner />;

  const getPatientName = (p) => {
    return p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Patient';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const activeFilters = statusFilter !== 'ALL';

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
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
            className={`btn-outline flex items-center gap-2 ${activeFilters ? 'ring-2 ring-primary-200' : ''}`}
          >
            <Filter size={18} /> Filters
            {activeFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
          </button>
          {showFilters && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 z-30">
              <p className="px-4 py-2 text-xs font-semibold text-neutral-400 uppercase">Status</p>
              {[
                { value: 'ALL', label: 'All Patients' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setStatusFilter(opt.value); setShowFilters(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors flex items-center justify-between ${statusFilter === opt.value ? 'text-primary-600 font-semibold' : 'text-neutral-700'}`}
                >
                  {opt.label}
                  {statusFilter === opt.value && <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />}
                </button>
              ))}
              {activeFilters && (
                <button
                  onClick={() => { setStatusFilter('ALL'); setShowFilters(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-neutral-100 flex items-center gap-2"
                >
                  <X size={14} /> Clear filter
                </button>
              )}
            </div>
          )}
        </div>
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
                      {(patient.isActive !== false)
                        ? <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold">Active</span>
                        : <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold">Inactive</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          className="text-neutral-400 hover:text-neutral-900 p-1"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === patient._id ? null : patient._id); }}
                        >
                          <MoreVertical size={20} />
                        </button>
                        {openMenuId === patient._id && (
                          <div className="absolute right-0 top-8 w-40 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 z-30">
                            <a
                              href={`/dashboard`}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <Eye size={16} /> View Dashboard
                            </a>
                          </div>
                        )}
                      </div>
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
