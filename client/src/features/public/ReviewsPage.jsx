import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Quote, PenLine, RefreshCw, ThumbsUp } from 'lucide-react';
import { reviewsAPI, publicAPI } from '../../api/generalAPI';

function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ avgRating: 0, reviewCount: 0, successRate: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchReviews = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await reviewsAPI.getAll({ page: pageNum, limit: 12 });
      const data = res.data.data;
      setReviews(data.reviews || []);
      setPagination(data.pagination || {});
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await publicAPI.getStats();
      setStats(res.data.data || {});
    } catch {
      // keep defaults
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(page);
  }, [fetchReviews, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // client-side star rating filter
  const filteredReviews = filter === 'all'
    ? reviews
    : reviews.filter((r) => r.rating === parseInt(filter));

  const avgRating = stats.avgRating || 0;
  const reviewCount = stats.reviewCount || 0;
  const successRate = stats.successRate || 0;

  const formatReview = (review) => {
    const patientName = `${review.patientId?.firstName || 'Patient'} ${review.patientId?.lastName || ''}`.trim();
    const doctorName = review.doctorId?.user
      ? `Dr. ${review.doctorId.user.firstName} ${review.doctorId.user.lastName}`
      : 'VerdantCare Team';
    const specialty = review.doctorId?.specialty || '';
    const initials = `${(review.patientId?.firstName || 'P')[0]}${(review.patientId?.lastName || 'A')[0]}`.toUpperCase();
    const date = review.createdAt
      ? new Date(review.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    return { patientName, doctorName, specialty, initials, date };
  };

  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-12">
          <span className="text-primary-700 font-medium">Testimonials</span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mt-2">
            What Our Patients Say
          </h1>
          <p className="text-neutral-600 mt-4 max-w-2xl mx-auto text-lg">
            Real experiences from real patients. Your health and satisfaction are our top priorities.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              {statsLoading ? (
                <div className="h-9 w-12 bg-primary-100 rounded animate-pulse mx-auto mb-2" />
              ) : (
                <p className="text-3xl font-bold text-primary-700">{avgRating || '—'}</p>
              )}
              <div className="flex justify-center gap-0.5 my-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} className={s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'} />
                ))}
              </div>
              <p className="text-sm text-neutral-500">Average Rating</p>
            </div>
            <div>
              {statsLoading ? (
                <div className="h-9 w-12 bg-primary-100 rounded animate-pulse mx-auto mb-2" />
              ) : (
                <p className="text-3xl font-bold text-primary-700">{reviewCount}</p>
              )}
              <p className="text-sm text-neutral-500 mt-1">Total Reviews</p>
            </div>
            <div>
              {statsLoading ? (
                <div className="h-9 w-12 bg-primary-100 rounded animate-pulse mx-auto mb-2" />
              ) : (
                <p className="text-3xl font-bold text-primary-700">{successRate}%</p>
              )}
              <p className="text-sm text-neutral-500 mt-1">Recommend Us</p>
            </div>
            <div>
              {statsLoading ? (
                <div className="h-9 w-12 bg-primary-100 rounded animate-pulse mx-auto mb-2" />
              ) : (
                <p className="text-3xl font-bold text-primary-700">{stats.doctors || '—'}</p>
              )}
              <p className="text-sm text-neutral-500 mt-1">Expert Doctors</p>
            </div>
          </div>
        </div>

        {/* Write a Review CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <Link
            to="/#write-review"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <PenLine size={16} /> Write a Review
          </Link>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', '5', '4', '3', '2', '1'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-primary-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {f === 'all' ? 'All Reviews' : `${f} Stars`}
              </button>
            ))}
          </div>
        </div>

        {/* Reviews Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-100 p-6 animate-pulse space-y-3">
                <div className="h-4 bg-neutral-100 rounded w-1/3" />
                <div className="h-3 bg-neutral-100 rounded w-full" />
                <div className="h-3 bg-neutral-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-20 text-center">
            <Quote size={40} className="mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-500 font-medium">No reviews found</p>
            <p className="text-neutral-400 text-sm mt-1">Try adjusting your filter</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredReviews.map((review) => {
              const { patientName, doctorName, specialty, initials, date } = formatReview(review);
              return (
                <div key={review.id} className="bg-white rounded-xl border border-neutral-100 p-6 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold text-sm">{initials}</span>
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{patientName}</p>
                        <p className="text-xs text-neutral-500">{date}</p>
                      </div>
                    </div>
                    <Quote size={20} className="text-primary-200" />
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'} />
                    ))}
                  </div>
                  <p className="text-neutral-600 text-sm leading-relaxed mb-4">{review.comment || 'No comment provided.'}</p>
                  <div className="flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-50 pt-3">
                    <span>{doctorName}</span>
                    {specialty && <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{specialty}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <p className="text-sm text-neutral-500">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} reviews
            </p>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default ReviewsPage;