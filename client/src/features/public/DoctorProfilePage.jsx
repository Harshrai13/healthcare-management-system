import { useParams, Link } from 'react-router-dom';
import { useDoctor, useDoctorSchedule } from '../../hooks/useDoctors';
import { reviewsAPI } from '../../api/generalAPI';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, Star, Award, GraduationCap, Globe, Video, Calendar,
  ChevronRight, User, Mail, Building,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function DoctorProfilePage() {
  const { id } = useParams();
  const { data: doctor, isLoading } = useDoctor(id);
  const { data: scheduleData } = useDoctorSchedule(id);

  const { data: reviews = [] } = useQuery({
    queryKey: ['doctorReviews', id],
    queryFn: async () => {
      try {
        const { data } = await reviewsAPI.getDoctorReviews(id, { limit: 5 });
        return data.data?.reviews || [];
      } catch { return []; }
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!doctor) {
    return (
      <section className="pt-24 min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">Doctor Not Found</h2>
          <p className="text-neutral-500 mb-6">The doctor you're looking for doesn't exist or has been removed.</p>
          <Link to="/doctors" className="btn-primary inline-flex items-center gap-2">
            Back to Doctors
          </Link>
        </div>
      </section>
    );
  }

  const { userId: profile } = doctor;
  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Doctor';
  const initials = `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`.toUpperCase();
  const modes = doctor.consultationModes || [];

  return (
    <main className="pt-20 bg-neutral-50 min-h-screen pb-16">
      {/* Hero Section */}
      <section className="bg-forest-gradient py-12 px-4">
        <div className="container-custom">
          <nav className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-primary-200">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li>/</li>
              <li><Link to="/doctors" className="hover:text-white transition-colors">Doctors</Link></li>
              <li>/</li>
              <li className="text-white font-medium truncate max-w-[200px]">{fullName}</li>
            </ol>
          </nav>

          <div className="flex flex-col md:flex-row items-start gap-8">
            {/* Avatar */}
            <div className="shrink-0">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={fullName} className="w-32 h-32 rounded-2xl object-cover border-4 border-white/20 shadow-lg" />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-primary-600 border-4 border-white/20 shadow-lg flex items-center justify-center">
                  <span className="text-white font-display font-bold text-4xl">{initials}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-white">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold">{fullName}</h1>
                {doctor.isAvailable && (
                  <span className="bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">Available</span>
                )}
              </div>
              <p className="text-primary-200 text-lg mb-4">{doctor.specialty}</p>

              <div className="flex flex-wrap gap-4 text-sm text-primary-100 mb-6">
                {doctor.experienceYears && (
                  <span className="flex items-center gap-1.5"><Award size={16} /> {doctor.experienceYears}+ years experience</span>
                )}
                {doctor.rating && (
                  <span className="flex items-center gap-1.5"><Star size={16} className="fill-amber-400 text-amber-400" /> {doctor.rating.toFixed(1)} ({doctor.reviewCount || 0} reviews)</span>
                )}
                {doctor.education && (
                  <span className="flex items-center gap-1.5"><GraduationCap size={16} /> {doctor.education}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/appointments/book?doctorId=${doctor._id}`}
                  className="bg-white text-primary-800 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors inline-flex items-center gap-2 shadow-lg"
                >
                  <Calendar size={18} /> Book Appointment
                </Link>
                {modes.includes('VIDEO') && (
                  <span className="bg-purple-500/20 text-purple-200 border border-purple-500/30 font-medium px-4 py-3 rounded-xl inline-flex items-center gap-2">
                    <Video size={18} /> Video Consultation
                  </span>
                )}
                {modes.includes('IN_PERSON') && (
                  <span className="bg-blue-500/20 text-blue-200 border border-blue-500/30 font-medium px-4 py-3 rounded-xl inline-flex items-center gap-2">
                    <Building size={18} /> In-Person
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <section className="container-custom -mt-6">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {doctor.bio && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-neutral-100">
                <h2 className="text-xl font-display font-bold text-neutral-900 mb-4">About</h2>
                <p className="text-neutral-600 leading-relaxed whitespace-pre-line">{doctor.bio}</p>
              </div>
            )}

            {/* Schedule */}
            {scheduleData?.schedules?.length > 0 && (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-neutral-100">
                <h2 className="text-xl font-display font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-primary-600" /> Available Schedule
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {scheduleData.schedules.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                        <Calendar size={18} className="text-primary-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">{DAYS[s.dayOfWeek] || s.dayOfWeek}</p>
                        <p className="text-neutral-500 text-xs">{s.startTime} - {s.endTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-neutral-900">
                  Patient Reviews {reviews.length > 0 && <span className="text-neutral-400 text-base font-normal">({reviews.length})</span>}
                </h2>
                <Link to={`/reviews?doctor=${id}`} className="text-primary-600 font-medium text-sm hover:text-primary-700 inline-flex items-center gap-1">
                  View all <ChevronRight size={16} />
                </Link>
              </div>

              {reviews.length === 0 ? (
                <p className="text-neutral-500 text-center py-8">No reviews yet for this doctor.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review._id} className="border border-neutral-100 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-bold text-sm">{review.userId?.firstName?.[0] || 'U'}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 text-sm">{review.userId?.firstName || 'Patient'}</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} size={12} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-xs text-neutral-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      {review.comment && <p className="text-neutral-600 text-sm">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
              <h3 className="font-display font-bold text-neutral-900 mb-4">Quick Info</h3>
              <ul className="space-y-3">
                {profile?.email && (
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <Mail size={16} className="text-neutral-400 shrink-0" /> {profile.email}
                  </li>
                )}
                {doctor.gender && (
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <User size={16} className="text-neutral-400 shrink-0" /> {doctor.gender === 'Male' ? 'Male' : 'Female'}
                  </li>
                )}
                {doctor.languages?.length > 0 && (
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <Globe size={16} className="text-neutral-400 shrink-0" /> {doctor.languages.join(', ')}
                  </li>
                )}
                {doctor.education && (
                  <li className="flex items-center gap-3 text-sm text-neutral-600">
                    <GraduationCap size={16} className="text-neutral-400 shrink-0" /> {doctor.education}
                  </li>
                )}
              </ul>
            </div>

            {/* Certifications */}
            {doctor.certifications?.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
                <h3 className="font-display font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Award size={18} className="text-primary-600" /> Certifications
                </h3>
                <ul className="space-y-2">
                  {doctor.certifications.map((cert, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                      {typeof cert === 'string' ? cert : cert.name || cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="bg-primary-700 rounded-2xl p-6 text-white text-center">
              <h3 className="font-display font-bold text-lg mb-2">Ready to Book?</h3>
              <p className="text-primary-200 text-sm mb-4">Schedule an appointment with {fullName.split(' ')[0]} today.</p>
              <Link
                to={`/appointments/book?doctorId=${doctor._id}`}
                className="bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors inline-flex items-center gap-2 w-full justify-center"
              >
                <Calendar size={18} /> Book Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default DoctorProfilePage;
