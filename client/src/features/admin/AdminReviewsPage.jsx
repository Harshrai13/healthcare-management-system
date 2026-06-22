import { useState, useEffect, useCallback } from 'react';
import { Star, Search, CheckCircle, Trash2, Flag, RefreshCw, MessageSquare, ThumbsUp, Clock, BarChart2 } from 'lucide-react';
import { reviewsAPI } from '../../api/generalAPI';
import toast from 'react-hot-toast';

// ─── Star display helper ───────────────────────────────────────────────────
function Stars({ rating, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'fill-neutral-200 text-neutral-200'}
        />
      ))}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ value, label, color, icon: Icon, loading }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        {loading
          ? <div className="h-7 w-16 bg-neutral-100 rounded animate-pulse mb-1" />
          : <p className="text-2xl font-black text-neutral-900">{value}</p>
        }
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({});
  const [actionLoading, setActionLoading] = useState(null); // review id being actioned

  // ── derived stats ────────────────────────────────────────────────────────
  const totalApproved = reviews.filter(r => r.isApproved).length;
  const totalPending  = reviews.filter(r => !r.isApproved).length;
  const avgRating     = reviews.length
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      const res = await reviewsAPI.getAdminAll(params);
      const data = res.data.data;
      setReviews(data.reviews || []);
      setPagination(data.pagination || {});
    } catch {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // ── approve ──────────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try {
      await reviewsAPI.approve(id);
      toast.success('Review approved and published!');
      setReviews(prev => prev.map(r => r._id === id ? { ...r, isApproved: true } : r));
    } catch {
      toast.error('Failed to approve review');
    } finally {
      setActionLoading(null);
    }
  };

  // ── delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this review? This cannot be undone.')) return;
    setActionLoading(id + '-delete');
    try {
      await reviewsAPI.delete(id);
      toast.success('Review deleted');
      setReviews(prev => prev.filter(r => r._id !== id));
    } catch {
      toast.error('Failed to delete review');
    } finally {
      setActionLoading(null);
    }
  };

  // ── client-side filter & search ──────────────────────────────────────────
  const filtered = reviews.filter(r => {
    const name    = (r.patientName || `${r.patientId?.firstName || ''} ${r.patientId?.lastName || ''}`).toLowerCase();
    const doctor  = `${r.doctorId?.userId?.firstName || ''} ${r.doctorId?.userId?.lastName || ''}`.toLowerCase();
    const comment = (r.comment || '').toLowerCase();
    const term    = search.toLowerCase();
    const matchSearch = !search || name.includes(term) || doctor.includes(term) || comment.includes(term);
    const matchRating = ratingFilter === 'ALL' || r.rating === parseInt(ratingFilter);
    return matchSearch && matchRating;
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reviews & Feedback</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Moderate patient testimonials — approve or remove reviews</p>
        </div>
        <button
          onClick={fetchReviews}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={loading} icon={MessageSquare} color="bg-blue-50 text-blue-600"  value={pagination.total ?? reviews.length} label="Total Reviews" />
        <StatCard loading={loading} icon={Star}          color="bg-yellow-50 text-yellow-600" value={avgRating} label="Average Rating" />
        <StatCard loading={loading} icon={ThumbsUp}      color="bg-emerald-50 text-emerald-600" value={totalApproved} label="Approved" />
        <StatCard loading={loading} icon={Clock}         color="bg-orange-50 text-orange-600"  value={totalPending}  label="Pending" />
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">

        {/* Filters */}
        <div className="p-4 border-b border-neutral-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
            <input
              type="text"
              placeholder="Search by patient, doctor or comment…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-100 outline-none border border-transparent focus:border-primary-200 transition"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            {['ALL','5','4','3','2','1'].map(v => (
              <button
                key={v}
                onClick={() => setRatingFilter(v)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  ratingFilter === v
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {v === 'ALL' ? 'All' : `${v}★`}
              </button>
            ))}
          </div>
        </div>

        {/* Review list */}
        {loading ? (
          <div className="divide-y divide-neutral-50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 animate-pulse flex gap-6">
                <div className="w-10 h-10 rounded-full bg-neutral-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-100 rounded w-1/4" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                  <div className="h-3 bg-neutral-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <MessageSquare size={40} className="mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-500 font-medium">No reviews found</p>
            <p className="text-neutral-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {filtered.map(review => {
              const patientName = review.patientName || `${review.patientId?.firstName || 'Patient'} ${review.patientId?.lastName || ''}`.trim() || 'Anonymous';
              const doctorName  = review.doctorId?.userId
                ? `Dr. ${review.doctorId.userId.firstName} ${review.doctorId.userId.lastName}`
                : 'Our Team';
              const specialty   = review.doctorId?.specialty || '';
              const firstInitial = patientName.charAt(0).toUpperCase();
              const secondInitial = patientName.split(/\s+/)[1]?.charAt(0)?.toUpperCase() || '';
              const initials    = `${firstInitial}${secondInitial}`.toUpperCase();
              const date        = new Date(review.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
              const isApproving = actionLoading === review._id + '-approve';
              const isDeleting  = actionLoading === review._id + '-delete';

              return (
                <div key={review._id} className="p-6 hover:bg-neutral-50/60 transition-colors">
                  <div className="flex flex-col lg:flex-row gap-5">

                    {/* Avatar + meta */}
                    <div className="flex items-start gap-3 lg:w-56 shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-neutral-900 text-sm leading-tight">{patientName}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{date}</p>
                        <p className="text-xs text-primary-600 font-medium mt-1">{doctorName}</p>
                        {specialty && <p className="text-xs text-neutral-400">{specialty}</p>}
                        <div className="mt-2">
                          <Stars rating={review.rating} />
                        </div>
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="flex-1 flex flex-col justify-between">
                      <p className="text-neutral-700 leading-relaxed text-sm italic">
                        "{review.comment || 'No comment provided.'}"
                      </p>

                      {/* Rating badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          review.rating >= 4 ? 'bg-emerald-50 text-emerald-700' :
                          review.rating === 3 ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-600'
                        }`}>
                          <Star size={11} className="fill-current" />
                          {review.rating}/5
                        </span>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 lg:w-40 shrink-0">
                      {/* Status badge */}
                      {review.isApproved ? (
                        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
                          <CheckCircle size={12} /> Approved
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold">
                          <Clock size={12} /> Pending
                        </span>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {!review.isApproved && (
                          <button
                            onClick={() => handleApprove(review._id)}
                            disabled={isApproving}
                            title="Approve & publish"
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
                          >
                            {isApproving
                              ? <RefreshCw size={13} className="animate-spin" />
                              : <CheckCircle size={13} />
                            }
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(review._id)}
                          disabled={isDeleting}
                          title="Delete permanently"
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60"
                        >
                          {isDeleting
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <Trash2 size={13} />
                          }
                          Delete
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100">
            <p className="text-sm text-neutral-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
