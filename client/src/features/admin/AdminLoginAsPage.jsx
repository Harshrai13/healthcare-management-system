import { useState, useCallback } from 'react';
import { Search, LogIn, User, Stethoscope, Shield, AlertTriangle, RefreshCw, ExternalLink, Eye } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials } from '../../store/authSlice';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ROLE_STYLES = {
  PATIENT:          { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: User },
  DOCTOR:           { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Stethoscope },
  SUPER_ADMIN:      { bg: 'bg-red-50',    text: 'text-red-700',    icon: Shield },
  CONTENT_MANAGER:  { bg: 'bg-purple-50', text: 'text-purple-700', icon: Shield },
  BILLING_STAFF:    { bg: 'bg-orange-50', text: 'text-orange-700', icon: Shield },
  RECEPTIONIST:     { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: Shield },
};

const PORTAL_PATH = {
  PATIENT:         '/dashboard',
  DOCTOR:          '/doctor/dashboard',
  SUPER_ADMIN:     '/admin',
  CONTENT_MANAGER: '/admin',
  BILLING_STAFF:   '/admin',
  RECEPTIONIST:    '/admin',
};

export default function AdminLoginAsPage() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();

  const [query,      setQuery]      = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const [pagination, setPagination] = useState({});
  const [actionId,   setActionId]   = useState(null);

  // ── Search users ──────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (query)      params.q    = query;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/admin/users/search', { params });
      setUsers(res.data.data.users || []);
      setPagination(res.data.data.pagination || {});
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter]);

  // ── Login as user ─────────────────────────────────────────────────────────
  const handleLoginAs = async (user) => {
    if (!window.confirm(`Login as ${user.firstName} ${user.lastName} (${user.role})?\n\nYou will be taken to their portal. Open DevTools > Application > LocalStorage to see the token if needed.`)) return;
    setActionId(user.id);
    try {
      const res = await api.post(`/admin/login-as/${user.id}`);
      const { user: targetUser, accessToken } = res.data.data;

      // Store credentials in Redux (this switches the active session)
      dispatch(setCredentials({ user: targetUser, accessToken }));

      const portalPath = PORTAL_PATH[targetUser.role] || '/dashboard';
      toast.success(`Now viewing as ${targetUser.firstName} ${targetUser.lastName}`, { icon: '👤' });
      navigate(portalPath);
    } catch (err) {
      toast.error(err.message || 'Failed to login as user');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Login as User</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          Search for any patient or doctor and open their portal session directly.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-800">Admin action — use responsibly</p>
          <p className="text-amber-700 mt-0.5">
            This will switch your active session to that user's account. Every action will be performed as them.
            All impersonation events are recorded in the Audit Log.
            To return to admin, log out and log back in.
          </p>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Text search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email or user ID…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-100 focus:border-primary-200 outline-none transition"
            />
          </div>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-3 bg-neutral-50 border border-transparent rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-200 transition md:w-48"
          >
            <option value="">All Roles</option>
            <option value="PATIENT">Patient</option>
            <option value="DOCTOR">Doctor</option>
            <option value="CONTENT_MANAGER">Content Manager</option>
            <option value="BILLING_STAFF">Billing Staff</option>
            <option value="RECEPTIONIST">Receptionist</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shrink-0"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>
      </form>

      {/* Results */}
      {searched && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-700">
              {loading ? 'Searching…' : `${pagination.total ?? users.length} user${(pagination.total ?? users.length) !== 1 ? 's' : ''} found`}
            </p>
            {!loading && users.length > 0 && (
              <p className="text-xs text-neutral-400">Click "Login As" to open their portal</p>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-neutral-50">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-5 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-100 rounded w-1/3" />
                    <div className="h-3 bg-neutral-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <User size={36} className="mx-auto text-neutral-300 mb-3" />
              <p className="text-neutral-500 font-medium">No users found</p>
              <p className="text-neutral-400 text-sm mt-1">Try a different search term or role filter</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {users.map(user => {
                const style   = ROLE_STYLES[user.role] || ROLE_STYLES.PATIENT;
                const Icon    = style.icon;
                const initials = `${(user.firstName||'?')[0]}${(user.lastName||'?')[0]}`.toUpperCase();
                const isLoading = actionId === user.id;
                const isAdmin = ['SUPER_ADMIN'].includes(user.role);

                return (
                  <div key={user.id} className="p-5 hover:bg-neutral-50/60 transition-colors flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-neutral-900 text-sm">
                          {user.firstName} {user.lastName}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${style.bg} ${style.text}`}>
                          <Icon size={10} />
                          {user.role.replace('_', ' ')}
                        </span>
                        {!user.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">{user.email}</p>
                      {user.doctorProfile?.specialty && (
                        <p className="text-xs text-primary-600 mt-0.5">{user.doctorProfile.specialty}</p>
                      )}
                      <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">ID: {user.id}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin ? (
                        <span className="text-xs text-neutral-400 italic">Cannot impersonate</span>
                      ) : (
                        <button
                          onClick={() => handleLoginAs(user)}
                          disabled={isLoading || !user.isActive}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {isLoading
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <LogIn size={13} />
                          }
                          Login As
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial state hint */}
      {!searched && (
        <div className="text-center py-16 text-neutral-400">
          <Search size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Search for a user above to get started</p>
          <p className="text-sm mt-1">You can search by name, email, or leave blank to see all users</p>
        </div>
      )}
    </div>
  );
}
