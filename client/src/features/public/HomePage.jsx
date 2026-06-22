import { Link } from 'react-router-dom';
import { Calendar, UserCheck, Video, Award, Users, Stethoscope, Heart, Shield, CheckCircle, Star, Clock, ArrowRight, Quote, PenLine } from 'lucide-react';
import { memo, useState, useEffect } from 'react';
import { publicAPI, reviewsAPI } from '../../api/generalAPI';
import toast from 'react-hot-toast';

// ─── HERO (original with logo) ──────────────────────────────────────────────
const HeroSection = memo(function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-neutral-50" />
      <div className="absolute top-0 right-0 w-1/3 h-full bg-primary-50/50" />

      <div className="container-custom relative z-10 py-12 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          <div className="animate-fade-up max-w-2xl py-10">
            <h1 className="text-5xl lg:text-6xl font-display font-bold leading-tight text-neutral-900 mb-6">
              Excellence in Healthcare, <br/>
              <span className="text-primary-700">Dedicated to You.</span>
            </h1>
            <p className="text-lg text-neutral-600 mb-8 max-w-lg leading-relaxed">
              Experience world-class medical care with our team of expert physicians. We combine advanced medical
              technology with compassionate, personalized care to ensure your well-being.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Link to="/dashboard/appointments" className="btn-primary btn-xl">
                Book Appointment
              </Link>
              <Link to="/doctors" className="btn-outline btn-xl">
                Our Specialists
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex relative h-[500px] items-center justify-center">
            <img
              src="/logo.png"
              alt="VerdantCare Medical Center Logo"
              className="w-full max-w-lg object-contain"
            />
          </div>

        </div>
      </div>
    </section>
  );
});

