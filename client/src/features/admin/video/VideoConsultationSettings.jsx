import { useState, useEffect } from 'react';
import {
  Video, Save, Power, Server, Shield, Monitor, Clock, Bell,
  Mic, Camera, Radio, Plus, X, Check, AlertTriangle, Loader2,
} from 'lucide-react';
import { videoSettingsAPI } from '../../../api/videoSettingsAPI';
import toast from 'react-hot-toast';

export default function VideoConsultationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState({
    enabled: true,
    provider: 'webrtc',
    stunServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    turnServerUrl: '',
    turnUsername: '',
    turnPassword: '',
    allowScreenSharing: true,
    allowRecording: false,
    waitingRoom: true,
    consultationNotesEnabled: true,
    autoEndConsultation: false,
    maximumDuration: 60,
    reminderBeforeMinutes: 15,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: false,
    defaultVideoQuality: 'medium',
    startWithMutedMic: false,
    startWithMutedCamera: false,
  });

  async function load() {
    try {
      const res = await videoSettingsAPI.get();
      const data = res.data.data;
      setForm({
        enabled: data.enabled ?? true,
        provider: data.provider || 'webrtc',
        stunServers: data.stunServers?.length ? data.stunServers : [{ urls: '' }],
        turnServerUrl: data.turnServerUrl || '',
        turnUsername: data.turnUsername || '',
        turnPassword: data.turnPassword === '••••••••' ? '' : (data.turnPassword || ''),
        allowScreenSharing: data.allowScreenSharing ?? true,
        allowRecording: data.allowRecording ?? false,
        waitingRoom: data.waitingRoom ?? true,
        consultationNotesEnabled: data.consultationNotesEnabled ?? true,
        autoEndConsultation: data.autoEndConsultation ?? false,
        maximumDuration: data.maximumDuration || 60,
        reminderBeforeMinutes: data.reminderBeforeMinutes || 15,
        emailNotifications: data.emailNotifications ?? true,
        smsNotifications: data.smsNotifications ?? false,
        pushNotifications: data.pushNotifications ?? false,
        defaultVideoQuality: data.defaultVideoQuality || 'medium',
        startWithMutedMic: data.startWithMutedMic ?? false,
        startWithMutedCamera: data.startWithMutedCamera ?? false,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load video settings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...form };
      // Filter empty STUN servers
      payload.stunServers = form.stunServers.filter(s => s.urls?.trim());
      if (payload.stunServers.length === 0) payload.stunServers = [];
      await videoSettingsAPI.update(payload);
      toast.success('Video consultation settings saved');
      load(); // Reload to get masked values
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addStunServer = () => setForm(prev => ({ ...prev, stunServers: [...prev.stunServers, { urls: '' }] }));
  const removeStunServer = (i) => setForm(prev => ({ ...prev, stunServers: prev.stunServers.filter((_, idx) => idx !== i) }));
  const updateStunServer = (i, urls) => setForm(prev => ({ ...prev, stunServers: prev.stunServers.map((s, idx) => idx === i ? { urls } : s) }));

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto mb-2" /> Loading video settings...</div>;

  const tabs = [
    { id: 'general', label: 'General', icon: Video },
    { id: 'ice', label: 'STUN / TURN', icon: Server },
    { id: 'features', label: 'Features', icon: Monitor },
    { id: 'timing', label: 'Timing', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'media', label: 'Media Defaults', icon: Mic },
  ];

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${value ? 'bg-emerald-500' : 'bg-neutral-300'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Video Consultation Settings</h1>
          <p className="text-neutral-500 text-sm">Configure the telehealth module — no code changes required.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${form.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
            {form.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Toggle value={form.enabled} onChange={(v) => update('enabled', v)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── General Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 space-y-6">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3">General Configuration</h2>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Video Provider</label>
            <select
              value={form.provider}
              onChange={(e) => update('provider', e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-100 outline-none"
            >
              <option value="webrtc">Built-in WebRTC (Default)</option>
              <option value="livekit" disabled>LiveKit (Coming Soon)</option>
              <option value="twilio" disabled>Twilio (Coming Soon)</option>
              <option value="agora" disabled>Agora (Coming Soon)</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">Switch between video providers. Only WebRTC is available now; others can be added later.</p>
          </div>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Waiting Room</p>
              <p className="text-sm text-neutral-500">Show device preview before joining the call</p>
            </div>
            <Toggle value={form.waitingRoom} onChange={(v) => update('waitingRoom', v)} />
          </div>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Consultation Notes</p>
              <p className="text-sm text-neutral-500">Allow doctors to add notes during/after consultation</p>
            </div>
            <Toggle value={form.consultationNotesEnabled} onChange={(v) => update('consultationNotesEnabled', v)} />
          </div>
        </div>
      )}

      {/* ── STUN/TURN Tab ───────────────────────────────────────────────── */}
      {activeTab === 'ice' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 space-y-6">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3">STUN / TURN Server Configuration</h2>
          <p className="text-sm text-neutral-500">Configure ICE servers for WebRTC NAT traversal. TURN servers are required for restrictive networks.</p>

          {/* STUN Servers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-neutral-700">STUN Servers</label>
              <button onClick={addStunServer} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                <Plus size={12} /> Add Server
              </button>
            </div>
            {form.stunServers.map((s, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={s.urls}
                  onChange={(e) => updateStunServer(i, e.target.value)}
                  placeholder="stun:stun.example.com:3478"
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <button onClick={() => removeStunServer(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* TURN Server */}
          <div className="border-t border-neutral-100 pt-4">
            <label className="text-sm font-semibold text-neutral-700 mb-3 block">TURN Server (Optional)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-neutral-600 mb-1 block">TURN Server URL</label>
                <input
                  type="text"
                  value={form.turnServerUrl}
                  onChange={(e) => update('turnServerUrl', e.target.value)}
                  placeholder="turn:turn.example.com:3478"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-600 mb-1 block">TURN Username</label>
                <input
                  type="text"
                  value={form.turnUsername}
                  onChange={(e) => update('turnUsername', e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-600 mb-1 block">TURN Password</label>
                <input
                  type="password"
                  value={form.turnPassword}
                  onChange={(e) => update('turnPassword', e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-neutral-400 mt-1">Leave blank to keep existing value</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Features Tab ────────────────────────────────────────────────── */}
      {activeTab === 'features' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3">Feature Toggles</h2>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Screen Sharing</p>
              <p className="text-sm text-neutral-500">Allow participants to share their screen</p>
            </div>
            <Toggle value={form.allowScreenSharing} onChange={(v) => update('allowScreenSharing', v)} />
          </div>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Recording</p>
              <p className="text-sm text-neutral-500">Allow consultation recording (requires provider support)</p>
            </div>
            <Toggle value={form.allowRecording} onChange={(v) => update('allowRecording', v)} />
          </div>
        </div>
      )}

      {/* ── Timing Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'timing' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 space-y-6">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3">Timing & Duration</h2>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Auto-End Consultation</p>
              <p className="text-sm text-neutral-500">Automatically end calls when max duration is reached</p>
            </div>
            <Toggle value={form.autoEndConsultation} onChange={(v) => update('autoEndConsultation', v)} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Maximum Duration (minutes)</label>
            <input
              type="number"
              value={form.maximumDuration}
              onChange={(e) => update('maximumDuration', parseInt(e.target.value, 10) || 60)}
              min={5}
              max={240}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Reminder Before Consultation (minutes)</label>
            <input
              type="number"
              value={form.reminderBeforeMinutes}
              onChange={(e) => update('reminderBeforeMinutes', parseInt(e.target.value, 10) || 15)}
              min={5}
              max={60}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-100 outline-none"
            />
          </div>
        </div>
      )}

      {/* ── Notifications Tab ───────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 space-y-4">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3">Notification Channels</h2>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Email Notifications</p>
              <p className="text-sm text-neutral-500">Send consultation reminders and summaries via email</p>
            </div>
            <Toggle value={form.emailNotifications} onChange={(v) => update('emailNotifications', v)} />
          </div>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">SMS Notifications</p>
              <p className="text-sm text-neutral-500">Send SMS reminders (requires Twilio configuration)</p>
            </div>
            <Toggle value={form.smsNotifications} onChange={(v) => update('smsNotifications', v)} />
          </div>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Push Notifications</p>
              <p className="text-sm text-neutral-500">Send browser push notifications for consultation events</p>
            </div>
            <Toggle value={form.pushNotifications} onChange={(v) => update('pushNotifications', v)} />
          </div>
        </div>
      )}

      {/* ── Media Defaults Tab ──────────────────────────────────────────── */}
      {activeTab === 'media' && (
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 space-y-6">
          <h2 className="text-lg font-bold text-neutral-900 border-b border-neutral-100 pb-3">Default Media Settings</h2>
          <p className="text-sm text-neutral-500">These settings apply when a user joins a consultation.</p>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Default Video Quality</label>
            <select
              value={form.defaultVideoQuality}
              onChange={(e) => update('defaultVideoQuality', e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-100 outline-none"
            >
              <option value="low">Low (320x240) — Slow connections</option>
              <option value="medium">Medium (640x480) — Balanced</option>
              <option value="high">High (1280x720) — Fast connections</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Start with Muted Microphone</p>
              <p className="text-sm text-neutral-500">New participants join with mic muted by default</p>
            </div>
            <Toggle value={form.startWithMutedMic} onChange={(v) => update('startWithMutedMic', v)} />
          </div>

          <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900">Start with Camera Off</p>
              <p className="text-sm text-neutral-500">New participants join with camera off by default</p>
            </div>
            <Toggle value={form.startWithMutedCamera} onChange={(v) => update('startWithMutedCamera', v)} />
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
