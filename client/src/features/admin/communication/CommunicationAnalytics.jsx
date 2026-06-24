import { useEffect, useState } from 'react';
import { getEmailAnalytics, getSMSAnalytics } from '../../../api/communicationAPI';

export default function CommunicationAnalytics() {
  const [emailStats, setEmailStats] = useState(null);
  const [smsStats, setSmsStats] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emailRes, smsRes] = await Promise.all([
          getEmailAnalytics({ period }),
          getSMSAnalytics({ period }),
        ]);
        setEmailStats(emailRes.data.data);
        setSmsStats(smsRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const BarChart = ({ data, labelKey, countKey }) => (
    <div className="space-y-2 mt-4">
      {data?.map((item) => (
        <div key={item[labelKey]} className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 w-20 truncate">{item[labelKey]}</span>
          <div className="flex-1 h-4 bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full" style={{ width: `${Math.min(100, item[countKey] * 5)}%` }} />
          </div>
          <span className="text-xs font-medium w-8 text-right">{item[countKey]}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Communication Analytics</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-neutral-200 rounded-lg"
        >
          <option value="day">Last 24 Hours</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {emailStats && (
          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h2 className="font-semibold text-neutral-900 mb-4">Email Analytics</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-neutral-50 rounded"><p className="text-xs text-neutral-500">Total</p><p className="text-lg font-bold">{emailStats.totalEmails}</p></div>
              <div className="p-3 bg-green-50 rounded"><p className="text-xs text-neutral-500">Delivered</p><p className="text-lg font-bold text-green-700">{emailStats.sentEmails}</p></div>
              <div className="p-3 bg-red-50 rounded"><p className="text-xs text-neutral-500">Failed</p><p className="text-lg font-bold text-red-700">{emailStats.failedEmails}</p></div>
              <div className="p-3 bg-yellow-50 rounded"><p className="text-xs text-neutral-500">Pending</p><p className="text-lg font-bold text-yellow-700">{emailStats.pendingEmails}</p></div>
            </div>
            <p className="text-sm font-medium">Success Rate: {emailStats.successRate}</p>
            <BarChart data={emailStats.dailyVolume} labelKey="_id" countKey="count" />
          </div>
        )}
        {smsStats && (
          <div className="bg-white p-6 rounded-lg border border-neutral-200">
            <h2 className="font-semibold text-neutral-900 mb-4">SMS Analytics</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-neutral-50 rounded"><p className="text-xs text-neutral-500">Total</p><p className="text-lg font-bold">{smsStats.totalSMS}</p></div>
              <div className="p-3 bg-green-50 rounded"><p className="text-xs text-neutral-500">Delivered</p><p className="text-lg font-bold text-green-700">{smsStats.sentSMS}</p></div>
              <div className="p-3 bg-red-50 rounded"><p className="text-xs text-neutral-500">Failed</p><p className="text-lg font-bold text-red-700">{smsStats.failedSMS}</p></div>
              <div className="p-3 bg-yellow-50 rounded"><p className="text-xs text-neutral-500">Pending</p><p className="text-lg font-bold text-yellow-700">{smsStats.pendingSMS}</p></div>
            </div>
            <p className="text-sm font-medium">Delivery Rate: {smsStats.deliveryRate}</p>
            <BarChart data={smsStats.dailyVolume} labelKey="_id" countKey="count" />
          </div>
        )}
      </div>

      {emailStats?.templateBreakdown?.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <h2 className="font-semibold text-neutral-900 mb-4">Top Email Templates</h2>
          <BarChart data={emailStats.templateBreakdown} labelKey="_id" countKey="count" />
        </div>
      )}
    </div>
  );
}