// ─── STATS + REVIEW SECTION ────────────────────────────────────────────────
function StatsAndReviewSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // review form state
  const [patientName, setPatientName] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(null);

  // featured reviews strip
  const [featured, setFeatured] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    publicAPI.getStats()
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    publicAPI.getFeaturedReviews()
      .then(res => setFeatured(res.data.data || []))
      .catch(() => setFeatured([]))
      .finally(() => setReviewsLoading(false));
  }, []);

  const doctorCount = stats?.doctors != null ? `${stats.doctors}+` : '25+';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }
    if (comment.trim().length < 10) {
      toast.error('Please write at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await reviewsAPI.create({ rating, comment: comment.trim(), patientName: patientName.trim() || undefined });
      setSubmittedReview(res.data.data);
      setRating(0);
      setComment('');
      setPatientName('');
      toast.success('Review submitted for moderation!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-primary-600 border-y border-primary-700 relative z-20">
      <div className="container-custom py-12">
        {/* ── Top row: Expert Doctors card + Write a Review card ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Expert Doctors — clickable card */}
          <Link
            to="/doctors"
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 flex items-center gap-6 hover:bg-white/15 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary-500/30 flex items-center justify-center shrink-0 group-hover:bg-primary-400/40 transition-colors">
              <Stethoscope size={30} className="text-white" />
            </div>
            <div>
              <p className="text-4xl font-display font-black text-white mb-1">
                {loading ? (
                  <span className="inline-block w-16 h-9 bg-primary-500/40 rounded animate-pulse" />
                ) : doctorCount}
              </p>
              <p className="text-primary-100 font-semibold text-sm tracking-wide uppercase">Expert Doctors</p>
              <p className="text-primary-200/70 text-xs mt-1 flex items-center gap-1 group-hover:gap-2 transition-all">
                Meet our specialists <ArrowRight size={13} />
              </p>
            </div>
          </Link>

          {/* Write a Review card */}
          <div className="bg-white rounded-3xl p-8 shadow-xl">
            {submittedReview ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-heading font-bold text-neutral-900 mb-2">Thank you for your review!</h3>
                <p className="text-neutral-500 text-sm mb-4">Your review has been submitted and is pending moderation.</p>
                <div className="bg-neutral-50 rounded-2xl p-4 text-left">
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className={i < submittedReview.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-neutral-200 text-neutral-200'} />
                    ))}
                  </div>
                  <p className="text-neutral-600 text-sm italic">"{submittedReview.comment}"</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-2 mb-4">
                  <PenLine size={18} className="text-primary-600" />
                  <h3 className="text-lg font-heading font-bold text-neutral-900">Share Your Experience</h3>
                </div>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition mb-3"
                />
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={26}
                        className={n <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-neutral-200 text-neutral-200'}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your experience with VerdantCare…"
                  rows={3}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition resize-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-4 w-full btn-primary btn-lg disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Full-width reviews strip ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-heading font-bold text-lg">Patient Reviews</h3>
            <Link to="/reviews" className="text-primary-200 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
              See All Reviews <ArrowRight size={14} />
            </Link>
          </div>

          {reviewsLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map(i => (
                <div key={i} className="min-w-[300px] bg-white/5 border border-white/10 rounded-2xl p-5 animate-pulse space-y-3">
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : featured.length === 0 ? (
            <p className="text-primary-200/70 text-sm py-6 text-center bg-white/5 rounded-2xl border border-white/10">
              No reviews yet — be the first to share your experience!
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {featured.map(review => {
                const patientName = review.patientName || `${review.patient?.firstName || 'Patient'} ${review.patient?.lastName || ''}`.trim() || 'Anonymous';
                const doctorName = review.doctor?.user ? `Dr. ${review.doctor.user.firstName} ${review.doctor.user.lastName}` : 'Our Team';
                const firstInitial = patientName.charAt(0).toUpperCase();
                const secondInitial = patientName.split(/\s+/)[1]?.charAt(0)?.toUpperCase() || '';
                const initials = `${firstInitial}${secondInitial}`.toUpperCase();
                const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                return (
                  <div key={review.id} className="min-w-[300px] bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-primary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{patientName}</p>
                        <p className="text-primary-200/70 text-xs truncate">{doctorName} · {date}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} size={12} className={j < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-white/10 text-white/10'} />
                      ))}
                    </div>
                    <p className="text-primary-100/80 text-xs leading-relaxed line-clamp-3">"{review.comment}"</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── SERVICES ────────────────────────────────────────────────────────────────
const ServicesSection = memo(function ServicesSection() {
  const services = [
    { title: 'Family Medicine',   desc: 'Comprehensive care for all ages.',      icon: Users,     color: 'text-blue-600',    bg: 'bg-blue-50' },
    { title: 'Telemedicine',      desc: 'Secure video consultations.',            icon: Video,     color: 'text-purple-600',  bg: 'bg-purple-50' },
    { title: 'Pediatrics',        desc: 'Expert care for your little ones.',      icon: Heart,     color: 'text-rose-600',    bg: 'bg-rose-50' },
    { title: "Women's Health",    desc: 'Specialized care for women.',            icon: UserCheck, color: 'text-pink-600',    bg: 'bg-pink-50' },
    { title: 'Urgent Care',       desc: 'Walk-in care for non-emergencies.',      icon: Clock,     color: 'text-orange-600',  bg: 'bg-orange-50' },
    { title: 'Wellness Programs', desc: 'Nutrition and fitness plans.',           icon: Award,     color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <section className="section-padding bg-neutral-50 relative">
      <div className="container-custom">
        <div className="section-header">
          <p className="eyebrow">What We Offer</p>
          <h2>Comprehensive Healthcare Services</h2>
          <p>From preventive care to specialized treatments, our state-of-the-art facility provides a complete range of medical services tailored to your needs.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <div key={i} className="card-border group hover:bg-white relative overflow-hidden">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${service.bg} ${service.color} group-hover:bg-primary-600 group-hover:text-white`}>
                <service.icon size={28} />
              </div>
              <h3 className="text-xl font-heading font-bold text-neutral-900 mb-3 group-hover:text-primary-700 transition-colors">{service.title}</h3>
              <p className="text-neutral-600 mb-6 line-clamp-2">{service.desc}</p>
              <Link to="/services" className="inline-flex items-center text-sm font-bold text-primary-600 group-hover:text-primary-700">
                Learn more <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
const HowItWorksSection = memo(function HowItWorksSection() {
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="section-header">
          <p className="eyebrow">Simple Process</p>
          <h2>Get Care in 3 Simple Steps</h2>
          <p>We've streamlined our process so you can focus on what matters most — your health and recovery.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12 relative mt-16">
          <div className="hidden md:block absolute top-8 left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-neutral-200" />
          {[
            { num: '1', title: 'Create Account',   desc: 'Sign up securely in less than 2 minutes to access the patient portal.',        icon: Shield },
            { num: '2', title: 'Book Appointment', desc: 'Choose your preferred doctor, date, and time that works for you.',              icon: Calendar },
            { num: '3', title: 'Get Treated',      desc: 'Visit us in person or consult online from the comfort of your home.',          icon: Stethoscope },
          ].map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-primary-100 flex items-center justify-center relative z-10 mb-6 shadow-sm group-hover:border-primary-500 group-hover:shadow-emerald transition-all duration-300">
                <span className="text-2xl font-display font-bold text-primary-600">{step.num}</span>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <step.icon size={14} />
                </div>
              </div>
              <h3 className="text-xl font-heading font-bold text-neutral-900 mb-3">{step.title}</h3>
              <p className="text-neutral-600 px-4">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

// ─── LIVE TESTIMONIALS ────────────────────────────────────────────────────────
function TestimonialsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  const fallbackReviews = [
    { id: 'f1', comment: 'Dr. Mitchell was incredibly thorough and took the time to explain everything clearly. The care I received was world-class.', rating: 5, patient: { firstName: 'Jane', lastName: 'D.' }, doctor: { specialty: 'General Medicine', user: { firstName: 'Sarah', lastName: 'Mitchell' } } },
    { id: 'f2', comment: 'Booking was seamless, the doctor was on time, and the diagnosis was accurate. I felt truly cared for throughout.', rating: 5, patient: { firstName: 'Michael', lastName: 'R.' }, doctor: { specialty: 'Cardiology', user: { firstName: 'James', lastName: 'Wilson' } } },
    { id: 'f3', comment: 'The telehealth feature is a game-changer! I consulted from home and received the same quality of care as an in-person visit.', rating: 5, patient: { firstName: 'Emily', lastName: 'C.' }, doctor: { specialty: 'Telemedicine', user: { firstName: 'Priya', lastName: 'Sharma' } } },
  ];

  useEffect(() => {
    publicAPI.getFeaturedReviews()
      .then(res => {
        if (res.data.data?.length > 0) {
          setReviews(res.data.data);
          setHasData(true);
        } else {
          setReviews(fallbackReviews);
        }
      })
      .catch(() => setReviews(fallbackReviews))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="section-padding bg-gradient-to-br from-primary-900 via-primary-950 to-neutral-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 25% 25%, #10b981 0%, transparent 50%), radial-gradient(circle at 75% 75%, #059669 0%, transparent 50%)` }} />

      <div className="container-custom relative z-10">
        <div className="section-header">
          <p className="eyebrow text-emerald-400">Patient Stories</p>
          <h2 className="text-white">What Our Patients Say</h2>
          <p className="text-primary-200/70">Real feedback from real patients — unfiltered, authentic experiences.</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-3xl p-6 bg-white/5 border border-white/10 animate-pulse space-y-4">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map(review => {
              const patientName = review.patientName || `${review.patient?.firstName || 'Patient'} ${review.patient?.lastName || ''}`.trim() || 'Anonymous';
              const doctorName  = review.doctor?.user ? `Dr. ${review.doctor.user.firstName} ${review.doctor.user.lastName}` : 'Our Team';
              const specialty   = review.doctor?.specialty || 'Healthcare';
              const firstInitial = patientName.charAt(0).toUpperCase();
              const secondInitial = patientName.split(/\s+/)[1]?.charAt(0)?.toUpperCase() || '';
              const initials    = `${firstInitial}${secondInitial}`.toUpperCase();

              return (
                <div key={review.id} className="group relative rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-5">
                    <Quote size={18} className="text-emerald-400" />
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={14} className={j < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-white/10 text-white/10'} />
                    ))}
                  </div>
                  <p className="text-white/80 leading-relaxed mb-6 text-sm italic line-clamp-4">"{review.comment}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{patientName}</p>
                      <p className="text-primary-300/70 text-xs">{specialty} • {doctorName}</p>
                    </div>
                    {!hasData && <span className="ml-auto text-[10px] text-white/20 font-medium uppercase tracking-wider">Sample</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-10">
          <Link to="/reviews" className="btn-outline-white btn-lg">
            View All Reviews <ArrowRight size={16} className="ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
const CTASection = memo(function CTASection() {
  const [phone, setPhone] = useState('');

  useEffect(() => {
    import('../../api/generalAPI').then(({ settingsAPI }) => {
      settingsAPI.getPublic()
        .then(res => setPhone(res.data.data?.phone || ''))
        .catch(() => {});
    });
  }, []);

  const telNumber = phone.replace(/[\s\-\(\)\+]/g, '');

  return (
    <section className="relative py-24 bg-forest-gradient overflow-hidden">
      <div className="absolute inset-0 bg-dark-mesh opacity-30"></div>
      <div className="container-custom relative z-10 text-center">
        <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
          Ready to Take Control of Your Health?
        </h2>
        <p className="text-primary-100/80 text-lg mb-10 max-w-2xl mx-auto">
          Schedule your appointment today and experience healthcare that puts you first. Join thousands of satisfied patients.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/dashboard/appointments" className="btn-primary-dark btn-xl border border-white/10">
            Book Appointment
          </Link>
          {telNumber ? (
            <a href={`tel:${telNumber}`} className="btn-outline-white btn-xl bg-white/5 backdrop-blur-sm">
              Call Us Now
            </a>
          ) : (
            <Link to="/contact" className="btn-outline-white btn-xl bg-white/5 backdrop-blur-sm">
              Contact Us
            </Link>
          )}
        </div>
        <p className="mt-8 text-sm text-primary-200/60 font-medium tracking-wide uppercase">
          No credit card required • Secure patient portal • 24/7 Support
        </p>
      </div>
    </section>
  );
});

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <StatsAndReviewSection />
      <ServicesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
    </main>
  );
}
