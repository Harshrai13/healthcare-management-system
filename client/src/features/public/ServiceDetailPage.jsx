import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Stethoscope, Users, AlertCircle } from 'lucide-react';
import { servicesAPI, doctorsAPI } from '../../api/doctorsAPI';

function ServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    servicesAPI
      .getBySlug(slug)
      .then((res) => {
        const svc = res.data.data;
        setService(svc);
        // fetch related doctors by specialty (use service name as search)
        return doctorsAPI.getAll({ search: svc.name, limit: 6 });
      })
      .then((res) => {
        setDoctors(res.data.data?.doctors || []);
      })
      .catch(() => {
        setService(null);
      })
      .finally(() => {
        setLoading(false);
        setDoctorsLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <section className="section-padding">
        <div className="container-custom">
          <div className="animate-pulse space-y-6 max-w-3xl">
            <div className="h-8 bg-neutral-100 rounded w-1/2" />
            <div className="h-4 bg-neutral-100 rounded w-full" />
            <div className="h-4 bg-neutral-100 rounded w-3/4" />
            <div className="h-4 bg-neutral-100 rounded w-2/3" />
          </div>
        </div>
      </section>
    );
  }

  if (!service) {
    return (
      <section className="section-padding">
        <div className="container-custom text-center py-20">
          <AlertCircle size={48} className="mx-auto text-neutral-300 mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Service Not Found</h1>
          <p className="text-neutral-500 mb-6">The service you're looking for doesn't exist or has been removed.</p>
          <Link to="/services" className="btn-primary btn-lg inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Services
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb */}
        <Link to="/services" className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium mb-6">
          <ArrowLeft size={16} className="mr-1" /> All Services
        </Link>

        {/* Service header */}
        <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-3xl p-8 md:p-12 mb-12">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center shrink-0">
              <Stethoscope size={30} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-3">{service.name}</h1>
              <p className="text-neutral-600 leading-relaxed">{service.description}</p>
            </div>
          </div>
          <div className="mt-8">
            <Link to="/appointments/book" className="btn-primary btn-lg inline-flex items-center gap-2">
              <Calendar size={18} /> Book Appointment
            </Link>
          </div>
        </div>

        {/* Related doctors */}
        <div className="mb-8">
          <h2 className="text-2xl font-heading font-bold text-neutral-900 mb-2">Specialists in {service.name}</h2>
          <p className="text-neutral-500 text-sm mb-6">Our experienced doctors specialized in this field are here to help.</p>
        </div>

        {doctorsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-6 animate-pulse space-y-3">
                <div className="w-12 h-12 bg-neutral-100 rounded-full" />
                <div className="h-4 bg-neutral-100 rounded w-2/3" />
                <div className="h-3 bg-neutral-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-neutral-50 rounded-2xl p-10 text-center">
            <Users size={36} className="mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-500 font-medium">No specialists listed yet</p>
            <p className="text-neutral-400 text-sm mt-1">Please check back soon or contact us for availability.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => {
              const name = `Dr. ${doctor.user?.firstName || ''} ${doctor.user?.lastName || ''}`.trim();
              return (
                <div key={doctor._id} className="bg-white rounded-2xl border border-neutral-100 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center text-white font-bold shrink-0">
                      {(doctor.user?.firstName || 'D')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-neutral-900 truncate">{name}</p>
                      <p className="text-sm text-primary-600 truncate">{doctor.specialty}</p>
                    </div>
                  </div>
                  {doctor.bio && <p className="text-neutral-600 text-sm line-clamp-2 mb-4">{doctor.bio}</p>}
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{doctor.experienceYears || 0} yrs experience</span>
                    {doctor.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span> {doctor.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/doctors/${doctor._id}`}
                    className="mt-4 inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700"
                  >
                    View Profile <ArrowRight size={14} className="ml-1" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-primary-600 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-3">Need Help Choosing?</h2>
          <p className="text-primary-100/80 mb-6 max-w-xl mx-auto">
            Our team can help you find the right specialist for your needs. Book an appointment today.
          </p>
          <Link to="/appointments/book" className="btn-primary-dark btn-xl border border-white/10">
            Book Appointment
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ServiceDetailPage;
