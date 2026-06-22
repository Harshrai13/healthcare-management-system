import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Save, Bell, Shield, Globe, CreditCard, Layout, Upload, Phone, Mail, MapPin, Clock, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState('General');
  const [settings, setSettings] = useState({
    clinicName: 'VerdantCare Medical Center',
    tagline: 'Premium healthcare services combining expert medical care with compassionate patient experience.',
    supportEmail: 'support@verdantcare.com',
    infoEmail: 'info@verdantcare.com',
    appointmentsEmail: 'appointments@verdantcare.com',
    phone: '+1 (800) 123-4567',
    emergencyPhone: '+1 (800) 123-4568',
    address: '123 Healthcare Ave, Suite 100, South Carolina, SC 29601',
    weekdayHours: 'Mon-Fri: 9:00 AM - 6:00 PM',
    saturdayHours: 'Sat: 9:00 AM - 2:00 PM',
    sundayHours: 'Sun: Closed',
    footerAddress: '123 Healthcare Ave, Suite 100\nSouth Carolina, SC 29601',
    footerPhone: '+1 (800) 123-4567',
    footerEmail: 'info@verdantcare.com',
    footerWeekdayHours: 'Mon-Fri: 9am - 6pm',
    footerWeekendHours: 'Sat: 9am - 2pm',
    facebookUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    timezone: 'America/New_York',
    currency: 'USD',
    language: 'en',
    twoFactorEnabled: false,
    sessionTimeout: '30 minutes',
    ipWhitelist: false,
    paymentGateway: 'razorpay',
    invoiceDuePeriod: '14 days',
  });

  const fileInputRef = useRef(null);

  const { isLoading } = useQuery({
    queryKey: ['platform_settings'],
    queryFn: async () => {
      const { data } = await settingsAPI.get();
      return data.data;
    },
    onSuccess: (data) => {
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await settingsAPI.update(data);
      return response.data;
    },
    onSuccess: () => toast.success('Settings saved successfully'),
    onError: () => toast.error('Failed to save settings'),
  });

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const logoMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('logo', file);
      const { data } = await settingsAPI.uploadLogo(formData);
      return data;
    },
    onSuccess: (data) => {
      setSettings((prev) => ({ ...prev, logoUrl: data.data.logoUrl }));
      toast.success('Logo uploaded successfully');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to upload logo';
      toast.error(msg);
    },
  });

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only PNG or JPG images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    logoMutation.mutate(file);
    e.target.value = '';
  };

  const handleSave = () => {
    // Sync Contact fields to Footer fields if footer fields are empty or unchanged from defaults
    const dataToSave = { ...settings };
    if (!dataToSave.footerPhone || dataToSave.footerPhone === dataToSave.phone) {
      dataToSave.footerPhone = dataToSave.phone;
    }
    if (!dataToSave.footerEmail || dataToSave.footerEmail === dataToSave.infoEmail) {
      dataToSave.footerEmail = dataToSave.infoEmail;
    }
    if (!dataToSave.footerAddress || dataToSave.footerAddress.replace(/\n/g, ', ') === dataToSave.address) {
      dataToSave.footerAddress = dataToSave.address;
    }
    if (!dataToSave.footerWeekdayHours || dataToSave.footerWeekdayHours === dataToSave.weekdayHours) {
      dataToSave.footerWeekdayHours = dataToSave.weekdayHours;
    }
    if (!dataToSave.footerWeekendHours || dataToSave.footerWeekendHours === dataToSave.saturdayHours) {
      dataToSave.footerWeekendHours = dataToSave.saturdayHours;
    }
    saveMutation.mutate(dataToSave);
  };

  const sections = [
    { icon: Layout, label: 'General' },
    { icon: Phone, label: 'Contact' },
    { icon: Share2, label: 'Footer & Social' },
    { icon: Shield, label: 'Security' },
    { icon: Bell, label: 'Notifications' },
    { icon: Globe, label: 'Localization' },
    { icon: CreditCard, label: 'Payment Gateway' },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Platform Settings</h1>
        <p className="text-neutral-500 text-sm">Configure global application preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="space-y-2">
          {sections.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveSection(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                activeSection === item.label
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3 space-y-6">
          {activeSection === 'General' && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">General Settings</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Clinic Name</label>
                  <input
                    type="text"
                    value={settings.clinicName}
                    onChange={(e) => handleChange('clinicName', e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Tagline</label>
                  <textarea
                    value={settings.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    rows={2}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Support Email</label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => handleChange('supportEmail', e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                  />
                </div>
                <div className="pt-6">
                  <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Contact' && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Contact Information</h2>
              <p className="text-sm text-neutral-500 mb-6">This information appears on the Contact Us page.</p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Phone Number</label>
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Emergency Phone</label>
                    <input
                      type="text"
                      value={settings.emergencyPhone}
                      onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Info Email</label>
                    <input
                      type="email"
                      value={settings.infoEmail}
                      onChange={(e) => handleChange('infoEmail', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Appointments Email</label>
                    <input
                      type="email"
                      value={settings.appointmentsEmail}
                      onChange={(e) => handleChange('appointmentsEmail', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Weekday Hours</label>
                  <input
                    type="text"
                    value={settings.weekdayHours}
                    onChange={(e) => handleChange('weekdayHours', e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Saturday Hours</label>
                    <input
                      type="text"
                      value={settings.saturdayHours}
                      onChange={(e) => handleChange('saturdayHours', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Sunday Hours</label>
                    <input
                      type="text"
                      value={settings.sundayHours}
                      onChange={(e) => handleChange('sundayHours', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                </div>
                <div className="pt-6">
                  <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Footer & Social' && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Footer & Social Media</h2>
              <p className="text-sm text-neutral-500 mb-6">This information appears in the website footer.</p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Footer Address</label>
                  <textarea
                    value={settings.footerAddress}
                    onChange={(e) => handleChange('footerAddress', e.target.value)}
                    rows={2}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none resize-none"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Footer Phone</label>
                    <input
                      type="text"
                      value={settings.footerPhone}
                      onChange={(e) => handleChange('footerPhone', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Footer Email</label>
                    <input
                      type="email"
                      value={settings.footerEmail}
                      onChange={(e) => handleChange('footerEmail', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Weekday Hours (Footer)</label>
                    <input
                      type="text"
                      value={settings.footerWeekdayHours}
                      onChange={(e) => handleChange('footerWeekdayHours', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Weekend Hours (Footer)</label>
                    <input
                      type="text"
                      value={settings.footerWeekendHours}
                      onChange={(e) => handleChange('footerWeekendHours', e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                    />
                  </div>
                </div>
                <div className="border-t border-neutral-100 pt-6">
                  <h3 className="text-lg font-bold text-neutral-900 mb-4">Social Media Links</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Facebook URL</label>
                      <input
                        type="url"
                        value={settings.facebookUrl}
                        onChange={(e) => handleChange('facebookUrl', e.target.value)}
                        placeholder="https://facebook.com/..."
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Twitter URL</label>
                      <input
                        type="url"
                        value={settings.twitterUrl}
                        onChange={(e) => handleChange('twitterUrl', e.target.value)}
                        placeholder="https://twitter.com/..."
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Instagram URL</label>
                      <input
                        type="url"
                        value={settings.instagramUrl}
                        onChange={(e) => handleChange('instagramUrl', e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">LinkedIn URL</label>
                      <input
                        type="url"
                        value={settings.linkedinUrl}
                        onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                        placeholder="https://linkedin.com/..."
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-6">
                  <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Security' && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Security Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
                  <div>
                    <p className="font-medium text-neutral-900">Two-Factor Authentication</p>
                    <p className="text-sm text-neutral-500">Require 2FA for all admin accounts</p>
                  </div>
                  <button
                    onClick={() => handleChange('twoFactorEnabled', !settings.twoFactorEnabled)}
                    className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${settings.twoFactorEnabled ? 'bg-primary-600' : 'bg-neutral-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.twoFactorEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
                  <div>
                    <p className="font-medium text-neutral-900">Session Timeout</p>
                    <p className="text-sm text-neutral-500">Auto-logout after inactivity</p>
                  </div>
                  <select
                    value={settings.sessionTimeout}
                    onChange={(e) => handleChange('sessionTimeout', e.target.value)}
                    className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                  >
                    <option value="30 minutes">30 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="4 hours">4 hours</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
                  <div>
                    <p className="font-medium text-neutral-900">IP Whitelist</p>
                    <p className="text-sm text-neutral-500">Restrict admin access by IP</p>
                  </div>
                  <button
                    onClick={() => handleChange('ipWhitelist', !settings.ipWhitelist)}
                    className={`text-sm font-medium ${settings.ipWhitelist ? 'text-primary-600' : 'text-neutral-500'} hover:underline`}
                  >
                    {settings.ipWhitelist ? 'Enabled' : 'Configure'}
                  </button>
                </div>
                <div className="pt-4">
                  <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Notifications' && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Notification Preferences</h2>
              <div className="space-y-4">
                {['New appointments', 'Appointment cancellations', 'New patient registrations', 'Payment received', 'System alerts'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
                    <p className="font-medium text-neutral-900">{item}</p>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                        <input type="checkbox" defaultChecked className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" /> Email
                      </label>
                      <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                        <input type="checkbox" className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500" /> Push
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6">
                <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeSection === 'Localization' && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Localization</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Default Language</label>
                  <select value={settings.language} onChange={(e) => handleChange('language', e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Timezone</label>
                  <select value={settings.timezone} onChange={(e) => handleChange('timezone', e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none">
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="Asia/Kolkata">IST (India)</option>
                  </select>
                </div>
                <div className="pt-6">
                  <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'Payment Gateway' && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
              <h2 className="text-xl font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Payment Gateway</h2>
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <p className="text-sm font-medium text-emerald-800">Razorpay is configured and active</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Default Currency</label>
                  <select value={settings.currency} onChange={(e) => handleChange('currency', e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none">
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="USD">USD - US Dollar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Invoice Due Period</label>
                  <select value={settings.invoiceDuePeriod} onChange={(e) => handleChange('invoiceDuePeriod', e.target.value)} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-100 outline-none">
                    <option value="7 days">7 days</option>
                    <option value="14 days">14 days</option>
                    <option value="30 days">30 days</option>
                  </select>
                </div>
                <div className="pt-6">
                  <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Branding Section - always visible */}
          <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
            <h2 className="text-xl font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Branding</h2>
            <div className="flex items-center gap-6">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-24 h-24 rounded-2xl object-cover shadow-inner" />
              ) : (
                <div className="w-24 h-24 bg-primary-100 text-primary-700 rounded-2xl flex items-center justify-center font-black text-3xl shadow-inner">
                  V
                </div>
              )}
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoMutation.isPending}
                  className="btn-outline text-sm mb-2 flex items-center gap-2 disabled:opacity-50"
                >
                  <Upload size={16} /> {logoMutation.isPending ? 'Uploading...' : 'Upload New Logo'}
                </button>
                <p className="text-xs text-neutral-500">Recommended size: 512x512px. PNG or JPG.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
