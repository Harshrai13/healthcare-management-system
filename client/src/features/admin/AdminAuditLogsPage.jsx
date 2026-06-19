import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, LogIn, Edit, Trash2, Calendar, Activity, Download } from 'lucide-react';
import { adminAPI } from '../../api/generalAPI';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function AdminAuditLogsPage() {
  const [filter, setFilter] = useState('ALL');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin_audit_logs', filter],
    queryFn: async () => {
      const params = {};
      if (filter !== 'ALL') params.type = filter;
      const { data } = await adminAPI.getAuditLogs(params);
      return data.data?.logs || data.data || [];
    },
  });

  const filteredLogs = useMemo(() => {
    if (filter === 'ALL') return logs;
    return logs.filter((log) => {
      const type = getLogType(log.action || '');
      if (filter === 'critical') return type === 'critical';
      return true;
    });
  }, [logs, filter]);

  function getLogType(action) {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'info';
    if (action.includes('SETTINGS') || action.includes('SYSTEM') || action.includes('CRITICAL')) return 'critical';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'info';
    if (action.includes('DELETE') || action.includes('CANCEL')) return 'warning';
    if (action.includes('BACKUP') || action.includes('COMPLETE')) return 'success';
    if (action.includes('FAILED')) return 'warning';
    return 'info';
  }

  function getIcon(action) {
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return <LogIn size={16} />;
    if (action.includes('SETTINGS') || action.includes('SYSTEM') || action.includes('CRITICAL')) return <ShieldAlert size={16} />;
    if (action.includes('UPDATE') || action.includes('EDIT')) return <Edit size={16} />;
    if (action.includes('DELETE') || action.includes('CANCEL')) return <Trash2 size={16} />;
    if (action.includes('APPOINTMENT')) return <Calendar size={16} />;
    return <Activity size={16} />;
  }

  function getColor(type) {
    switch (type) {
      case 'critical': return 'bg-purple-100 text-purple-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'success': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function handleExportCSV() {
    const dataToExport = filteredLogs;
    if (dataToExport.length === 0) return;
    const headers = ['Event', 'Actor', 'Actor Role', 'Target', 'IP Address', 'Time'];
    const rows = dataToExport.map((log) => [
      log.action || 'UNKNOWN',
      log.user || log.actor || 'System',
      log.role || 'SYSTEM',
      log.target || log.description || '',
      log.ip || log.ipAddress || '',
      log.createdAt || log.timestamp || '',
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Security Audit Logs</h1>
        <p className="text-neutral-500 text-sm">System-wide activity tracking for HIPAA compliance</p>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === 'ALL' ? 'bg-white border border-neutral-200 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100'}`}
            >
              All Logs
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === 'critical' ? 'bg-white border border-neutral-200 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100'}`}
            >
              Critical Events
            </button>
          </div>
          <button onClick={handleExportCSV} className="text-primary-600 font-semibold text-sm hover:text-primary-700 flex items-center gap-1.5">
            <Download size={14} /> Export Report
          </button>
        </div>

        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Event</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Actor</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">Target</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase">IP Address</th>
              <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                  <ShieldAlert className="mx-auto text-neutral-300 mb-3" size={40} />
                  <p className="font-medium">No audit logs found</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const type = getLogType(log.action || '');
                return (
                  <tr key={log._id || log.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getColor(type)}`}>
                          {getIcon(log.action || '')}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 text-sm">{log.action || 'UNKNOWN_ACTION'}</p>
                          <p className="text-xs text-neutral-500 font-mono">{(log._id || log.id || '').slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-neutral-900">{log.user || log.actor || 'System'}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">{log.role || 'SYSTEM'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 font-medium">{log.target || log.description || '-'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-neutral-500">{log.ip || log.ipAddress || '-'}</td>
                    <td className="px-6 py-4 text-right text-sm text-neutral-500">{formatTimeAgo(log.createdAt || log.timestamp)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
