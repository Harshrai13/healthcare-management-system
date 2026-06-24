import { useEffect, useState } from 'react';
import { Check, X, Send, Key, Globe, Mail, Power } from 'lucide-react';
import {
  getEmailSettings,
  updateEmailSettings,
  updateApiKey,
  verifyEmailConnection,
  checkEmailDomain,
  toggleEmailService,
  sendTestEmail,
} from '../../../api/communicationAPI';

export default function EmailProviderSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ senderName: '', senderEmail: '' });
  const [apiKey, setApiKey] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [checks, setChecks] = useState({ api: false, domain: false, test: false, active: false });

  async function load() {
    try {
      const res = await getEmailSettings();
      const data = res.data.data;
      setSettings(data);
      setForm({ senderName: data.senderName, senderEmail: data.senderEmail });
      setChecks({
        api: !!data.resendApiKey,
        domain: data.domainVerified,
        test: data.senderVerified,
        active: data.isEnabled,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveIdentity(e) {
    e.preventDefault();
    try {
      await updateEmailSettings(form);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function saveApiKey(e) {
    e.preventDefault();
    if (!apiKey) return;
    try {
      await updateApiKey({ resendApiKey: apiKey });
      setApiKey('');
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function verifyApi() {
    try {
      const res = await verifyEmailConnection();
      setChecks((c) => ({ ...c, api: res.data.success }));
      alert(res.data.success ? 'API key verified' : `Verification failed: ${res.data.data.error}`);
    } catch (err) {
      console.error(err);
    }
  }

  async function verifyDomain() {
    try {
      const res = await checkEmailDomain();
      setChecks((c) => ({ ...c, domain: res.data.success }));
      alert(res.data.success ? 'Domain verified' : `Domain check failed: ${res.data.data.error}`);
    } catch (err) {
      console.error(err);
    }
  }

  async function sendTest() {
    if (!testEmail) return;
    try {
      await sendTestEmail({ to: testEmail });
      setChecks((c) => ({ ...c, test: true }));
      alert('Test email sent');
    } catch (err) {
      console.error(err);
    }
  }

  async function toggle() {
    try {
      await toggleEmailService({ isEnabled: !settings.isEnabled });
      load();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const Step = ({ label, done }) => (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-neutral-200">
      <div className={`p-1 rounded-full ${done ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-400'}`}>
        {done ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      </div>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Email Provider Settings</h1>
      <p className="text-neutral-500 mb-6">Configure Resend as your email service provider.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Step label="API Key Connected" done={checks.api} />
        <Step label="Domain Verified" done={checks.domain} />
        <Step label="Test Email Successful" done={checks.test} />
        <Step label="Email Service Active" done={checks.active} />
      </div>

      <div className="bg-white p-6 rounded-lg border border-neutral-200 mb-6">
        <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Mail className="w-4 h-4" /> Sender Identity</h2>
        <form onSubmit={saveIdentity} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Sender Name"
            value={form.senderName}
            onChange={(e) => setForm({ ...form, senderName: e.target.value })}
            className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
          <input
            type="email"
            placeholder="Sender Email"
            value={form.senderEmail}
            onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
            className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
          <button type="submit" className="md:col-span-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800">Save Sender Identity</button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg border border-neutral-200 mb-6">
        <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Key className="w-4 h-4" /> Resend API Key</h2>
        <p className="text-sm text-neutral-500 mb-3">Stored API key: {settings.resendApiKey || 'Not configured'}</p>
        <form onSubmit={saveApiKey} className="flex gap-2">
          <input
            type="password"
            placeholder="re_xxxxxxxx"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
          <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800">Save Key</button>
        </form>
        <div className="flex gap-2 mt-3">
          <button onClick={verifyApi} className="px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50">Verify API Key</button>
          <button onClick={verifyDomain} className="px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 flex items-center gap-2"><Globe className="w-4 h-4" /> Check Domain</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-neutral-200 mb-6">
        <h2 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2"><Send className="w-4 h-4" /> Test & Activate</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="email"
            placeholder="Test email recipient"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
          <button onClick={sendTest} className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800">Send Test</button>
        </div>
        <button
          onClick={toggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${settings.isEnabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
        >
          <Power className="w-4 h-4" />
          {settings.isEnabled ? 'Deactivate Email Service' : 'Activate Email Service'}
        </button>
      </div>
    </div>
  );
}
