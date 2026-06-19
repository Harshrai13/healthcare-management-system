import { useMemo, useState, useRef } from 'react';
import { FileText, Download, Eye, Search, Filter, Calendar, Activity, Pill, Upload, X as XIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsAPI, documentsAPI } from '../../api/medicalAPI';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function MedicalRecordsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [uploadForm, setUploadForm] = useState({ category: 'GENERAL' });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['medical_records'],
    queryFn: async () => {
      const { data } = await recordsAPI.getAll();
      return data.data?.records || data.data || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      const { data } = await documentsAPI.upload(formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({ category: 'GENERAL' });
      toast.success('Document uploaded successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    },
  });

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.doctorName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
      let matchesDate = true;
      if (dateFrom) {
        const recordDate = new Date(r.date || r.createdAt);
        matchesDate = matchesDate && recordDate >= new Date(dateFrom);
      }
      if (dateTo) {
        const recordDate = new Date(r.date || r.createdAt);
        matchesDate = matchesDate && recordDate <= new Date(dateTo + 'T23:59:59');
      }
      return matchesSearch && matchesType && matchesDate;
    });
  }, [records, searchTerm, typeFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = records.length;
    const labResults = records.filter((r) => r.type === 'Lab Report').length;
    const prescriptions = records.filter((r) => r.type === 'Prescription' || r.type === 'Vaccination').length;
    return { total, labResults, prescriptions };
  }, [records]);

  const recordTypes = useMemo(() => {
    const types = new Set(records.map((r) => r.type).filter(Boolean));
    return ['ALL', ...Array.from(types)];
  }, [records]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', uploadForm.category);
    uploadMutation.mutate(formData);
  };

  const handleDownloadAll = () => {
    const recordsWithFiles = filteredRecords.filter((r) => r.fileUrl);
    if (recordsWithFiles.length === 0) {
      toast.error('No downloadable records found');
      return;
    }
    recordsWithFiles.forEach((record) => {
      const link = document.createElement('a');
      link.href = record.fileUrl;
      link.target = '_blank';
      link.download = record.name || record.fileName || 'record';
      link.click();
    });
    toast.success(`Downloading ${recordsWithFiles.length} record(s)`);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Medical Records</h1>
          <p className="text-neutral-500 mt-1">View and download your health documents.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-xl hover:bg-neutral-50 transition-colors font-medium text-sm ${showFilterPanel ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-neutral-200 text-neutral-700'}`}
          >
            <Filter size={16} /> Filter
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Upload size={16} /> Upload
          </button>
          <button
            onClick={handleDownloadAll}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Download size={16} /> Download All
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-100 outline-none"
            />
          </div>
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 font-medium"
          >
            Clear Dates
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Total Records</p>
            <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Lab Results</p>
            <p className="text-2xl font-bold text-neutral-900">{stats.labResults}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Pill size={24} />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Prescriptions</p>
            <p className="text-2xl font-bold text-neutral-900">{stats.prescriptions}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, doctor, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-100 outline-none text-sm"
          >
            {recordTypes.map((type) => (
              <option key={type} value={type}>{type === 'ALL' ? 'All Types' : type}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-neutral-100 text-neutral-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Document Name</th>
                <th className="p-4 font-medium hidden sm:table-cell">Type</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium hidden md:table-cell">Provider</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-neutral-500">
                    <FileText className="mx-auto text-neutral-300 mb-3" size={40} />
                    <p className="font-medium">No records found.</p>
                    <p className="text-sm text-neutral-400 mt-1">Try adjusting your search or filter.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record._id || record.id} className="hover:bg-neutral-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">{record.name || record.diagnosis || 'Medical Record'}</p>
                          <p className="text-xs text-neutral-400 hidden sm:block mt-0.5">{record.fileType || 'PDF'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <span className="px-2.5 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
                        {record.type || 'General'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                        <Calendar size={14} className="text-neutral-400" />
                        {formatDate(record.date || record.createdAt)}
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <p className="text-sm font-medium text-neutral-700">{record.doctorName || record.provider || '-'}</p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View Document">
                          <Eye size={18} />
                        </button>
                        {record.fileUrl && (
                          <a href={record.fileUrl} target="_blank" rel="noreferrer" className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors" title="Download">
                            <Download size={18} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-900">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-100 outline-none"
                >
                  <option value="GENERAL">General</option>
                  <option value="LAB_REPORT">Lab Report</option>
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="IMAGING">Imaging / X-Ray</option>
                  <option value="VACCINATION">Vaccination Record</option>
                  <option value="INSURANCE">Insurance Document</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Select File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors"
                >
                  <Upload size={32} className="mx-auto text-neutral-400 mb-2" />
                  {selectedFile ? (
                    <p className="text-sm font-medium text-primary-600">{selectedFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-neutral-700">Click to select a file</p>
                      <p className="text-xs text-neutral-400 mt-1">PDF, JPG, PNG, DOC, DOCX (max 10MB)</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                  className="flex-1 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={uploadMutation.isPending || !selectedFile}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload size={16} />
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
