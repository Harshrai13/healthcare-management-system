import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save, Lock, Eye, EyeOff, User, Mail, Phone, GraduationCap, Languages, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userAPI } from '../../api/authAPI';
import { doctorsAPI } from '../../api/doctorsAPI';
import { useAuth } from '../../hooks/useAuth';

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '' });
  const [doctorData, setDoctorData] = useState({ bio: '', education: [], languages: [] });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const { data: profileData } = useQuery({
    queryKey: ['user_profile'],
    queryFn: userAPI.getProfile,
  });

  const { data: doctorProfileData } = useQuery({
    queryKey: ['doctor_profile'],
    queryFn: async () => {
      const { data } = await doctorsAPI.getProfile();
      return data?.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profileData?.data) {
      const p = profileData.data;
      setFormData({ firstName: p.firstName || '', lastName: p.lastName || '', phone: p.phone || '' });
    }
  }, [profileData]);

  useEffect(() => {
    if (doctorProfileData) {
      setDoctorData({
        bio: doctorProfileData.bio || '',
        education: doctorProfileData.education || [],
        languages: doctorProfileData.languages || [],
      });
    }
  }, [doctorProfileData]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { data } = await userAPI.updateProfile(formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profile'] });
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Update failed'),
  });

  const updateDoctorMutation = useMutation({
    mutationFn: async () => {
      const { data } = await doctorsAPI.updateProfile(doctorProfileData._id, doctorData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor_profile'] });
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Update failed'),
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (fd) => {
      const { data } = await userAPI.uploadAvatar(fd);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_profile'] });
      queryClient.invalidateQueries({ queryKey: ['admin_doctors'] });
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success('Photo updated');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Upload failed'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => userAPI.changePassword(data),
    onSuccess: () => {
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Password change failed'),
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSavePhoto = () => {
    if (!photoFile) return;
    const fd = new FormData();
    fd.append('avatar', photoFile);
    uploadPhotoMutation.mutate(fd);
  };

  const handleSaveAll = () => {
    updateProfileMutation.mutate();
    if (doctorProfileData) {
      updateDoctorMutation.mutate();
    }
  };

  const handleChangePassword = () => {
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast.error('Please fill all password fields');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    });
  };

  const handleEducationChange = (index, field, value) => {
    const updated = [...(doctorData.education || [])];
    updated[index] = { ...updated[index], [field]: value };
    setDoctorData({ ...doctorData, education: updated });
  };

  const addEducation = () => {
    setDoctorData({ ...doctorData, education: [...(doctorData.education || []), { degree: '', institution: '', year: '' }] });
  };

  const removeEducation = (index) => {
    const updated = doctorData.education.filter((_, i) => i !== index);
    setDoctorData({ ...doctorData, education: updated });
  };

  const avatar = photoPreview || profileData?.data?.avatar || '';
  const isSaving = updateProfileMutation.isPending || updateDoctorMutation.isPending;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/doctor/dashboard" className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-white rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">My Profile</h1>
            <p className="text-sm text-neutral-500">Manage your personal and professional information</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Photo Section */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">Profile Photo</h2>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center">
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-neutral-400" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera size={20} className="text-white" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
              </div>
              <div className="flex-1">
                {photoFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 truncate max-w-[200px]">{photoFile.name}</span>
                    <button onClick={handleSavePhoto} disabled={uploadPhotoMutation.isPending} className="text-xs text-primary-600 font-medium hover:text-primary-700">
                      {uploadPhotoMutation.isPending ? 'Uploading...' : 'Save'}
                    </button>
                    <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="text-xs text-neutral-400 hover:text-neutral-600">
                      Cancel
                    </button>
                  </div>
                )}
                {!photoFile && <p className="text-xs text-neutral-400">Hover over photo to change it</p>}
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">First Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="input-field pl-9" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Last Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="input-field pl-9" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type="email" value={profileData?.data?.email || ''} disabled className="input-field pl-9 bg-neutral-50 text-neutral-500 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field pl-9" />
                </div>
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200">
            <h2 className="text-sm font-semibold text-neutral-900 mb-4">Professional Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Bio</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-3 text-neutral-400" />
                  <textarea value={doctorData.bio} onChange={(e) => setDoctorData({ ...doctorData, bio: e.target.value })} rows={3} className="input-field pl-9 resize-none" placeholder="Tell patients about yourself..." />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-neutral-500">Education</label>
                  <button onClick={addEducation} className="text-xs text-primary-600 font-medium hover:text-primary-700">+ Add</button>
                </div>
                <div className="space-y-3">
                  {(doctorData.education || []).map((edu, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input type="text" placeholder="Degree" value={edu.degree} onChange={(e) => handleEducationChange(i, 'degree', e.target.value)} className="input-field text-sm" />
                        <input type="text" placeholder="Institution" value={edu.institution} onChange={(e) => handleEducationChange(i, 'institution', e.target.value)} className="input-field text-sm" />
                        <input type="text" placeholder="Year" value={edu.year} onChange={(e) => handleEducationChange(i, 'year', e.target.value)} className="input-field text-sm" />
                      </div>
                      <button onClick={() => removeEducation(i)} className="p-2 text-neutral-400 hover:text-red-500 transition-colors">
                        <XCircle size={16} />
                      </button>
                    </div>
                  ))}
                  {(!doctorData.education || doctorData.education.length === 0) && (
                    <p className="text-xs text-neutral-400">No education added yet</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">Languages</label>
                <div className="relative">
                  <Languages size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={doctorData.languages.join(', ')}
                    onChange={(e) => setDoctorData({ ...doctorData, languages: e.target.value.split(',').map((l) => l.trim()).filter(Boolean) })}
                    className="input-field pl-9"
                    placeholder="English, Hindi, Spanish..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button onClick={handleSaveAll} disabled={isSaving} className="btn-primary w-full justify-center">
            <Save size={18} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Change Password */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={16} className="text-neutral-500" />
              <h2 className="text-sm font-semibold text-neutral-900">Change Password</h2>
            </div>
            <div className="space-y-3 max-w-sm">
              <div className="relative">
                <input
                  type={showPassword.current ? 'text' : 'password'}
                  placeholder="Current password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword.new ? 'text' : 'password'}
                  placeholder="New password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword.confirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button onClick={handleChangePassword} disabled={changePasswordMutation.isPending} className="btn-primary w-full justify-center text-sm">
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
