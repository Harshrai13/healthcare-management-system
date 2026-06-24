import { useEffect, useState } from 'react';
import { Mail, MessageSquare, Megaphone, FileText, Activity, TrendingUp } from 'lucide-react';
import { getCommunicationHealth, getEmailAnalytics, getSMSAnalytics } from '../../../api/communicationAPI';
import { Link } from 'react-router-dom';

export default function CommunicationDashboard() {
  const [health, setHealth] = useState(null);
  const [emailStats, setEmailStats] = useState(null);
  const [smsStats, setSmsStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [healthRes, emailRes, smsRes] = await Promise.all([
          getCommunicationHealth(),
          getEmailAnalytics(),
          getSMSAnalytics(),
        ]);
        setHealth(healthRes.data.data);
        setEmailStats(emailRes.data.data);
        setSmsStats(smsRes.data.data);
      } catch (err) {
        console.error('Failed to load communication dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const cards = [
    { name: 'Email Management', path: '/admin/communication/emails', icon: Mail, desc: 'View sent, failed, pending emails and resend' },
    { name: 'SMS Management', path: '/admin/communication/sms', icon: MessageSquare, desc: 'View SMS history and delivery status' },
    { name: 'Email Settings', path: '/admin/communication/settings', icon: Activity, desc: 'Configure Resend provider and sender identity' },
    { name: 'Email Templates', path: '/admin/communication/templates', icon: FileText, desc: 'Edit subjects and HTML templates' },
    { name: 'Announcements', path: '/admin/communication/announcements', icon: Megaphone, desc: 'Create clinic announcements' },
    { name: 'Analytics', path: '/admin/communication/analytics', icon: TrendingUp, desc: 'Email and SMS analytics dashboards' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Communication Center</h1>
      <p className="text-neutral-500 mb-6">Manage all emails, SMS, notifications, and announcements in one place.</p>

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-500">Email Service</p>
            <p className={`font-semibold ${health.emailService.online ? 'text-green-600' : 'text-red-600'}`}>
              {health.emailService.online ? 'Online' : 'Offline'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-500">SMS Service</p>
            <p className={`font-semibold ${health.smsService.online ? 'text-green-600' : 'text-red-600'}`}>
              {health.smsService.online ? 'Online' : 'Offline'}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-500">Failed (24h)</p>
            <p className="font-semibold text-neutral-900">{health.failedEmails24h + health.failedSMS24h}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-500">Health Score</p>
            <p className="font-semibold text-neutral-900">{health.healthScore}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.name}
              to={card.path}
              className="bg-white p-6 rounded-lg border border-neutral-200 hover:border-teal-600 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Icon className="w-5 h-5 text-teal-700" />
                </div>
                <h3 className="font-semibold text-neutral-900">{card.name}</h3>
              </div>
              <p className="text-sm text-neutral-500">{card.desc}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {emailStats && (
          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h3 className="font-semibold text-neutral-900 mb-4">Email Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-neutral-500">Total</p><p className="text-xl font-bold">{emailStats.totalEmails}</p></div>
              <div><p className="text-sm text-neutral-500">Sent</p><p className="text-xl font-bold text-green-600">{emailStats.sentEmails}</p></div>
              <div><p className="text-sm text-neutral-500">Failed</p><p className="text-xl font-bold text-red-600">{emailStats.failedEmails}</p></div>
              <div><p className="text-sm text-neutral-500">Success Rate</p><p className="text-xl font-bold">{emailStats.successRate}</p></div>
            </div>
          </div>
        )}
        {smsStats && (
          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h3 className="font-semibold text-neutral-900 mb-4">SMS Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-neutral-500">Total</p><p className="text-xl font-bold">{smsStats.totalSMS}</p></div>
              <div><p className="text-sm text-neutral-500">Sent</p><p className="text-xl font-bold text-green-600">{smsStats.sentSMS}</p></div>
              <div><p className="text-sm text-neutral-500">Failed</p><p className="text-xl font-bold text-red-600">{smsStats.failedSMS}</p></div>
              <div><p className="text-sm text-neutral-500">Delivery Rate</p><p className="text-xl font-bold">{smsStats.deliveryRate}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
