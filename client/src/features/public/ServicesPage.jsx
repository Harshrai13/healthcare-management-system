import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const servicesList = [
  { name: 'Family Medicine', slug: 'family-medicine', desc: 'Comprehensive healthcare for patients of all ages, from routine checkups to chronic disease management.' },
  { name: 'Internal Medicine', slug: 'internal-medicine', desc: 'Specialized adult healthcare focusing on prevention, diagnosis, and treatment of complex conditions.' },
  { name: "Women's Health", slug: 'womens-health', desc: 'Complete gynecological and obstetric care including prenatal, reproductive health, and wellness services.' },
  { name: "Men's Health", slug: 'mens-health', desc: "Comprehensive men's healthcare including preventive screenings, hormonal health, and urological care." },
  { name: 'Pediatrics', slug: 'pediatrics', desc: 'Expert care for infants, children, and adolescents including vaccinations and developmental assessments.' },
  { name: 'Senior Care', slug: 'senior-care', desc: 'Specialized geriatric care focusing on age-related conditions, mobility, and quality of life.' },
  { name: 'Preventive Care', slug: 'preventive-care', desc: 'Proactive health screenings, immunizations, and wellness programs to prevent illness.' },
  { name: 'Chronic Disease Management', slug: 'chronic-disease-management', desc: 'Ongoing care for diabetes, hypertension, heart disease, and other chronic conditions.' },
  { name: 'Vaccinations', slug: 'vaccinations', desc: 'Complete immunization services for children and adults including flu shots and travel vaccines.' },
  { name: 'Diagnostics', slug: 'diagnostics', desc: 'Advanced diagnostic testing including lab work, imaging, and health assessments.' },
  { name: 'Telemedicine', slug: 'telemedicine', desc: 'Secure video consultations with our physicians from the comfort of your home.' },
  { name: 'Wellness Programs', slug: 'wellness-programs', desc: 'Personalized nutrition, fitness, and mental health programs for optimal wellbeing.' },
  { name: 'Urgent Care', slug: 'urgent-care', desc: 'Walk-in care for non-life-threatening conditions requiring prompt medical attention.' },
];

function ServicesPage() {
  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="text-center mb-16">
          <span className="text-primary-700 font-medium">What We Offer</span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-neutral-900 mt-2">Our Medical Services</h1>
          <p className="text-neutral-600 mt-4 max-w-2xl mx-auto">
            We provide a comprehensive range of healthcare services to meet all your medical needs.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicesList.map((service) => (
            <div key={service.slug} className="card group hover:scale-[1.02] transition-all">
              <h3 className="text-xl font-heading font-semibold text-neutral-900 mb-3 group-hover:text-primary-700 transition-colors">
                {service.name}
              </h3>
              <p className="text-neutral-600 mb-4">{service.desc}</p>
              <Link to={`/services/${service.slug}`} className="inline-flex items-center text-primary-700 font-medium hover:underline">
                Learn more <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServicesPage;
