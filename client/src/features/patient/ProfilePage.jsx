import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, Mail as MailIcon, Phone as PhoneIcon, MapPin as MapPinIcon, Edit2 as EditIcon, Shield as ShieldIcon, Save as SaveIcon, Camera as CameraIcon, X as XIcon, Lock as LockIcon, Eye as EyeIcon, EyeOff as EyeOffIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { userAPI } from '../../api/authAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ProfilePage() {
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);

  // Change Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // 2FA modal state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState('status'); // status | setup | verify | disable
  const [twoFAData, setTwoFAData] = useState({ qrCode: '', secret: '', token: '', password: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await userAPI.getProfile();
      return data.data?.user || data.data || user;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const { data } = await userAPI.updateProfile(updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      const response = await userAPI.changePassword(data);
      return response.data;
    },
    onSuccess: () => {
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to change password');
    },
  });

  const handleEdit = () => {
    setFormData({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
      gender: profile?.gender || '',
      emergencyContact: profile?.emergencyContact || { name: '', relationship: '', phone: '' },
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmergencyChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handlePreferenceToggle = (pref) => {
    const current = profile?.preferences || { emailNotifications: true, smsAlerts: true };
    updateMutation.mutate({
      preferences: { ...current, [pref]: !current[pref] },
    });
  };

  const setup2FAMutation = useMutation({
    mutationFn: () => userAPI.setupTwoFactor(),
    onSuccess: (res) => {
      setTwoFAData((prev) => ({ ...prev, qrCode: res.data.data.qrCode, secret: res.data.data.secret }));
      setTwoFAStep('verify');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to start 2FA setup'),
  });

  const verify2FAMutation = useMutation({
    mutationFn: (token) => userAPI.verifyTwoFactor(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setShow2FAModal(false);
      setTwoFAStep('status');
      toast.success('Two-factor authentication enabled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid verification code'),
  });

  const disable2FAMutation = useMutation({
    mutationFn: (password) => userAPI.disableTwoFactor(password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setShow2FAModal(false);
      setTwoFAStep('status');
      setTwoFAData({ qrCode: '', secret: '', token: '', password: '' });
      toast.success('Two-factor authentication disabled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to disable 2FA'),
  });

  const handleOpen2FA = () => {
    setTwoFAStep(profile?.twoFactorEnabled ? 'status' : 'status');
    setShow2FAModal(true);
  };

  const handleStart2FASetup = () => {
    setup2FAMutation.mutate();
  };

  if (isLoading) return <LoadingSpinner />;

  const fullName = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.name || profile.email || 'User'
    : 'User';
  const initials = fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const prefs = profile?.preferences || { emailNotifications: true, smsAlerts: true };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-display font-bold text-neutral-900">My Profile</h1>
        <p className="text-neutral-500 mt-1">Manage your personal information and security settings.</p>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-bold shadow-inner">
            {profile?.avatar ? (
              <img src={profile.avatar} alt={fullName} className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full border border-neutral-200 shadow-sm text-neutral-600 hover:text-primary-600 transition-colors">
            <CameraIcon size={16} />
          </button>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-neutral-900">{fullName}</h2>
          <p className="text-neutral-500 mt-1">{profile?.email || ''}</p>
          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
            <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <ShieldIcon size={12} /> Verified Account
            </span>
            {profile?.gender && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1">
                {profile.gender}{profile.dateOfBirth ? `, ${Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / 31557600000)} yrs` : ''}
              </span>
            )}
          </div>
        </div>
        {!isEditing ? (
          <button onClick={handleEdit} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm w-full md:w-auto justify-center">
            <EditIcon size={16} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors flex-1 md:flex-none justify-center">
              Cancel
            </button>
            <button onClick={handleSave} disabled={updateMutation.isPending} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm flex-1 md:flex-none justify-center disabled:opacity-50">
              <SaveIcon size={16} /> {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b border-neutral-100 pb-3">Contact Information</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={isEditing ? formData.firstName : profile?.firstName || ''}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={isEditing ? formData.lastName : profile?.lastName || ''}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
                  <div className="relative">
                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input type="email" value={profile?.email || ''} disabled className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm focus:outline-none disabled:opacity-70" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input
                      type="tel"
                      value={isEditing ? formData.phone : profile?.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Address</label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-3 text-neutral-400" size={16} />
                  <textarea
                    disabled={!isEditing}
                    rows={2}
                    value={isEditing ? formData.address : profile?.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-70"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b border-neutral-100 pb-3">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                <input
                  type="text"
                  value={isEditing ? formData.emergencyContact?.name : profile?.emergencyContact?.name || ''}
                  onChange={(e) => handleEmergencyChange('name', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Relationship</label>
                <input
                  type="text"
                  value={isEditing ? formData.emergencyContact?.relationship : profile?.emergencyContact?.relationship || ''}
                  onChange={(e) => handleEmergencyChange('relationship', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-70"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input
                    type="tel"
                    value={isEditing ? formData.emergencyContact?.phone : profile?.emergencyContact?.phone || ''}
                    onChange={(e) => handleEmergencyChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:opacity-70"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Security</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-primary-300 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <LockIcon size={18} className="text-neutral-500 group-hover:text-primary-600" />
                  <span className="font-medium text-neutral-700 group-hover:text-primary-700 text-sm">Change Password</span>
                </div>
              </button>
              <button
                onClick={handleOpen2FA}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-primary-300 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <ShieldIcon size={18} className="text-neutral-500 group-hover:text-primary-600" />
                  <span className="font-medium text-neutral-700 group-hover:text-primary-700 text-sm">Two-Factor Auth</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${profile?.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                  {profile?.twoFactorEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">Email Notifications</p>
                  <p className="text-xs text-neutral-500">Updates & alerts</p>
                </div>
                <button
                  onClick={() => handlePreferenceToggle('emailNotifications')}
                  className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${prefs.emailNotifications ? 'bg-primary-600' : 'bg-neutral-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${prefs.emailNotifications ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-900">SMS Alerts</p>
                  <p className="text-xs text-neutral-500">Appointment reminders</p>
                </div>
                <button
                  onClick={() => handlePreferenceToggle('smsAlerts')}
                  className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${prefs.smsAlerts ? 'bg-primary-600' : 'bg-neutral-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${prefs.smsAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-900">Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2.5 pr-10 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showCurrentPw ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 pr-10 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showNewPw ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                  className="flex-1 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <LockIcon size={16} />
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShow2FAModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-900">Two-Factor Authentication</h3>
              <button onClick={() => setShow2FAModal(false)} className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg">
                <XIcon size={20} />
              </button>
            </div>

            {twoFAStep === 'status' && (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600">
                  {profile?.twoFactorEnabled
                    ? 'Two-factor authentication is currently enabled on your account.'
                    : 'Add an extra layer of security by requiring a code from your authenticator app at login.'}
                </p>
                {profile?.twoFactorEnabled ? (
                  <button
                    onClick={() => setTwoFAStep('disable')}
                    className="w-full py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium hover:bg-red-100"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <button
                    onClick={handleStart2FASetup}
                    disabled={setup2FAMutation.isPending}
                    className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    {setup2FAMutation.isPending ? 'Setting up...' : 'Enable 2FA'}
                  </button>
                )}
              </div>
            )}

            {(twoFAStep === 'setup' || twoFAStep === 'verify') && twoFAData.qrCode && (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600">Scan this QR code with Google Authenticator or a similar app:</p>
                <img src={twoFAData.qrCode} alt="2FA QR Code" className="mx-auto w-48 h-48 border rounded-xl" />
                <p className="text-xs text-neutral-500 text-center break-all">Manual key: {twoFAData.secret}</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={twoFAData.token}
                  onChange={(e) => setTwoFAData((prev) => ({ ...prev, token: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-center tracking-widest"
                />
                <button
                  onClick={() => verify2FAMutation.mutate(twoFAData.token)}
                  disabled={verify2FAMutation.isPending || twoFAData.token.length !== 6}
                  className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {verify2FAMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            )}

            {twoFAStep === 'disable' && (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600">Enter your password to disable two-factor authentication.</p>
                <input
                  type="password"
                  placeholder="Your password"
                  value={twoFAData.password}
                  onChange={(e) => setTwoFAData((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                />
                <button
                  onClick={() => disable2FAMutation.mutate(twoFAData.password)}
                  disabled={disable2FAMutation.isPending || !twoFAData.password}
                  className="w-full py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {disable2FAMutation.isPending ? 'Disabling...' : 'Confirm Disable'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
