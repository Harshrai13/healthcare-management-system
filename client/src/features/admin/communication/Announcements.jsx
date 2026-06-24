import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from '../../../api/communicationAPI';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'service',
    targetAudience: 'all',
    channels: { email: true, sms: false, inApp: true },
  });

  async function load() {
    try {
      const res = await getAnnouncements();
      setAnnouncements(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createAnnouncement(form);
      setShowForm(false);
      setForm({ title: '', message: '', type: 'service', targetAudience: 'all', channels: { email: true, sms: false, inApp: true } });
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return;
    try {
      await deleteAnnouncement(id);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Clinic Announcements</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800"
        >
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-neutral-200 mb-6 space-y-4">
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg"
            required
          />
          <textarea
            placeholder="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-4 py-2 border border-neutral-200 rounded-lg"
            >
              <option value="service">New Service</option>
              <option value="campaign">Health Campaign</option>
              <option value="holiday">Holiday Notice</option>
              <option value="emergency">Emergency Notice</option>
            </select>
            <select
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              className="px-4 py-2 border border-neutral-200 rounded-lg"
            >
              <option value="all">All Users</option>
              <option value="patients">Only Patients</option>
              <option value="doctors">Only Doctors</option>
            </select>
            <div className="flex items-center gap-4 px-4 py-2 border border-neutral-200 rounded-lg">
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.channels.email} onChange={(e) => setForm({ ...form, channels: { ...form.channels, email: e.target.checked } })} /> Email</label>
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.channels.sms} onChange={(e) => setForm({ ...form, channels: { ...form.channels, sms: e.target.checked } })} /> SMS</label>
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.channels.inApp} onChange={(e) => setForm({ ...form, channels: { ...form.channels, inApp: e.target.checked } })} /> In-App</label>
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800">Create & Send</button>
        </form>
      )}

      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a._id} className="bg-white p-6 rounded-lg border border-neutral-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-neutral-900">{a.title}</h3>
                <p className="text-neutral-600 mt-1">{a.message}</p>
                <div className="flex gap-2 mt-2 text-xs text-neutral-500">
                  <span className="px-2 py-0.5 bg-neutral-100 rounded">{a.type}</span>
                  <span className="px-2 py-0.5 bg-neutral-100 rounded">{a.targetAudience}</span>
                  <span>Sent: {a.sentAt ? new Date(a.sentAt).toLocaleString() : 'Pending'}</span>
                </div>
                {a.deliveryStatus && (
                  <div className="mt-2 text-xs text-neutral-500">
                    Email: {a.deliveryStatus.emailSent}/{a.deliveryStatus.emailFailed} failed ·
                    SMS: {a.deliveryStatus.smsSent}/{a.deliveryStatus.smsFailed} failed ·
                    In-App: {a.deliveryStatus.inAppCreated}
                  </div>
                )}
              </div>
              <button onClick={() => handleDelete(a._id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
