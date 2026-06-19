import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard, Calendar, FileText, Pill, CreditCard, User, Users,
  Bell, LogOut, Menu, X, ChevronDown, Search, Settings, Activity, MessageSquare, ShieldCheck,
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { logout } from '../store/authSlice';
import { setSidebarOpen } from '../store/uiSlice';
import { getAdminNavItems, isAdminRole } from '../utils/adminNav';
import { useNotifications } from '../hooks/useNotifications';
import useDashboardSearch from '../hooks/useDashboardSearch';

function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { sidebarOpen } = useSelector((state) => state.ui);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { query, setQuery, results, loading: searchLoading, navigateTo } = useDashboardSearch();

  const navItems = useMemo(() => {
    const role = user?.role;

    if (role === 'DOCTOR') {
      return [
        { name: 'Overview', path: '/doctor/dashboard', icon: LayoutDashboard },
        { name: 'Schedule', path: '/doctor/schedule', icon: Calendar },
        { name: 'My Patients', path: '/doctor/patients', icon: Users },
        { name: 'Consultations', path: '/doctor/consultations', icon: Activity },
      ];
    }
    if (isAdminRole(role)) {
      return getAdminNavItems(role);
    }
    return [
      { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Appointments', path: '/dashboard/appointments', icon: Calendar },
      { name: 'Medical Records', path: '/dashboard/records', icon: FileText },
      { name: 'Prescriptions', path: '/dashboard/prescriptions', icon: Pill },
      { name: 'Billing', path: '/dashboard/billing', icon: CreditCard },
      { name: 'Insurance', path: '/dashboard/insurance', icon: ShieldCheck },
      { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
      { name: 'Messages', path: '/dashboard/messages', icon: MessageSquare },
      { name: 'Profile', path: '/dashboard/profile', icon: User },
    ];
  }, [user?.role]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const currentNav = navItems.find((item) => item.path === location.pathname)
    || navItems.find((item) => location.pathname.startsWith(item.path) && item.path !== '/dashboard' && item.path !== '/admin' && item.path !== '/doctor/dashboard')
    || navItems[0];

  const formatNotifTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins || 1}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex overflow-hidden">

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-gradient transform transition-transform duration-300 lg:translate-x-0 lg:static flex flex-col shadow-2xl lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <span className="text-white font-display font-bold text-lg">V</span>
            </div>
            <div>
              <span className="font-display font-bold text-white block leading-tight">VerdantCare</span>
              <span className="text-[10px] text-primary-300 font-bold uppercase tracking-widest block leading-tight">
                {user?.role === 'DOCTOR' ? 'Doctor Portal' :
                  isAdminRole(user?.role) ? 'Admin Portal' : 'Patient Portal'}
              </span>
            </div>
          </Link>
          <button onClick={() => dispatch(setSidebarOpen(false))} className="lg:hidden ml-auto text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
                || (item.path !== '/dashboard' && item.path !== '/admin' && item.path !== '/doctor/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => dispatch(setSidebarOpen(false))}
                  className={isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}
                >
                  <item.icon size={20} className={isActive ? 'text-primary-300' : 'text-white/50 group-hover:text-white/80'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold shadow-inner">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-primary-300 truncate capitalize">{user?.role?.replace('_', ' ').toLowerCase() || 'Patient'}</p>
            </div>
            <button onClick={handleLogout} className="text-white/50 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Log Out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => dispatch(setSidebarOpen(false))} />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-neutral-200/60 flex items-center justify-between px-4 lg:px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => dispatch(setSidebarOpen(true))} className="lg:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg">
              <Menu size={24} />
            </button>
            <div className="hidden lg:flex flex-col">
              <h2 className="text-xl font-display font-bold text-neutral-900 tracking-tight">{currentNav?.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden md:block relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                className="w-64 bg-neutral-100 border-transparent rounded-full py-2 pl-10 pr-4 text-sm focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all"
              />
              {searchOpen && query.length >= 2 && (
                <div className="absolute top-full mt-2 w-80 bg-white rounded-xl shadow-dropdown border border-neutral-100 py-2 z-50">
                  {searchLoading ? (
                    <p className="px-4 py-3 text-sm text-neutral-500">Searching...</p>
                  ) : results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-neutral-500">No results found</p>
                  ) : (
                    results.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => { navigateTo(r.path); setSearchOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-neutral-900">{r.label}</p>
                        <p className="text-xs text-neutral-500">{r.type}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-neutral-200 hidden md:block" />

            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notif-dot animate-pulse" />}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-dropdown border border-neutral-100 py-3 animate-scale-in origin-top-right z-50">
                  <div className="px-4 pb-2 border-b border-neutral-100 flex items-center justify-between">
                    <h3 className="font-semibold text-neutral-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllAsRead()} className="text-xs text-primary-600 font-medium hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-neutral-500 text-center">No notifications yet</p>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <button
                          key={n._id}
                          onClick={() => { if (!n.isRead) markAsRead(n._id); navigate('/dashboard/notifications'); setNotificationsOpen(false); }}
                          className={`w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-50 transition-colors ${!n.isRead ? 'bg-primary-50/30' : ''}`}
                        >
                          <p className="text-sm font-medium text-neutral-900">{n.title}</p>
                          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-neutral-400 mt-2">{formatNotifTime(n.createdAt)}</p>
                        </button>
                      ))
                    )}
                  </div>
                  <Link to="/dashboard/notifications" onClick={() => setNotificationsOpen(false)} className="block text-center text-xs text-primary-600 font-medium py-2 hover:underline">
                    View all notifications
                  </Link>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
              >
                <div className="avatar-sm bg-primary-100 text-primary-700">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <ChevronDown size={14} className="text-neutral-400 hidden sm:block" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-dropdown border border-neutral-100 py-2 animate-scale-in origin-top-right z-50">
                  <Link
                    to={user?.role === 'DOCTOR' ? '/doctor/dashboard' : isAdminRole(user?.role) ? '/admin/settings' : '/dashboard/profile'}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <Settings size={16} /> {isAdminRole(user?.role) ? 'Settings' : 'Profile'}
                  </Link>
                  <div className="h-px bg-neutral-100 my-1" />
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger-light/50 transition-colors">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
