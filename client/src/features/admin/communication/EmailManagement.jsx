import { useEffect, useState } from 'react';
import { Search, RefreshCw, Eye, Send } from 'lucide-react';
import { getEmailLogs, resendEmail, sendTestEmail } from '../../../api/communicationAPI';

export default function EmailManagement() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [testEmail, setTestEmail] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await getEmailLogs({ search, status, page, limit: 20 });
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [search, status, page]);

  async function handleResend(id) {
    try {
      await resendEmail(id);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleTestEmail(e) {
    e.preventDefault();
    if (!testEmail) return;
    try {
      await sendTestEmail({ to: testEmail });
      setTestEmail('');
      alert('Test email sent');
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 mb-4">Email Management</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-teal-600"
        >
          <option value="">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <form onSubmit={handleTestEmail} className="flex gap-2">
          <input
            type="email"
            placeholder="Send test email to..."
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800">
            <Send className="w-4 h-4" /> Test
          </button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">To</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Template</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-4 py-3">{log.to}</td>
                  <td className="px-4 py-3">{log.subject}</td>
                  <td className="px-4 py-3">{log.templateName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      log.status === 'sent' ? 'bg-green-100 text-green-700' :
                      log.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {log.status === 'failed' && (
                        <button onClick={() => handleResend(log._id)} className="p-1 hover:text-teal-700" title="Resend">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-teal-700 text-white' : 'bg-white border border-neutral-200'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
