import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Star, MoreVertical, CheckCircle, XCircle, Clock, Upload, X, Eye, Copy, Key, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { doctorsAPI, servicesAPI } from '../../api/doctorsAPI';
import { adminAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminDoctorsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', specialty: '', experience: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [viewCredDoctor, setViewCredDoctor] = useState(null);
  const [deleteDoctor, setDeleteDoctor] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['admin_doctors'],
    queryFn: async () => {
      const { data } = await adminAPI.getUsers({ role: 'DOCTOR' });
      const users = data.data?.users || data.data || [];
      return users.length > 0 ? users : (async () => {
        const res = await doctorsAPI.getAll({ include: 'all' });
        return res.data.data?.doctors || res.data.data || [];
      })();
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await servicesAPI.getAll();
      return data.data || [];
    },
  });

  const { data: credData, isLoading: credLoading } = useQuery({
    queryKey: ['doctorCredentials', viewCredDoctor],
    queryFn: async () => {
      const { data } = await adminAPI.getDoctorCredentials(viewCredDoctor);
      return data.data;
    },
    enabled: !!viewCredDoctor,
  });

  const stats = useMemo(() => {
    const total = doctors.length;
    const active = doctors.filter((d) => d.isActive === true || d.isAvailable === true).length;
    const pending = doctors.filter((d) => d.isActive === false && !d.isVerified).length;
    const avgRating = doctors.reduce((sum, d) => sum + (d.rating || 0), 0) / (total || 1);
    return { total, active, pending, avgRating: avgRating.toFixed(1) };
  }, [doctors]);

  const addDoctorMutation = useMutation({
    mutationFn: async (newDoctor) => {
      const fd = new FormData();
      fd.append('firstName', newDoctor.firstName);
      fd.append('lastName', newDoctor.lastName);
      fd.append('email', newDoctor.email);
      fd.append('specialty', newDoctor.specialty);
      fd.append('experience', newDoctor.experience);
      if (newDoctor.photo) {
        fd.append('photo', newDoctor.photo);
      }
      const { data } = await adminAPI.createDoctor(fd);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin_doctors'] });
      setIsModalOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', specialty: '', experience: '' });
      setPhotoFile(null);
      setPhotoPreview(null);
      const pwd = data?.data?.tempPassword || data?.data?.password;
      if (pwd) {
        setCredentials({
          email: data?.data?.user?.email || formData.email,
          password: pwd,
          name: `${data?.data?.user?.firstName || formData.firstName} ${data?.data?.user?.lastName || formData.lastName}`.trim(),
        });
      } else {
        toast.success('Doctor added successfully');
      }
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to add doctor';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doctorId) => {
      const { data } = await adminAPI.deleteDoctor(doctorId);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin_doctors'] });
      setDeleteDoctor(null);
      toast.success(data?.message || 'Doctor deleted successfully');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to delete doctor';
      toast.error(msg);
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const getInitials = (name) => {
    return (name || 'DR').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Doctors Management</h1>
          <p className="text-neutral-500 text-sm">Manage doctor profiles and approvals</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add New Doctor
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
          <p className="text-neutral-500 text-sm font-medium mb-1">Total Doctors</p>
          <h3 className="text-2xl font-bold text-neutral-900">{stats.total}</h3>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
          <p className="text-neutral-500 text-sm font-medium mb-1">Active Now</p>
          <h3 className="text-2xl font-bold text-emerald-600">{stats.active}</h3>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
          <p className="text-neutral-500 text-sm font-medium mb-1">Pending Approval</p>
          <h3 className="text-2xl font-bold text-yellow-600">{stats.pending}</h3>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
          <p className="text-neutral-500 text-sm font-medium mb-1">Average Rating</p>
          <h3 className="text-2xl font-bold text-primary-600 flex items-center gap-2">{stats.avgRating} <Star className="fill-primary-500 text-primary-500" size={18} /></h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.length === 0 ? (
          <div className="col-span-full text-center py-12 text-neutral-500 bg-white rounded-2xl border border-neutral-100">
            <p className="font-medium">No doctors found</p>
          </div>
        ) : (
          doctors.map((doc) => {
            const docName = doc.name || `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || 'Doctor';
            return (
              <div key={doc._id || doc.id} className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm hover:-translate-y-1 transition-transform duration-300">
                <div className="flex justify-between items-start mb-4">
                  {doc.avatar ? (
                    <img src={doc.avatar} alt={docName} className="w-16 h-16 rounded-full object-cover border-2 border-primary-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold">
                      {getInitials(docName)}
                    </div>
                  )}
                  <div className="relative">
                    <button
                      className="p-1.5 text-neutral-400 hover:bg-neutral-50 rounded-lg"
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === (doc._id || doc.id) ? null : (doc._id || doc.id)); }}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {openMenuId === (doc._id || doc.id) && (
                      <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 z-30">
                        <a
                          href={`/doctors/${doc._id || doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <Eye size={16} /> View Profile
                        </a>
                        <button
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors w-full text-left"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setViewCredDoctor(doc._id || doc.id); }}
                        >
                          <Key size={16} /> View Credentials
                        </button>
                        <button
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setDeleteDoctor(doc); }}
                        >
                          <Trash2 size={16} /> Delete Doctor
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-neutral-900">{docName}</h3>
                <span className="inline-block mt-1 mb-4 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md">
                  {doc.specialty || 'General'}
                </span>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Experience</span>
                    <span className="font-semibold text-neutral-900">{doc.experience || 0} Years</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Patients</span>
                    <span className="font-semibold text-neutral-900">{(doc.patients || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Rating</span>
                    <span className="font-semibold text-neutral-900 flex items-center gap-1">
                      <Star size={14} className="fill-yellow-400 text-yellow-400" /> {doc.rating || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                  {doc.isActive === true ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle size={14} /> Active</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-600"><XCircle size={14} /> Inactive</span>
                  )}
                  <a href={`/doctors/${doc._id || doc.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary-600 hover:text-primary-700">View Profile</a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 relative shadow-2xl">
            <button onClick={() => { setIsModalOpen(false); setPhotoFile(null); setPhotoPreview(null); }} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-700">
              <XCircle size={24} />
            </button>
            <h2 className="text-2xl font-bold text-neutral-900 mb-6">Add New Doctor</h2>

            {/* Photo Upload */}
            <div className="flex items-center gap-6 mb-6">
              <div className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0 border-2 border-dashed border-neutral-300">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload size={28} className="text-neutral-400" />
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Doctor Photo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPhotoFile(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-outline text-sm py-2"
                  >
                    {photoFile ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {photoFile && (
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="px-3 py-2 text-sm text-neutral-500 hover:text-red-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-1">JPG, PNG or WebP. Max 10MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">First Name</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full rounded-xl border-neutral-200 bg-neutral-50 p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Last Name</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full rounded-xl border-neutral-200 bg-neutral-50 p-3" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full rounded-xl border-neutral-200 bg-neutral-50 p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Specialty</label>
                <select value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} className="w-full rounded-xl border-neutral-200 bg-neutral-50 p-3">
                  <option value="">Select specialty</option>
                  {services.map((s) => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Experience (Years)</label>
                <input type="number" value={formData.experience} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} className="w-full rounded-xl border-neutral-200 bg-neutral-50 p-3" />
              </div>
            </div>
            <button
              className="btn-primary w-full justify-center"
              onClick={() => addDoctorMutation.mutate({ ...formData, photo: photoFile })}
              disabled={addDoctorMutation.isPending}
            >
              {addDoctorMutation.isPending ? 'Saving...' : 'Save Doctor'}
            </button>
          </div>
        </div>
      )}

      {/* Credentials Modal (after create) */}
      {credentials && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCredentials(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">Login Credentials</h3>
              <button onClick={() => setCredentials(null)} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-600">Doctor account created for <strong>{credentials.name}</strong>. Share these credentials securely.</p>
              <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-neutral-400 font-medium uppercase mb-1">Email (Login ID)</p>
                  <p className="text-sm font-semibold text-neutral-900">{credentials.email}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium uppercase mb-1">Password</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold text-neutral-900 bg-white px-3 py-1.5 rounded-lg border border-neutral-200 flex-1">{credentials.password}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(credentials.password); toast.success('Password copied'); }}
                      className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Copy password"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">Share these credentials with the doctor securely. They can change their password after logging in.</p>
              </div>
            </div>
            <div className="p-6 border-t border-neutral-100">
              <button onClick={() => setCredentials(null)} className="btn-primary w-full justify-center">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDoctor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteDoctor(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" /> Delete Doctor
              </h3>
              <button onClick={() => setDeleteDoctor(null)} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-600">
                Are you sure you want to delete <strong>Dr. {deleteDoctor.firstName || ''} {deleteDoctor.lastName || ''}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-700 font-medium">
                  This will permanently delete the doctor's account, profile, and all related records (appointments will be cancelled, consultations, prescriptions, reviews, and medical records will be removed). This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteDoctor(null)} className="btn-outline flex-1 justify-center">
                  Cancel
                </button>
                <button
                  className="flex-1 justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteDoctor._id || deleteDoctor.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Credentials Modal (from doctor card) */}
      {viewCredDoctor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewCredDoctor(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><Key size={20} className="text-primary-600" /> Doctor Credentials</h3>
              <button onClick={() => setViewCredDoctor(null)} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {credLoading ? (
                <div className="flex justify-center py-4"><LoadingSpinner /></div>
              ) : credData ? (
                <>
                  <p className="text-sm text-neutral-600">Login credentials for <strong>{credData.name}</strong>.</p>
                  <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-xs text-neutral-400 font-medium uppercase mb-1">Email (Login ID)</p>
                      <p className="text-sm font-semibold text-neutral-900">{credData.email}</p>
                    </div>
                    {credData.password ? (
                      <div>
                        <p className="text-xs text-neutral-400 font-medium uppercase mb-1">Password</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono font-semibold text-neutral-900 bg-white px-3 py-1.5 rounded-lg border border-neutral-200 flex-1">{credData.password}</p>
                          <button
                            onClick={() => { navigator.clipboard.writeText(credData.password); toast.success('Password copied'); }}
                            className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Copy password"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-700 mb-2">No stored password for this doctor. Click below to generate a new one.</p>
                        <button
                          onClick={async () => {
                            try {
                              const { data } = await adminAPI.resetDoctorPassword(viewCredDoctor);
                              // Directly update the cache with new credentials
                              queryClient.setQueryData(['doctorCredentials', viewCredDoctor], data.data);
                              toast.success('Password reset successfully');
                            } catch { toast.error('Failed to reset password'); }
                          }}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          <Key size={14} className="mr-1" /> Reset Password
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-red-500 text-center py-4">Failed to load credentials.</p>
              )}
            </div>
            <div className="p-6 border-t border-neutral-100">
              <button onClick={() => setViewCredDoctor(null)} className="btn-primary w-full justify-center">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
