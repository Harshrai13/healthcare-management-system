import { Bell, CheckCircle, Calendar, MessageSquare, AlertTriangle, FileText, Settings, X } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/LoadingSpinner';

const iconMap = {
  appointment: { icon: Calendar, color: 'text-blue-600 bg-blue-50' },
  alert: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
  message: { icon: MessageSquare, color: 'text-purple-600 bg-purple-50' },
  record: { icon: FileText, color: 'text-green-600 bg-green-50' },
  default: { icon: Bell, color: 'text-neutral-600 bg-neutral-50' },
};

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
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotificationsPage() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Notifications</h1>
          <p className="text-neutral-500 mt-1">
            Stay updated on your health alerts and messages.
            {unreadCount > 0 && <span className="ml-1 text-primary-600 font-medium">({unreadCount} unread)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={() => markAllAsRead()} className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
              Mark all as read
            </button>
          )}
          <button className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors" title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">
              <Bell className="mx-auto text-neutral-300 mb-3" size={40} />
              <p className="font-medium text-neutral-900">No notifications yet</p>
              <p className="text-sm text-neutral-400 mt-1">You will be notified about appointments, messages, and health updates.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const typeConfig = iconMap[notif.type] || iconMap.default;
              const IconComponent = typeConfig.icon;
              const isRead = notif.isRead || notif.read;

              return (
                <div
                  key={notif._id || notif.id}
                  className={`p-5 flex gap-4 transition-colors hover:bg-neutral-50 ${!isRead ? 'bg-primary-50/30' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${typeConfig.color}`}>
                    <IconComponent size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className={`font-bold text-neutral-900 ${!isRead ? '' : 'text-opacity-80'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-xs text-neutral-400 whitespace-nowrap">
                        {formatTimeAgo(notif.createdAt || notif.time)}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${!isRead ? 'text-neutral-700 font-medium' : 'text-neutral-500'}`}>
                      {notif.message}
                    </p>
                    {!isRead && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => markAsRead(notif._id || notif.id)}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700"
                        >
                          Mark as Read
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col justify-between items-end">
                    {!isRead && <div className="w-2.5 h-2.5 bg-primary-600 rounded-full mt-1.5" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
