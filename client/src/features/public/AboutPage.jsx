import { Link } from 'react-router-dom';
import { Target, Heart, Lightbulb, Shield, Trophy, ChevronRight, Linkedin } from 'lucide-react';
import { memo } from 'react';

const ValuesSection = memo(function ValuesSection() {
  const values = [
    { title: 'Excellence', desc: 'We deliver the highest standard of medical care through continuous learning and state-of-the-art technology.', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Compassion', desc: 'Every patient is treated with the utmost empathy, respect, and personalized attention.', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Innovation', desc: 'We embrace modern medical advancements, including AI diagnostics and telehealth, to improve patient outcomes.', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Integrity', desc: 'Transparency, honesty, and ethical medical practices form the foundation of our institution.', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <section className="section-padding bg-neutral-50">
      <div className="container-custom">
        <div className="section-header">
          <p className="eyebrow">Our Core Values</p>
          <h2>What Drives Us Forward</h2>
          <p>These four pillars guide every decision we make and every interaction we have with our patients.</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, i) => (
            <div key={i} className="card-border group hover:bg-white text-center flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform duration-300 group-hover:-translate-y-2 ${value.bg} ${value.color}`}>
                <value.icon size={32} />
              </div>
              <h3 className="text-xl font-heading font-bold text-neutral-900 mb-3">{value.title}</h3>
              <p className="text-neutral-600 leading-relaxed text-sm">{value.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

const LeadershipSection = memo(function LeadershipSection() {
  const team = [
    { name: 'Dr. Michael Chen', role: 'Chief Medical Officer', bio: 'Over 20 years of experience in internal medicine and healthcare administration.', initials: 'MC' },
    { name: 'Sarah Jenkins', role: 'Chief Executive Officer', bio: 'Former hospital administrator dedicated to patient-centric healthcare reform.', initials: 'SJ' },
    { name: 'Dr. Emily Carter', role: 'Head of Surgery', bio: 'Pioneer in minimally invasive surgical techniques with global recognition.', initials: 'EC' },
    { name: 'David Torres', role: 'Chief Technology Officer', bio: 'Leading VerdantCare’s digital transformation and telehealth platforms.', initials: 'DT' },
  ];

  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <div className="section-header">
          <p className="eyebrow">Leadership</p>
          <h2>Meet Our Executive Team</h2>
          <p>The visionaries who guide our mission to redefine premium healthcare.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, i) => (
            <div key={i} className="group">
              <div className="relative mb-6 overflow-hidden rounded-2xl bg-primary-50 aspect-[3/4] flex items-center justify-center border border-primary-100 group-hover:border-primary-300 transition-colors">
                <span className="text-5xl font-display font-bold text-primary-300 group-hover:text-primary-500 transition-colors">{member.initials}</span>
                <div className="absolute inset-0 bg-gradient-to-t from-primary-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-primary-600 transition-colors">
                    <Linkedin size={20} />
                  </a>
                </div>
              </div>
              <h3 className="text-xl font-heading font-bold text-neutral-900 mb-1">{member.name}</h3>
              <p className="text-primary-600 font-medium text-sm mb-3">{member.role}</p>
              <p className="text-neutral-600 text-sm leading-relaxed">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

const JourneySection = memo(function JourneySection() {
  const milestones = [
    { year: '2010', title: 'Foundation', desc: 'VerdantCare opens its doors as a small neighborhood clinic.' },
    { year: '2013', title: 'Specialty Wing', desc: 'Expanded to include cardiology and pediatric specialized wings.' },
    { year: '2016', title: 'Telehealth Launch', desc: 'Pioneered early virtual consultations for remote patients.' },
    { year: '2020', title: 'Digital Transformation', desc: 'Complete overhaul to a unified digital health record system.' },
    { year: '2024', title: 'AI Diagnostics', desc: 'Integrated AI tools to assist doctors in faster, more accurate diagnoses.' },
  ];

  return (
    <section className="section-padding bg-forest-gradient text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-dark-mesh opacity-30"></div>
      
      <div className="container-custom relative z-10">
        <div className="section-header text-center">
          <p className="eyebrow text-primary-300">Our Journey</p>
          <h2 className="text-white">A Decade of Excellence</h2>
        </div>

        <div className="max-w-4xl mx-auto mt-16 relative">
          {/* Vertical Line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-white/20 transform md:-translate-x-1/2"></div>
          
          <div className="space-y-12">
            {milestones.map((item, i) => (
              <div key={i} className={`relative flex items-center ${i % 2 === 0 ? 'md:flex-row-reverse' : ''} group`}>
                
                {/* Timeline Dot */}
                <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-primary-500 border-4 border-primary-900 transform -translate-x-1/2 group-hover:scale-150 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10"></div>
                
                {/* Content */}
                <div className={`ml-20 md:ml-0 md:w-1/2 ${i % 2 === 0 ? 'md:pl-16' : 'md:pr-16 md:text-right'}`}>
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:border-primary-400/50 transition-colors">
                    <span className="inline-block px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm font-bold mb-3">
                      {item.year}
                    </span>
                    <h3 className="text-xl font-heading font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-primary-100/80 text-sm">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

function AboutPage() {
  return (
    <main className="pt-20">
      {/* Hero Section */}
      <section className="bg-emerald-gradient py-20 lg:py-28 text-center px-4 relative">
        <div className="container-custom relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-6">
            About VerdantCare
          </h1>
          <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto font-medium">
            Redefining the healthcare experience with a perfect blend of compassion and cutting-edge technology.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="eyebrow">Our Mission</p>
              <h2 className="heading-section mb-6">To provide accessible, premium healthcare that empowers patients to live their healthiest lives.</h2>
              <p className="text-neutral-600 leading-relaxed mb-6 text-lg">
                We started VerdantCare with a simple belief: visiting the doctor shouldn't be stressful. It should be a collaborative, comfortable, and efficient experience. 
              </p>
              <p className="text-neutral-600 leading-relaxed text-lg">
                By integrating state-of-the-art facilities with our proprietary digital patient portal, we ensure that your health information is always securely at your fingertips, and our world-class physicians are just a click away.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { number: '10K+', label: 'Happy Patients' },
                { number: '25+', label: 'Specialist Doctors' },
                { number: '15+', label: 'Years Experience' },
                { number: '13+', label: 'Medical Specialties' },
              ].map((stat, i) => (
                <div key={i} className="bg-primary-50 p-8 rounded-2xl border border-primary-100 text-center hover:-translate-y-1 transition-transform">
                  <p className="text-4xl font-display font-black text-primary-600 mb-2">{stat.number}</p>
                  <p className="text-primary-800 font-semibold text-sm uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ValuesSection />
      <JourneySection />
      <LeadershipSection />

      {/* Final CTA */}
      <section className="py-20 bg-primary-50 text-center px-4 border-t border-primary-100">
        <div className="container-custom">
          <h2 className="text-3xl font-display font-bold text-neutral-900 mb-6">Join Our Healthcare Family</h2>
          <p className="text-neutral-600 max-w-xl mx-auto mb-8 text-lg">
            Experience the difference of a medical center that truly cares about your holistic well-being.
          </p>
          <Link to="/register" className="btn-primary btn-xl">
            Create Your Patient Account
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
